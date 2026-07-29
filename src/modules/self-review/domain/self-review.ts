import { z } from "zod";

const scoreSchema = z.number().int().min(0).max(10);

export const selfReviewInputSchema = z.object({
  sessionId: z.string().min(1),
  tensionBefore: scoreSchema,
  confidenceBefore: scoreSchema,
  tensionAfter: scoreSchema,
  confidenceAfter: scoreSchema,
  completedConversation: z.boolean(),
  askedNeededQuestions: z.boolean(),
  blankedOut: z.boolean(),
  canTryAgain: z.boolean(),
  reflection: z.string().max(500),
});

export type SelfReviewInput = z.infer<typeof selfReviewInputSchema>;
export type SelfReview = SelfReviewInput & {
  savedAt: string;
  tensionDifference: number;
  confidenceDifference: number;
};

export function createSelfReview(input: SelfReviewInput, savedAt: string): SelfReview {
  const value = selfReviewInputSchema.parse(input);
  return {
    ...value,
    savedAt,
    tensionDifference: value.tensionAfter - value.tensionBefore,
    confidenceDifference: value.confidenceAfter - value.confidenceBefore,
  };
}
