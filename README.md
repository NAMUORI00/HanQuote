# HanQuote

GitHub Pages용 정적 사이트에 명언을 자동 수집해 게시합니다.

- PRD: `PRD.md`
- 데이터: `data/quotes.json`
- 스크립트: `scripts/*.mjs`
- 사이트: `site/`
- CI: `.github/workflows/schedule.yml`

## 빠른 시작
- 필수: Node.js 18+
- 1회 수집(온라인): `npm run fetch`
- 오프라인 수집(네트워크 불필요): `npm run dev:offline`
- 드라이런(파일 미작성): `npm run dev:dry`
- 로컬 미리보기: `npm run preview` (실행 시 `http-server` 자동 설치/실행)

## 환경 변수
- `MAX_QUOTES_PER_RUN`: 기본 `1`
- `OFFLINE_MODE`: `true|false` (기본 `false`)
- `DRY_RUN`: `true|false` (기본 `false`)
  - 로컬 개발 편의를 위해 `.env.example` → `.env` 복사 후 값 설정

## Docker(로컬 개발)
- Compose 서비스(`compose.yaml` 참고)
  - `fetch`: Node 20 Alpine 컨테이너에서 수집 실행
  - `preview`: Nginx로 `site/` 제공(`http://localhost:4173`)
- `.env`를 변수 치환에 사용(Compose가 자동 로드)

예시:
- 온라인 수집: `docker compose run --rm fetch`
- 오프라인 수집: `docker compose run --rm -e OFFLINE_MODE=true fetch`
- 드라이런: `docker compose run --rm -e DRY_RUN=true fetch`
- 사이트 미리보기: `docker compose up preview` 후 `http://localhost:4173` 접속
- 종료: `docker compose down`

Make 단축 명령:
- `make docker-fetch`, `make docker-offline`, `make docker-dry`, `make docker-preview`, `make docker-down`

번역 기능은 현재 비활성화되어 있으며, 사이트는 원문을 표시합니다.

## GitHub Actions
- 매일 00:00 UTC(KST 09:00) 및 수동 실행 지원
- 변경 시 `data/quotes.json` 커밋 및 `site/data/quotes.json`으로 미러
- `site/`를 Pages 아티팩트로 업로드·배포
- 선택: 리포 변수 `CF_PAGES_ENABLED='true'`와 시크릿(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`) 설정 시 Cloudflare Pages 동시 배포

저장소 Settings에서 Pages 권한을 활성화하면 워크플로우가 아티팩트 업로드와 배포를 수행합니다.

## 의존성 업데이트
- `.github/dependabot.yml`에 `npm` 및 `github-actions`용 Dependabot이 설정되어 있습니다.
