# Byeolnim.app 작업 인계 문서

다른 컴퓨터(또는 새 Claude Code 세션)에서 이어서 작업할 때 이 파일을 먼저 읽게 하면 됩니다.
"HANDOFF.md 읽고 이어서 작업해줘" 라고 시작하면 됩니다.

## 프로젝트 개요

- **Byeolnim.app** — 한국어 메이플스토리 GMS(북미/유럽 서버) 유틸리티 웹앱
- 저장소: `GMS_Calc` (실제 GitHub 위치는 이동됨 → `github.com/seo941024/Byeolnim.git`. `git push`는 그대로 기존 origin으로 하면 리다이렉트됨)
- 배포: Vercel, `https://byeolnim.vercel.app` (master 브랜치 푸시 시 자동 배포)
- 실제 코드 위치: 레포 루트가 아니라 **`GMS_WEEK_BOSS/`** 서브폴더
- 순수 바닐라 JS — 프레임워크/번들러 없음. `index.html`에 `<script>` 태그로 전역 로드
- 로컬 개발 서버: `GMS_WEEK_BOSS/serve.js` (Node 내장 http 모듈, 포트 3001). `.claude/launch.json`에 등록되어 있어 Claude Code의 Browser 프리뷰 도구로 `preview_start({name:"GMS_WEEK_BOSS"})` 하면 뜸

## 아키텍처 핵심

- **`api/*.js`** — Vercel 서버리스 함수. 넥슨 공식 API를 프록시(브라우저에서 직접 호출하면 CORS 막힘)
  - `lookup.js` — 캐릭터 랭킹 조회 + 추적 등록
  - `history.js` — 캐릭터 EXP 히스토리 조회
  - `collect.js` — Vercel Cron(매일 자정)이 추적 캐릭터 스냅샷 누적
  - `server-status.js`, `maintenance.js` — 넥슨 서버 상태/점검 프록시 (이번 세션에 신규 추가)
  - `_lib.js` — 공통 로직 (`lookupCharacter`, `WORLD_NAMES` 등)
  - **`serve.js`에도 위 API들과 동일한 로직이 중복 구현되어 있음** (로컬 개발용). API 하나 고치면 `serve.js`도 같이 고쳐야 로컬에서 재현됨
- **localStorage** — `STORAGE_KEYS`(data.js)로 캐릭터/헥사/해방 등 상태 저장. 서버는 히스토리/랭킹 캐시용
- **CSS 변수**: `--danger`, `--accent`, `--success`, `--text-sub`, `--border` 등 (style.css 상단 `:root`)
- **모바일 브레이크포인트**: `@media (max-width: 768px)`. 최근 세션에서 `@media (max-width: 920px)`도 추가됨 (아래 참고)

## 이번 세션에서 한 일 (최신 → 과거 순, 커밋 해시 포함)

