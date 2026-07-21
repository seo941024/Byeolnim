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

### 2. 미스틱 프론티어(Mystic Frontier) 계산기 — 아직 미착수
MapleHub에는 있고 우리는 없는 기능. 조사 결과:
- 실제로는 "타입"이 아니라 **개별 패밀리어 192마리** 중 하나를 선택하는 시스템 (`Select Familiar — 192 Found`)
- 공용 배지: 타입 9종(human/beast/plant/aquatic/fairy/reptile/devil/undead/machine) + 속성 6종(fire/poison/light/ice/dark/holy) = 15개 아이콘, MapleHub CDN `familiars/type/{name}.webp`, `familiars/elements/{name}.webp`
- 개별 패밀리어 아이콘: MapleHub CDN `https://maplehub.app/familiars/images/{npc_id}.png` (예: 9961485.png). npc_id 192개는 MapleHub의 "Select Familiar" 검색 다이얼로그 DOM에서 전부 뽑아낼 수 있음(스크롤 없이 한 번에 로드됨)
- 사용자와 논의 결과: MapleHub CDN에서 직접 다운로드하는 것으로 방향은 정했음(이미지 자체가 넥슨 게임 리소스라 원저작자가 아니라는 점에서 우리가 이미 해온 maplestorywiki 스크래핑과 같은 성격). **아직 실제로 192개를 다운로드하지는 않음** — 사용자가 "1차 종료"를 선언해서 여기서 멈춤
- 다음에 이어서 할 일: (1) 공용 배지 15개 먼저 다운로드, (2) `[role="dialog"]` 안의 `img[src*="/familiars/images/"]`를 전부 순회해서 192개 npc_id 목록 확보, (3) 각 파일 다운로드, (4) 프론티어 잠재옵션/주사위 계산 로직은 MapleHub UI를 참고해 별도 설계 필요 (아직 설계 안 함)

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
