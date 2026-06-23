# GMS 계산기 — 배포 가이드 (Vercel)

길드원에게 **링크 하나로 공유**하고, 코드를 고칠 때마다 **push만 하면 자동 반영**되는 구조입니다.
사용자는 아무것도 설치할 필요가 없고 캐릭터 검색까지 동작합니다.

## 구조
- 정적 파일(`index.html`, `app.js`, `style.css`, `data.js`, `calculators.js`) → 그대로 서빙
- `api/lookup.js` → Nexon 랭킹 API 중계(프록시). 브라우저 CORS 차단을 우회하는 용도.
- `serve.js` → **로컬 개발 전용** (Node 설치 시 `node serve.js`). 배포에는 불필요.

## 최초 배포 (한 번만)
1. https://vercel.com 가입 (GitHub 계정으로 로그인 권장)
2. 이 폴더를 GitHub 저장소로 push
   - 이 폴더(`GMS_WEEK_BOSS`)를 **저장소 루트**로 올리는 것이 가장 간단합니다.
   - 상위 폴더째 올린다면 Vercel "Import" 시 **Root Directory** 를 이 폴더로 지정.
3. Vercel → **Add New → Project → 저장소 선택 → Deploy**
   - Framework Preset: **Other**, Build Command: 비움, Output: 그대로
4. 배포 끝나면 `https://<프로젝트명>.vercel.app` 주소가 생김 → 길드원에게 공유

## 수정 후 반영 (계속 사용)
```
git add .
git commit -m "수정 내용"
git push
```
push하면 Vercel이 자동 재배포. 같은 주소로 최신 버전이 보입니다.

## 검색 동작 확인
배포 후 브라우저에서 직접 호출해 보기:
```
https://<프로젝트명>.vercel.app/api/lookup?name=캐릭터명&region=na&reboot=0
```
`{"ok":true,...}` 가 나오면 정상.

## 경험치 히스토리 자동 수집 (maplehub식 그래프)

캐릭터 정보 탭의 7/14/30/90일 평균과 일별 경험치 그래프는 **매일 자동으로 데이터를 모아야** 채워집니다.
구조: 캐릭터를 한 번 조회하면 추적 대상으로 등록되고, **매일 0시(UTC)에 Vercel Cron(`/api/collect`)이 자동 조회해 누적**합니다.
며칠 지나면 maplehub처럼 그래프가 생깁니다. (등록 전 과거 데이터는 만들 수 없음 — nexon이 과거를 안 주기 때문)

### 저장소 연결 (한 번만, 무료)
1. Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash (Redis)** 선택 → 무료 플랜
2. 생성 후 **Connect to Project** 누르면 환경변수가 자동 주입됩니다
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
3. **Redeploy** 한 번 → 끝. 이제부터 조회한 캐릭터가 매일 자동 수집됩니다.

> 저장소를 연결하지 않아도 앱은 정상 동작합니다. 다만 자동 수집이 꺼져 있어,
> 경험치 그래프는 "직접 조회할 때마다 1개씩 쌓이는" 로컬 방식으로만 채워집니다.

### 동작 확인
- 수집 강제 실행(테스트): 배포 주소에서 `GET /api/collect` 호출 → `{"ok":true,"collected":N}` 나오면 정상
- 히스토리 확인: `GET /api/history?name=캐릭터명&region=na&reboot=0`

## 참고
- Nexon 랭킹 API는 비공식이라 응답 구조가 바뀌면 `api/_lib.js`의 필드 매핑을 수정해야 할 수 있습니다.
- Vercel Hobby(무료) 플랜의 Cron은 **하루 1회**까지 지원 → 일 1회 수집으로 설정돼 있습니다.
- 무료 플랜으로 길드 공유 규모는 충분합니다.
