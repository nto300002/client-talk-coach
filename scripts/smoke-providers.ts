import { parseRuntimeEnvironment } from "../src/infrastructure/config/runtime-environment";
import { runProviderSmokeTest, safeSmokeError } from "../src/infrastructure/ai/provider-smoke-test";

const production = process.argv.includes("--production");

async function main() {
  try {
    const config = parseRuntimeEnvironment(process.env, { requireProductionCredentials: production });
    const results = await runProviderSmokeTest(config);
    for (const result of results) {
      console.log(`[${result.status}] ${result.provider}: ${result.message}`);
    }
    if (results.some((result) => result.status === "failed")) process.exitCode = 1;
  } catch (error) {
    console.error(`[failed] ${safeSmokeError(error)}`);
    process.exitCode = 1;
  }
}

void main();
