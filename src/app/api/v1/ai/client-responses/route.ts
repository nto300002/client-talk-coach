import { NextResponse } from "next/server";

import { MockAiClientAdapter } from "@/modules/ai-client/infrastructure/mock-ai-client-adapter";
import { validateAiClientResponse, type AiClientContext } from "@/modules/ai-client/domain/ai-client-contract";
import { parseRuntimeEnvironment } from "@/infrastructure/config/runtime-environment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eligibleFacts = Array.isArray(body?.scenarioContext?.eligibleFacts) ? body.scenarioContext.eligibleFacts : [];
    const context = {
      clientName: String(body?.clientType?.displayName ?? "AI顧客"),
      clientType: body?.clientType ?? {
        displayName: "AI顧客",
        interactionStyle: "落ち着いて必要な情報を伝える。",
        cooperationLevel: 3,
        itKnowledgeLevel: 2,
      },
      difficulty: body?.difficulty ?? { ambiguityLevel: 1, pressureLevel: 0 },
      userText: String(body?.latestUserUtterance?.text ?? ""),
      recentTurns: Array.isArray(body?.recentTurns) ? body.recentTurns.slice(-6) : [],
      disclosedFacts: Array.isArray(body?.scenarioContext?.disclosedFacts) ? body.scenarioContext.disclosedFacts : [],
      eligibleFacts,
      prohibitedFactIds: Array.isArray(body?.scenarioContext?.prohibitedFactIds) ? body.scenarioContext.prohibitedFactIds : [],
    };
    const config = parseRuntimeEnvironment(process.env);
    const response = config.mode === "mock"
      ? await new MockAiClientAdapter().respond(context)
      : await generateGeminiResponse(config.geminiApiKey, context, eligibleFacts.map((fact: { id: string }) => fact.id));
    validateAiClientResponse(response, eligibleFacts.map((fact: { id: string }) => fact.id));
    return NextResponse.json({ data: response });
  } catch {
    return NextResponse.json({ error: { code: "AI_CLIENT_UNAVAILABLE", message: "AI顧客の応答を取得できませんでした。" } }, { status: 503 });
  }
}

async function generateGeminiResponse(apiKey: string, context: AiClientContext, eligibleIds: string[]) {
  const instruction = `You are a Japanese software-development client named ${context.clientName}. Client profile: ${JSON.stringify(context.clientType)}. Difficulty: ${JSON.stringify(context.difficulty)}. Recent conversation: ${JSON.stringify(context.recentTurns)}. Already disclosed facts: ${JSON.stringify(context.disclosedFacts)}. Reply in one to three short Japanese sentences, with at most one question. Do not invent facts. Only disclose eligible facts: ${JSON.stringify(context.eligibleFacts)}. Return JSON only: {"text":"...","disclosedFactIds":[...]}. Latest user utterance: ${context.userText}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { responseMimeType: "application/json", maxOutputTokens: 250, temperature: 0.4 } }) });
  if (!response.ok) throw new Error("Gemini unavailable");
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = text ? JSON.parse(text) as { text: string; disclosedFactIds: string[] } : null;
  if (!parsed || parsed.disclosedFactIds.some((id) => !eligibleIds.includes(id))) throw new Error("Invalid Gemini response");
  return parsed;
}
