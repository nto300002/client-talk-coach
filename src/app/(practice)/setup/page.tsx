import { scenarioFixtureRepository } from "@/modules/scenario/infrastructure/scenario-fixture-repository";

export default function PracticeSetupPage() {
  const scenarios = scenarioFixtureRepository.listSelectionItems();

  return (
    <main className="setup-page">
      <section className="setup-shell" aria-labelledby="scenario-selection-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="scenario-selection-title">練習シチュエーションを選択</h1>
        <p className="lead">
          まずは受託開発で起こりやすい場面を選びます。AI顧客との会話は、この選択に合わせて始まります。
        </p>
        <ul className="scenario-list" aria-label="scenario options">
          {scenarios.map((scenario) => (
            <li key={scenario.id}>
              <article className="scenario-option">
                <div>
                  <p className="scenario-version">v{scenario.version}</p>
                  <h2>{scenario.displayName}</h2>
                  <p>{scenario.shortDescription}</p>
                </div>
                <span>{scenario.sceneCount}場面</span>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
