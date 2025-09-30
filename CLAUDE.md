# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
HanQuote is an automated quote collection and publishing system that fetches quotes from external APIs and publishes them to a static GitHub Pages site. The system runs on a scheduled GitHub Actions workflow and supports offline development modes.

## Branch Strategy
- **main**: Production branch, deployed to GitHub Pages, protected
- **dev**: Development branch, all feature work happens here
- **Workflow**:
  - Always work on `dev` branch for development
  - Test thoroughly before merging to `main`
  - `main` branch should only receive tested, stable code
  - GitHub Actions runs on both branches but only `main` deploys to production Pages

## Architecture

### Data Flow
1. **Fetch**: [scripts/fetch_quotes.mjs](scripts/fetch_quotes.mjs) fetches quotes from Quotable API or local seeds
2. **Deduplicate**: SHA-256 hash comparison prevents duplicate quotes
3. **Store**: Appends to [data/quotes.json](data/quotes.json) (append-only)
4. **Mirror**: Copies to [site/data/quotes.json](site/data/quotes.json) for Pages deployment
5. **Deploy**: GitHub Actions commits changes and deploys [site/](site/) to Pages

### Core Components
- **fetch_quotes.mjs**: Main orchestration script
  - Handles online (Quotable API) and offline (seeds.json) modes
  - Implements atomic writes via temp files
  - Normalizes text and computes SHA-256 hashes for deduplication
  - Supports dry-run mode for testing