0. (HANDOFF 작성 이후 추가 작업, 커밋 해시는 `git log` 참고)
   - **미스틱 프론티어 도감 탭 신규 추가** — 사이드바에 "환산주스탯" 바로 위 위치, 아이콘은 사용자가 추가한 `images/icons/Eqp_Roro_the_Familiar_Manager.png`. `mysticfrontier.js` + `sec-mysticfrontier`. 아직 **덱 구성/프론티어 잠재옵션/주사위 계산 로직은 없음** — 패밀리어 192종 검색·타입/속성 필터만 되는 도감 뷰어 수준
   - 캐릭터 목록 nav 아이콘 → `images/icons/835835maple.ico`로 교체 (`.ico`도 `<img>` src로 정상 동작 확인)
   - 서버 상태 nav 아이콘 → 캐릭터 목록이 원래 쓰던 `info.webp`로 이동
   - **패밀리어 아이콘/데이터 192개 전량 확보 완료**: `data_familiars.js`(FAMILIAR_LIST: id/name/level/type/element), `images/familiars/icons/{id}.png` 192개, `images/familiars/type/*.webp` 9개, `images/familiars/elements/*.webp` 6개. 전부 MapleHub CDN에서 직접 다운로드(npc_id는 MapleHub "Select Familiar" 다이얼로그 DOM에서 추출)
   - **서버 상태에 채널별 세부 보기 추가** — MapleHub처럼 월드 카드에서 "채널 상세 보기"를 누르면 1~N번 채널이 개별 정상/다운 배지로 펼쳐짐. 넥슨 API의 `GameNN`(0-index) 키를 채널 번호(NN+1)로 변환. `api/server-status.js`/`serve.js`의 `summarizeWorld`에 `channelList` 추가
   - 보스 난이도 pill "EXTREME" 잘림 버그 — 처음엔 ellipsis 안전망만 추가했으나(부적절한 미봉책이라는 지적을 받음), 재조사 끝에 **진짜 원인**을 찾음: 기본 폰트 '고딕'이 실제로는 `font/ONE_Mobile_Title.ttf`(장식용 타이틀 폰트)라 일반 UI 폰트보다 훨씬 넓게 렌더링됨. `.boss-diff-pill .dpill__t`에 `font-family:'Segoe UI','Malgun Gothic',sans-serif`로 고정해 사용자가 어떤 폰트(고딕/Maple/8bit)를 고르든 pill만은 영향받지 않게 함 + 박스도 80px로 확대
1. `8cc8a5f` 보스 난이도 pill(HARD/CHAOS/EXTREME 등) 텍스트가 알약 밖으로 튀어나오는 문제 — `overflow:hidden` + `ellipsis` 안전망 추가
2. `b515300` 사이드바 캐릭터 카드 — 긴 직업명("Arch Mage (Ice, Lightning)") 줄바꿈 재발 방지. 사이드바 300→340px, 일러스트 108→84px로 여유 대폭 확대. 그 여파로 769~920px 폭에서 해방계산기/스타포스 2열 레이아웃이 40px로 짜부라지는 버그가 새로 생겨서 `@media (max-width:920px)`로 1열 전환 브레이크포인트 추가
3. `be93fc1` **서버 상태 페이지 신규 추가** (MapleHub 대비 마지막 기능 격차 해소). 넥슨 공식 `no-auth/v1/server-status`, `no-auth/v1/maintenance/10100` API를 실측해서 프록시. 이 과정에서 **`WORLD_NAMES`의 Hyperion(46)/Solis(70) worldId가 뒤바뀌어 있던 버그 발견 및 수정** (`api/_lib.js`, `serve.js`)
4. `7177bb0` 초광폭 화면(2560px+)에서 캐릭터 카드 일러스트가 무한정 커지던 것에 240px 상한
5. `1906406` 에렐 라이트 헥사 노드 구조 수정 — 스킬 1→2개, 마스터리 2→3개(사용자가 실제 아이콘 파일로 검증)
6. `3fe8d6d` 시아 아스텔/에렐 라이트 헥사 스킬 아이콘을 maplestorywiki.net 원본과 대조해 정확히 매칭 (기존에 완전히 잘못된 아이콘/표 스크린샷이 들어가 있었음)
7. `e4d2492` ~ `da4aec6` 등 — 캐릭터 카드 반응형 스윕 (모달, 초광폭, 큐브/스타포스 결과 렌더링 등 4단계로 나눠 진행)

**이번 세션에서 반복적으로 잡은 버그 패턴**: CSS Grid/Flex에서 `1fr` 트랙이나 `flex:1` 아이템은 기본 최소 크기가 콘텐츠 기준(`auto`)이라, 특정 폭에서 형제 요소가 크면 다른 쪽이 그 미만으로 안 줄어들고 그리드/카드 밖으로 넘치거나 텍스트가 잘림. 해결은 거의 항상 `minmax(0, 1fr)` 또는 명시적 `min-width:0`. 앞으로 비슷한 잘림/오버플로 버그를 보면 이 패턴부터 의심할 것.

