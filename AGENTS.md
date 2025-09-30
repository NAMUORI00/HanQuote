# Repository Guidelines

## Project Structure & Module Organization
- Scripts: `scripts/` — core job is `fetch_quotes.mjs` (ESM).
- Data: `data/quotes.json` (append-only), `data/seeds.json` (offline/dev).
- Site: `site/` — static pages (`index.html`, `styles.css`, `site/data/quotes.json`).
- CI/CD: `.github/workflows/schedule.yml` — scheduled + manual runs, Pages deploy.
- Dev tooling: `compose.yaml`, `Makefile`, `.env.example`, `package.json`.

## Build, Test, and Development Commands
- Local (Node): `npm run fetch` (online), `npm run dev:offline`, `npm run dev:dry`, `npm run preview`.
- Docker: `docker compose run --rm fetch` · `docker compose up preview`.
- Make: `make docker-fetch` · `make docker-offline` · `make docker-dry` · `make docker-preview`.
- Notes: `.env` is auto‑loaded by Compose; copy from `.env.example`.

## Coding Style & Naming Conventions
- Language: Node.js 18+ ESM; use `import`/`export` only.
- Indentation: 2 spaces; keep semicolons; single quotes in JS when reasonable.
- Modules: small, single‑purpose; pure helpers preferred; avoid global state.
- Data shape: conform to PRD schema; keep keys stable and lowercase with underscores.

## Testing Guidelines
- No formal test suite yet. If adding tests:
  - Prefer Node’s built‑in test runner (`node --test`) or Vitest (if introduced).
  - Name files `*.test.mjs` near the code; cover hash/normalize, duplication checks.

## Commit & Pull Request Guidelines
- Conventional style: `feat:`, `fix:`, `chore:`, `ci:`, `deps:`, `docs:`.
  - Data updates by automation: `chore(data): update quotes YYYY‑MM‑DDTHH:mm:SSZ`.
- PRs: clear summary, linked issues, what/why, before/after if UI changes.
- Keep diffs focused; update README/PRD when behavior or structure changes.

## Security & Configuration Tips
- Never commit secrets. Use GitHub Secrets/Repo Variables only.
- Follow robots.txt/TOS for sources; keep request counts minimal.
- OOS rules: do not remove SHA‑256 duplicate guard; do not expose secrets to `site/`.

