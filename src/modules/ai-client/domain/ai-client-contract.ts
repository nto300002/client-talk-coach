import { z } from "zod";

export const aiClientTurnSchema = z.object({
  id: z.string().min(1),
  speaker: z.enum(["user", "client"]),
  text: z.string().min(1),
});

export const aiClientResponseSchema = z.object({
  text: z.string().min(1).max(1_500),
  disclosedFactIds: z.array(z.string()).max(3),
});

export type AiClientTurn = z.infer<typeof aiClientTurnSchema>;
export type AiClientResponse = z.infer<typeof aiClientResponseSchema>;

export type AiClientContext = {
  clientName: string;
  clientType: {
    displayName: string;
    interactionStyle: string;
    cooperationLevel: number;
    itKnowledgeLevel: number;
  };
  difficulty: { ambiguityLevel: number; pressureLevel: number };
  userText: string;
  recentTurns: AiClientTurn[];
  disclosedFacts: Array<{ id: string; content: string }>;
  eligibleFacts: Array<{ id: string; content: string }>;
  prohibitedFactIds: string[];
};

export class AiClientResponseValidationError extends Error {
  constructor(message: string) { super(message); this.name = "AiClientResponseValidationError"; }
}

export function validateAiClientResponse(input: unknown, eligibleFactIds: string[]): AiClientResponse {
  const response = aiClientResponseSchema.parse(input);
  const sentenceCount = response.text.split(/[。！？!?]+/).filter(Boolean).length;
  const questionCount = (response.text.match(/[？?]/g) ?? []).length;
  if (sentenceCount < 1 || sentenceCount > 3) throw new AiClientResponseValidationError("AI response must have one to three sentences.");
  if (questionCount > 1) throw new AiClientResponseValidationError("AI response may ask only one question.");
  if (/(ばか|無能|役立たず|差別)/.test(response.text)) throw new AiClientResponseValidationError("AI response contains prohibited behavior.");
  if (response.disclosedFactIds.some((id) => !eligibleFactIds.includes(id))) {
    throw new AiClientResponseValidationError("AI response disclosed an ineligible fact.");
  }
  return response;
}
