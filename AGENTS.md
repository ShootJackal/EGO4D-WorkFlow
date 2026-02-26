# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

TaskFlow is a React Native / Expo (SDK 54) cross-platform task management dashboard. It uses Bun as the package manager (`bun.lock`). The backend is a Google Apps Script endpoint (no self-hosted backend).

### Running the app

- **Web dev server**: `bunx expo start --web --port 8081` — starts Metro bundler and serves the app at `http://localhost:8081`
- The `package.json` scripts (`bun run start`, `bun run start-web`) use the Rork CLI with `--tunnel`, which requires external network tunneling. For local development, use the direct Expo commands above instead.
- **Lint**: `bun run lint` (runs `expo lint` with ESLint flat config)
- **Web build**: `bunx expo export --platform web` outputs to `dist/`

### Gotchas

- The app's data comes from a Google Apps Script endpoint configured via `EXPO_PUBLIC_GOOGLE_SCRIPT_URL`. A default fallback URL is hardcoded in the source, so the app works without setting this env var (as long as the upstream endpoint is active).
- There are no automated tests in this project (no test runner, no test files).
- Expo may print version-compatibility warnings on startup; these are non-blocking.
- Selecting a collector from the dropdown on the Collect tab may crash the web preview — this is a pre-existing app bug, not an environment issue.
