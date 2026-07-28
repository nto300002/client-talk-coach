import type { ScenarioDefinition } from "@/modules/scenario/domain/scenario-definition";
import {
  createPracticeSetup,
  type FocusSkillHistoryItem,
  type PracticeSetupConfiguration,
  type PracticeSetupInput,
} from "@/modules/practice-setup/domain/practice-setup";

export class StartPracticeSetup {
  execute(
    input: PracticeSetupInput,
    scenario: ScenarioDefinition,
    history: FocusSkillHistoryItem[] = [],
  ): PracticeSetupConfiguration {
    return createPracticeSetup(input, scenario, history);
  }
}
