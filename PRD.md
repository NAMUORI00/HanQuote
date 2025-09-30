# HanQuote — Product Requirements Document (PRD)

## 1) 개요
- 목적: GitHub Actions가 주기적으로 명언(원문)을 수집하고, 인용/출처를 포함해 저장하며, GitHub Pages로 시각화한다. 선택적으로 특정 사이트의 변경을 모니터링해 요약을 함께 게시한다. 번역 기능은 향후 확장 항목으로 유지한다.
- 산출물: 정적 사이트(홈: 최신 명언, 아카이브: 과거 리스트), 데이터(JSON/Markdown), 실행 로그.

## 2) 목표와 비목표
- 목표
  - 매일 또는 지정 주기(KST 09:00 등)로 명언 수집·게시 자동화
  - 인용 형식(원문/인용, 출처/링크) 표준화 및 데이터로 보존
  - 번역 API 제공자는 향후 확장으로 고려하되 현재 MVP 범위는 원문 게시에 집중
  - 선택적: 지정 URL의 변경 감지 및 요약(합법 범위 및 robots.txt 준수)
- 비목표
  - 사용자 인증/로그인 기능
  - 서버 측 실시간 API 제공(정적 사이트로 한정)
  - 대규모 스크래핑/과도한 크롤링

## 3) 주요 사용자 & 시나리오
- 개인 블로거/개발자: 매일 한 문장 명언을 한국어로 소개하고 싶다.
- 팀/조직: 사내 페이지에서 매일 영감이 되는 문구를 공유하고 싶다.
- 리서처: 특정 사이트 공지의 변경 내역을 요약해 기록하고 싶다.

## 4) 범위(Scope)
- MVP
  - 1개의 명언 소스(API 또는 HTML 페이지)에서 1개 이상 명언 수집
  - (선택) 번역 제공자 연동 — MVP 범위 밖으로 이동
  - JSON 저장 및 단순 `index.html`로 최신 N개 렌더링
  - GitHub Actions 스케줄/수동 트리거, 커밋/푸시 자동화
- 확장
  - 다중 소스 라운드로빈/백업 소스
  - 사이트 변경 모니터링(선택)
  - 아카이브 페이지/검색/태그 필터링

## 5) 기능 요구사항
- 명언 수집
  - HTTP GET으로 API 또는 페이지에서 텍스트 추출
  - 저자/출처/링크/라이선스(가능 시) 함께 수집
  - 중복 방지를 위해 해시 기반 중복 체크
  - 실패 시 백오프/재시도, 포맷 변화에 견고한 파싱
- 인용/출처 처리
  - citation 스타일 통일: "\"원문\" — 저자 (출처명, 링크)"
  - 저자/출처 미제공 시 필드 비움 및 표시 로직 분기
- 번역(확장)
  - MVP에서는 지원하지 않는다.
  - 향후 추가 시 제공자 선택(`TRANSLATE_PROVIDER`)과 시크릿 연동 구조를 도입한다.
- 데이터 저장
  - `data/quotes.json`(append) 또는 `content/quotes.md`(프런트매터 포함)
  - 항목 스키마는 아래 9장 참조
  - 커밋 메시지 예: "chore(data): add quote YYYY-MM-DD"
- 페이지 표시
  - 홈: 최신 N개(원문/저자/출처) 카드형 목록
  - 아카이브: 무한 스크롤 또는 페이지네이션(확장)
  - 다국어 폰트/줄바꿈 안전 처리
- 스케줄링/자동화
  - GitHub Actions `schedule`(cron) + `workflow_dispatch`
  - `concurrency`로 중복 실행 방지
  - 실패 시 재시도(최대 2회) 및 로그 보존
- 모니터링(선택)
  - 타깃 URL 본문 정규화 → 해시 비교
  - 변경 시: 변경 요약(문자 수 제한, 간단 diff) 생성하여 `data/monitor.jsonl` 기록 및 페이지 섹션에 표시
- 알림(선택)
  - GitHub Issues 코멘트/PR 코멘트 남기기 또는 Slack/Webhook(시크릿 필요)

## 6) 비기능 요구사항
- 신뢰성: 스케줄 실행 성공률 99%+, 실패 시 자동 재시도 및 명확한 로그
- 성능: 전체 실행 2분 이내, 외부 호출 ≤ 10회/실행(소스 수에 따라 가변)
- 보안: API 키는 GitHub Secrets에만 저장, 프런트에 노출 금지
- 준법: robots.txt, TOS 준수, 출처/저작권 명시
- 국제화: UTF-8, RTL/비라틴 문자 안전, 이스케이프 처리

## 7) 기술 스택
- 런타임: Node.js(LTS) 또는 Python(둘 중 택1, MVP는 Node.js 가정)
- 저장: Git(버전 기록), JSON/Markdown 파일
- 호스팅: GitHub Pages
- 자동화: GitHub Actions
- 번역: (향후) DeepL/Google/Papago/OpenAI 등 플러그형 어댑터 고려

