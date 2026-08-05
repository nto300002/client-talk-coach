import { scenarioFixtureRepository } from "@/modules/scenario/infrastructure/scenario-fixture-repository";
import { PracticeSetupForm } from "@/modules/practice-setup/presentation/practice-setup-form";

export default function PracticeSetupPage() {
  const scenarios = scenarioFixtureRepository.listEnabledScenarios();

  return (
    <main className="setup-page">
      <section className="setup-shell" aria-labelledby="scenario-selection-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="scenario-selection-title">練習を設定する</h1>
        <p className="lead">
          場面と難易度を選んでから、AI顧客との会話を始めます。今回は一つの技能に意識を向けましょう。
        </p>
        <PracticeSetupForm scenarios={scenarios} />
      </section>
    </main>
  );
}
