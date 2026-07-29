import type { ScenarioState } from "@/modules/scenario/domain/scenario-state";

const storageKey = "client-talk-coach.scenario-states";

export function saveScenarioState(sessionId: string, state: ScenarioState): void {
  const all = read();
  all[sessionId] = state;
  window.sessionStorage.setItem(storageKey, JSON.stringify(all));
}

export function loadScenarioState(sessionId: string): ScenarioState | null { return read()[sessionId] ?? null; }

function read(): Record<string, ScenarioState> {
  const stored = window.sessionStorage.getItem(storageKey);
  return stored ? (JSON.parse(stored) as Record<string, ScenarioState>) : {};
}