## 8) 리포지터리 구조(안)
```
/
├─ data/
│  └─ quotes.json              # 누적 데이터(최신이 마지막)
├─ scripts/
│  ├─ fetch_quotes.mjs         # 명언 수집 + 저장
│  └─ monitor.mjs              # 사이트 변경 모니터링(선택)
├─ site/
│  ├─ index.html               # 최신 명언 N개 표시
│  ├─ archive.html             # 전체/페이지네이션(확장)
│  └─ styles.css
├─ .github/
│  └─ workflows/
│     └─ schedule.yml          # 스케줄/수동 트리거 파이프라인
├─ README.md
└─ package.json (또는 requirements.txt)
```

## 9) 데이터 스키마
- QuoteItem(JSON)
  - `id`(string): 고유 ID(해시 또는 날짜+해시)
  - `text_original`(string): 원문 명언
  - `author`(string|null): 저자
  - `source_name`(string|null): 출처명(예: Quotable)
  - `source_url`(string|null): 링크 URL
  - `language`(string): 원문 언어 코드(예: `en`)
  - `tags`(string[]): 주제 태그(가능 시)
  - `fetched_at`(string, ISO8601): 수집 시각(UTC)
  - `hash`(string): 원문 정규화 텍스트의 해시(SHA-256 등)

예시
```
{
  "id": "2025-01-01_14f9...",
  "text_original": "The only limit to our realization of tomorrow is our doubts of today.",
  "author": "Franklin D. Roosevelt",
  "source_name": "Quotable",
  "source_url": "https://api.quotable.io/random",
  "language": "en",
  "tags": ["inspiration"],
  "fetched_at": "2025-01-01T00:00:05Z",
  "hash": "sha256:..."
}
```

- MonitorRecord(JSONL)
  - `target_url`(string), `last_hash`(string), `checked_at`(ISO8601), `change_summary`(string?)

## 10) 워크플로우 설계(요약)
- 트리거
  - `schedule`: `0 0 * * *`(UTC 자정 → KST 09:00)
  - `workflow_dispatch`: 수동 실행
- 잡 구성
  - `setup`: Node.js 20.x 설치, 의존성 캐시
  - `run`: `node scripts/fetch_quotes.mjs` 실행 → `data/quotes.json` 갱신
  - `monitor`(선택): `node scripts/monitor.mjs`
  - `commit`: 변경 파일 커밋/푸시(`github-actions[bot]`), 충돌 방지용 `concurrency`
  - `pages`: GitHub Pages 배포(브랜치 `gh-pages` 또는 `main`/`docs`)
- 시크릿
  - 수집 소스에 필요한 API 키(해당 시)
- 로그/알림
  - 실패 시 워크플로우 주석, 선택적 이슈 코멘트

## 11) 환경 변수 정의(예시)
- `TIMEZONE`: `Asia/Seoul`
- `MAX_QUOTES_PER_RUN`: `1`
- `QUOTE_SOURCES`: 쉼표 분리 URL/API 키 목록
- `MONITOR_URLS`(선택): 쉼표 분리 대상 URL 목록

## 12) 에러 처리/회복
- 외부 API 오류 시: 지수 백오프(예: 1s, 2s, 4s), 최대 3회
- 번역 실패 시: (해당 없음 — 번역 미구현)
- 데이터 손상 방지: 임시 파일에 쓰고 원자적 교체
- 취소/중복: `concurrency: group: hanquote-data`로 보호

## 13) 보안/준법
- API 키는 GitHub Secrets로만 주입, 커밋 금지
- 로봇 차단/이용약관 준수, 요청 수 제한 설정
- 출처/저작권 표기(페이지 하단 Attribution)

## 14) 성능/비용 가드레일
- 실행 시간 2분 이내, 외부 호출 ≤ 3회/실행(소스 수집 기준)
- 무료 티어 사용 시 쿼터 초과 대비: 자동 스킵/대체 제공자

## 15) 테스트/검증
- 단위: 텍스트 정규화/해시, 중복 감지 함수 테스트
- 통합: 수집→중복 검사→저장 플로우
- 리허설: 수동 트리거로 첫 배포 전 데이터 검증

## 16) 마일스톤
- M1: 스캐폴딩 + 수집(1 소스) + JSON 저장 + 수동 실행
- M2: 스케줄 + GitHub Pages 표시(번역은 후속)
- M3: 다중 소스/중복 방지 + 간단 아카이브
- M4: 모니터링(선택) + 알림(선택)

## 17) 리스크 & 대응
- 외부 API 변경/차단: 다중 소스/어댑터화, 간단 캐시
- 스케줄 지연: 여유있는 cron, 실패 재시도
- 데이터 포맷 변화: 엄격 파서 대신 관대한 파싱 + 스키마 검증

## 18) 수용 기준(AC)
- AC1: 스케줄 실행 후 `data/quotes.json`에 신규 항목이 1개 이상 추가된다.
- AC2: 페이지에서 원문/저자/출처가 정상 표시된다.
- AC3: 번역 기능 없이도 빌드가 실패하지 않고 원문이 게시된다.
- AC4: 동일 명언은 중복 저장되지 않는다(해시 기준).
- AC5: 시크릿이 클라이언트로 노출되지 않는다.

---
문의/결정 필요 사항
- 선호 소스(API/사이트)와 사용 허가/약관 여부
- (향후) 기본 번역 제공자 선택 및 예산/무료 티어 제한
- 갱신 주기(KST 기준 시각)와 게시 스타일(카드/리스트)
- 모니터링 대상 URL 유무 및 표시 범위
