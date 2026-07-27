import { getProviderRuntimeStatus } from "@/application/environment/provider-runtime-status";

export default function TestAppPage() {
  const status = getProviderRuntimeStatus(process.env);

  return (
    <main>
      <section className="panel" aria-labelledby="test-app-title">
        <p>ClientTalk Coach / Environment check</p>
        <h1 id="test-app-title">Test app is running</h1>
        <p>
          This page verifies the local runtime before practice features are introduced.
        </p>
        <div className="status" aria-label="provider status">
          <strong>Provider mode: {status.mode}</strong>
          <p>{status.message}</p>
        </div>
      </section>
    </main>
  );
}
