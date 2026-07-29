import { NextResponse } from "next/server";

import { MockAiClientAdapter } from "@/modules/ai-client/infrastructure/mock-ai-client-adapter";
import { validateAiClientResponse } from "@/modules/ai-client/domain/ai-client-contract";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eligibleFacts = Array.isArray(body?.scenarioContext?.eligibleFacts) ? body.scenarioContext.eligibleFacts : [];
    const context = {
      clientName: String(body?.clientType?.displayName ?? "AI顧客"),
      clientType: body?.clientType ?? { displayName: "AI顧客", cooperationLevel: 3, itKnowledgeLevel: 2 },
      difficulty: body?.difficulty ?? { ambiguityLevel: 1, pressureLevel: 0 },
      userText: String(body?.latestUserUtterance?.text ?? ""),
      recentTurns: Array.isArray(body?.recentTurns) ? body.recentTurns.slice(-6) : [],
      disclosedFacts: Array.isArray(body?.scenarioContext?.disclosedFacts) ? body.scenarioContext.disclosedFacts : [],
      eligibleFacts,
      prohibitedFactIds: Array.isArray(body?.scenarioContext?.prohibitedFactIds) ? body.scenarioContext.prohibitedFactIds : [],
    };
    const response = validateAiClientResponse(await new MockAiClientAdapter().respond(context), eligibleFacts.map((fact: { id: string }) => fact.id));
    return NextResponse.json({ data: response });
  } catch {
    return NextResponse.json({ error: { code: "AI_CLIENT_UNAVAILABLE", message: "AI顧客の応答を取得できませんでした。" } }, { status: 503 });
  }
}