- **data/quotes.json**: Append-only quote storage (source of truth)
- **data/seeds.json**: Fallback quotes for offline/development
- **site/**: Static HTML/CSS served via GitHub Pages
- **schedule.yml**: Cron-based CI/CD (00:00 UTC daily = 09:00 KST)

### Quote Schema
```json
{
  "id": "YYYY-MM-DD_hash10chars",
  "text_original": "quote text",
  "author": "string|null",
  "source_name": "Quotable",
  "source_url": "https://...",
  "language": "en",
  "tags": ["array"],
  "fetched_at": "ISO8601",
  "hash": "sha256:hex"
}
```

## Git Workflow

### Checking Current Branch
```bash
git branch              # List branches, current branch marked with *
git status              # Check current branch and working tree status
```

### Switching Branches
```bash
git checkout dev        # Switch to dev branch
git checkout main       # Switch to main branch
```

### Development Cycle
```bash
# 1. Ensure you're on dev branch
git checkout dev

# 2. Make changes and test with Docker
make docker-dry         # Test without writing files
make docker-offline     # Test with seeds.json
make docker-fetch       # Test real fetch

# 3. Preview site (if needed)
make docker-preview     # View at http://localhost:4173
# Press Ctrl+C to stop, then: make docker-down

# 4. Commit changes
git add .
git commit -m "feat: description of changes"

# 5. When ready for production, merge to main
git checkout main
git merge dev
git checkout dev        # Switch back to dev for continued work
```

## Development Commands

⚠️ **IMPORTANT: All testing and development MUST be done inside Docker containers. Do NOT run npm commands directly on the host system.**

### Docker Compose (Required for all development)
```bash
docker compose run --rm fetch              # Online fetch
docker compose run --rm -e OFFLINE_MODE=true fetch
docker compose run --rm -e DRY_RUN=true fetch
docker compose up preview                  # Site preview at :4173
docker compose down
```

### Makefile Shortcuts (Recommended)
```bash
make docker-fetch       # Fetch quotes online
make docker-offline     # Fetch quotes offline (seeds.json)
make docker-dry         # Dry-run mode (no file writes)
make docker-preview     # Preview site at http://localhost:4173
make docker-down        # Stop all containers
```

### Why Docker-Only?
- **Consistency**: Same environment as CI/CD (GitHub Actions)
- **Isolation**: No npm packages polluting host system
- **Clean state**: Fresh container for each test run
- **No cleanup**: Containers are ephemeral, no leftover processes

## Environment Variables
Copy [.env.example](.env.example) to `.env` for local development:
- `MAX_QUOTES_PER_RUN`: Number of quotes to fetch (default: `1`)
- `OFFLINE_MODE`: Use seeds.json instead of API (`true|false`)
- `DRY_RUN`: Skip file writes, log actions only (`true|false`)

Docker Compose auto-loads `.env`; GitHub Actions uses repo variables/secrets.

## CI/CD Pipeline
[.github/workflows/schedule.yml](.github/workflows/schedule.yml):
1. **Trigger**: Cron `0 0 * * *` (UTC) or manual `workflow_dispatch`
2. **Run**: Executes `fetch_quotes.mjs` with `MAX_QUOTES_PER_RUN` from repo variable
3. **Commit**: Auto-commits changes to `data/` and `site/data/` as `github-actions[bot]`
4. **Deploy**: Uploads `site/` artifact to GitHub Pages
5. **Optional**: Cloudflare Pages deployment (toggle via `CF_PAGES_ENABLED='true'` repo variable)

**Concurrency**: `group: hanquote-data` prevents parallel runs that could cause conflicts.

## Code Patterns

### Duplication Prevention
The hash-based deduplication is **critical** and must be preserved:
```javascript
const norm = normalizeText(item.text_original);
const hash = sha256(norm);
const exists = list.some(q => q.hash === hash);
```
Never remove or weaken this check.

### Atomic Writes
Always use `atomicWrite()` for file updates to prevent corruption:
```javascript
await atomicWrite(DATA_FILE, JSON.stringify(list, null, 2) + '\n');
```

### Fallback Chain
Online → Quotable API → seeds.json → random seed. Ensure all failure paths are graceful.

## Security & Compliance
- **No secrets in code**: Use GitHub Secrets for API keys (future)
- **Respect robots.txt**: Quotable API is compliant; check TOS before adding sources
- **Rate limiting**: Keep `MAX_QUOTES_PER_RUN` low (default: 1) to avoid abuse

## File Locations
- Main script: [scripts/fetch_quotes.mjs](scripts/fetch_quotes.mjs)
- Data (source): [data/quotes.json](data/quotes.json)
- Data (site mirror): [site/data/quotes.json](site/data/quotes.json)
- Seeds: [data/seeds.json](data/seeds.json)
- Site: [site/index.html](site/index.html), [site/styles.css](site/styles.css)
- CI/CD: [.github/workflows/schedule.yml](.github/workflows/schedule.yml)
- Config: [compose.yaml](compose.yaml), [Makefile](Makefile), [.env.example](.env.example)

## Design Decisions
- **ESM-only**: `"type": "module"` in [package.json](package.json); use `import`/`export`
- **No dependencies**: Core script uses only Node.js built-ins (fs, path, crypto)
- **Append-only data**: [data/quotes.json](data/quotes.json) grows monotonically; never prune without backup
- **Static site**: No server-side rendering; all data baked into JSON at build time
- **Translation disabled**: PRD mentions future translation, but MVP focuses on original quotes only

## Testing
No formal test suite yet. To add tests:
- Use Node's built-in `node --test` or introduce Vitest
- Name files `*.test.mjs` adjacent to source
- Cover: `normalizeText()`, `sha256()`, deduplication logic, seed selection

## Troubleshooting
- **Duplicate commits**: Check `concurrency` in workflow; ensure no parallel runs
- **Empty fetch**: Quotable API may be down; verify with `npm run dev:offline`
- **Site not updating**: Check Pages permissions in repo Settings → Pages
- **Docker volume issues**: Ensure `./` is mounted correctly in [compose.yaml](compose.yaml)

## Related Documentation
- [PRD.md](PRD.md): Full product requirements and schema details
- [AGENTS.md](AGENTS.md): Repository guidelines and coding conventions
- [README.md](README.md): User-facing quick start guide
- [DOCKER_WORKFLOW.md](DOCKER_WORKFLOW.md): Comprehensive Docker development guide