## 미해결 / 확인 필요한 것

### 1. 에렐 라이트 "Radiant Spear" 한글명 미확정
`data_hexa.js`의 `Erel Light.skill[1]`이 `'레디언트 스피어'`로 되어 있는데, 이건 확인된 공식 한글명이 아니라 기존 노드들의 음역 관례를 따라 임시로 붙인 이름. 사용자가 인게임/공식 패치노트에서 정확한 한글명을 확인하면 그 값만 바꾸면 됨.

### 2. 미스틱 프론티어(Mystic Frontier) — 도감까지만 완료, 계산 로직은 미착수
이미지·데이터 192종 전부 확보 완료 + 사이드바 탭도 만들어서 검색/필터 가능한 도감으로 노출 중 (`mysticfrontier.js`, `sec-mysticfrontier`, `data_familiars.js`).

**아직 없는 것 — 여기부터 이어서 하면 됨**:
- 덱 구성 UI (덱 1~3, 슬롯당 패밀리어 3마리 선택)
- 프론티어 잠재옵션 시스템 (MapleHub에서 "SELECT FRONTIER POTENTIAL..." 드롭다운으로 봤던 것 — 정확한 옵션 목록/효과는 미조사)
- 원정 주사위 굴림 계산 로직 (덱 조합에 따른 다이스 합계 계산 — MapleHub UI에서 "EXPEDITION DICE SIMULATION", "DICE TOTAL" 값 확인은 했으나 계산식은 역산 안 함)
- 참고용 데이터는 다 있음: `FAMILIAR_LIST`(192종, id/name/level/type/element), 아이콘 전부(`images/familiars/icons/{id}.png`), 타입·속성 배지(`images/familiars/type/`, `images/familiars/elements/`)

### 3. 다른 신규 기능 후보 (사용자가 "잠시 보류" 표명)
- 일/주/월 숙제 트래커 — 기존 캐릭터/보스 데이터 재활용 가능해서 가장 쉬움. **우선순위 1순위로 추천**했었음
- 마이 다이어리 — `api/history.js` + Upstash Redis가 이미 절반 깔려 있어서 백엔드 확장이 수월함

### 4. (참고, 버그 아님) 초광폭 화면에서 카드가 여전히 큼
2번 항목 240px 상한은 "일러스트"에만 걸었음. 카드 전체 크기는 화면이 넓을수록 계속 커지는 게 의도된 동작("2열 그리드가 창 너비를 채운다")이라 그대로 둠. 문제 삼지 않았음.

## 작업 방식 관련 메모 (사용자 스타일)

- **실제로 브라우저 띄워서 재보고 나서 수정 사항을 보고할 것.** 코드만 읽고 "이럴 것이다"라고 추측성 보고하면 안 됨 — 이 프로젝트에서 발견된 버그 대부분이 "코드는 멀쩡해 보이는데 실제 렌더링에서만 드러나는" 유형(CSS 명세도 충돌, flex/grid 최소크기 함정, 폰트 렌더링差)이었음
- 커밋 메시지에 **원인 분석과 검증한 폭/케이스를 구체적으로 적는 스타일**을 유지해온 것으로 보임 — 이어서 작업할 때도 이 톤을 유지
- 사용자는 위키/외부 사이트 스크래핑에 대해 "다른 사이트도 결국 넥슨 리소스 사본일 뿐"이라는 논리에 납득하는 편. 저작권 관련해서 과도하게 선을 긋지 않아도 됨(다만 이 정도의 판단은 매번 상황 보고 다시 하는 게 안전)
- 로컬 프리뷰 서버 재시작이 필요한 경우: `serve.js`를 고쳤을 때만 재시작 필요(정적 파일 CSS/HTML/JS는 재시작 없이 바로 반영됨)
