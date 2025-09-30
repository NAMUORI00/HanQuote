# Docker 개발 워크플로우

## 개요
HanQuote 프로젝트는 **Docker 컨테이너 기반 개발**을 원칙으로 합니다.
호스트 시스템에서 직접 npm 명령어를 실행하지 마세요.

## 왜 Docker만 사용하나요?

### 1. 환경 일관성
- CI/CD (GitHub Actions)와 동일한 Node.js 20 Alpine 환경
- "내 컴퓨터에서는 되는데..." 문제 방지

### 2. 시스템 격리
- 호스트에 node_modules 설치 불필요
- npm 패키지가 시스템 전역에 설치되지 않음

### 3. 클린 테스트
- 매 실행마다 새로운 컨테이너 생성
- 이전 실행의 부작용 없음

### 4. 프로세스 관리
- 컨테이너 종료 시 모든 프로세스 자동 정리
- 좀비 프로세스나 포트 충돌 없음

## 기본 명령어

### 명언 수집 테스트
```bash
# 1. 드라이런 (파일 작성 없이 시뮬레이션)
make docker-dry
# 또는
docker compose run --rm -e DRY_RUN=true fetch

# 2. 오프라인 모드 (seeds.json 사용)
make docker-offline
# 또는
docker compose run --rm -e OFFLINE_MODE=true fetch

# 3. 실제 수집 (Quotable API 호출)
make docker-fetch
# 또는
docker compose run --rm fetch
```

### 사이트 미리보기
```bash
# 서버 시작 (http://localhost:4173)
make docker-preview
# 또는
docker compose up preview

# 브라우저에서 http://localhost:4173 접속

# 종료 (Ctrl+C 후)
make docker-down
# 또는
docker compose down
```

## 환경 변수 설정

`.env` 파일 생성 (`.env.example` 복사):
```bash
cp .env.example .env
```

`.env` 편집:
```env
MAX_QUOTES_PER_RUN=1
OFFLINE_MODE=true
DRY_RUN=false
```

Docker Compose가 자동으로 `.env` 파일을 로드합니다.

## 일반적인 개발 시나리오

### 시나리오 1: 새 기능 개발
```bash
# 1. dev 브랜치에서 작업
git checkout dev

# 2. 코드 수정 (scripts/fetch_quotes.mjs 등)
vim scripts/fetch_quotes.mjs

# 3. 드라이런으로 테스트
make docker-dry

# 4. 오프라인 모드로 실제 동작 확인
make docker-offline

# 5. 데이터 확인
cat data/quotes.json

# 6. 커밋
git add .
git commit -m "feat: add new feature"
```

### 시나리오 2: 사이트 UI 수정
```bash
# 1. HTML/CSS 수정
vim site/index.html
vim site/styles.css

# 2. 미리보기 서버 시작
make docker-preview

# 3. 브라우저에서 http://localhost:4173 열기

# 4. 수정 후 새로고침 (정적 파일이므로 자동 반영)

# 5. 만족스러우면 Ctrl+C로 서버 종료
make docker-down

# 6. 커밋
git add site/
git commit -m "feat: update UI styling"
```

### 시나리오 3: API 통합 테스트
```bash
# 1. 네트워크 연결 확인
ping -c 3 api.quotable.io

# 2. 실제 API 호출 테스트
make docker-fetch

# 3. 로그 확인 (성공/실패)
# 4. data/quotes.json 확인
cat data/quotes.json | jq '.[-1]'  # 최신 항목 확인

# 5. site/data/quotes.json도 미러링되었는지 확인
diff data/quotes.json site/data/quotes.json
```

## 문제 해결

### 컨테이너가 시작되지 않음
```bash
# Docker 데몬 상태 확인
systemctl status docker

# 컨테이너 로그 확인
docker compose logs fetch
docker compose logs preview
```

### 포트 4173이 이미 사용 중
```bash
# 기존 컨테이너 확인
docker compose ps

# 모든 컨테이너 중지
make docker-down

# 포트 사용 프로세스 확인
sudo lsof -i :4173

# 필요시 강제 종료
sudo kill -9 <PID>
```

### 데이터 파일 권한 문제
```bash
# 컨테이너는 /app에 호스트 디렉토리를 마운트
# 파일 소유권 확인
ls -la data/

# 필요시 권한 수정
chmod 644 data/quotes.json
```

### 이미지가 오래되었을 때
```bash
# 최신 이미지 풀
docker compose pull

# 또는 이미지 재빌드 (커스텀 Dockerfile 있을 경우)
docker compose build --no-cache
```

## 고급 사용법

### 컨테이너 내부 디버깅
```bash
# Bash 쉘로 컨테이너 진입
docker compose run --rm fetch sh

# 컨테이너 내부에서
node --version  # Node.js 버전 확인
ls -la          # 파일 확인
node scripts/fetch_quotes.mjs  # 수동 실행
exit            # 종료
```

### 환경 변수 오버라이드
```bash
# 명령줄에서 직접 설정
docker compose run --rm \
  -e MAX_QUOTES_PER_RUN=5 \
  -e OFFLINE_MODE=true \
  fetch
```

### 볼륨 확인
```bash
# compose.yaml 참고
# fetch 서비스: ./:/app (전체 디렉토리 마운트)
# preview 서비스: ./site:/usr/share/nginx/html:ro (읽기 전용)

# 현재 볼륨 상태
docker compose config
```

## 정리 명령어

### 일반 정리
```bash
# 실행 중인 컨테이너 중지
make docker-down

# 또는 전체 정리 (볼륨, 네트워크 포함)
docker compose down -v
```

### 디스크 공간 확보
```bash
# 미사용 컨테이너/이미지 정리
docker system prune -a

# 확인 후 실행
docker system df  # 디스크 사용량 확인
```

## 참고 사항

- `docker compose run --rm`: 실행 후 컨테이너 자동 삭제
- `docker compose up`: 백그라운드 서비스 시작 (preview용)
- `docker compose down`: 모든 서비스 중지 및 제거
- Makefile 명령어는 docker compose를 래핑한 것입니다

## 추가 자료

- [compose.yaml](compose.yaml): Docker Compose 설정 파일
- [Makefile](Makefile): 단축 명령어 정의
- [.env.example](.env.example): 환경 변수 템플릿