# 012 - Conversation Analysis And Feedback Generation

## Purpose

Analyze transcript structure and generate supportive feedback with exactly one primary improvement.

## Scope

- Conversation analysis API boundary.
- Question classification.
- Conclusion-first detection.
- Long preface detection.
- Direct-answer detection.
- Technical term explanation detection.
- Agreement extraction.
- Feedback prioritization.
- Prohibited feedback expression filtering.

## TDD Premise

Use fixed transcript fixtures. Tests verify categories, structure, evidence, and forbidden outputs rather than exact AI wording.

## Acceptance Requirements

- Question categories are identified.
- Conclusion-first and delayed-conclusion answers are distinguished.
- Technical terms without explanation are improvement candidates.
- Correctly explained technical terms are not falsely flagged.
- Agreements, responsible parties, and deadlines are extracted.
- Findings without evidence utterances are rejected.
- Strengths appear before improvements.
- Exactly one primary improvement is shown.
- Critical misunderstanding outranks missing requirement, which outranks voice metrics.
- Feedback never diagnoses emotion, personality, or confidence.
- Feedback includes a concrete retry task.

## Test Requirements

### Unit Test

- Feedback priority picks highest severity item.
- Selected focus skill breaks ties.
- Forbidden phrases are detected and removed.
- Empty or weak issue list falls back to gentle next-practice feedback.

### AI Fixture Test

- Good interview fixture produces strengths and no forbidden findings.
- Missing requirement fixture selects missing critical requirement.
- Rambling answer fixture detects structure issue.
- Low-volume but good-content fixture does not let volume outrank critical content issues.
- Delay report fixture detects late conclusion.

### E2E Test

1. Start the environment.
2. Complete practice with fixture transcript.
3. Open result.
4. Confirm strengths appear first.
5. Confirm exactly one primary improvement and retry task appear.

## Required Final Verification

- Start the environment.
- Run conversation analysis and feedback tests.
- Run result feedback E2E test.

