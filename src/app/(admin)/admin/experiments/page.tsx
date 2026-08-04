import { AdminExperimentPanel } from "@/modules/admin-experiment/presentation/admin-experiment-panel";
import { technicalMvpScenarioFixtures } from "@/scenarios/technical-mvp";

export default function AdminExperimentsPage() {
  return <AdminExperimentPanel initialScenario={technicalMvpScenarioFixtures[0]} />;
}
