# ClientTalk Coach

Private, browser-based practice for software developers who want to build confidence in client-facing conversations.

## Issue 001 local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3000/test-app](http://127.0.0.1:3000/test-app) to confirm the local runtime and mock-provider status.

## Verification

```bash
npm test
npm run test:e2e
npm run smoke:providers
```

`npm run smoke:providers` is safe in the default mock mode and never calls an external provider. To explicitly verify production credentials and reachability without transmitting private user data, set `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT_ID`, and a short-lived `GOOGLE_CLOUD_ACCESS_TOKEN` in `.env.local`, then run:

```bash
npm run smoke:providers:production
```

The production smoke test calls provider metadata/list endpoints only. It does not send recording, audio, transcript, or evaluation data.

## Documentation

The project specifications, architecture, visual design, and implementation issues are in [docs](./docs/README.md).
