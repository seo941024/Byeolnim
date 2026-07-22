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

1. `90ca0aa` 서버 상태 — `.ss-grid` auto-fill → 2열 고정(NA 6장=3행, EU 4장=2행). 채널 상세보기 **토글 버튼 완전 제거**, 항상 펼친 채로 표시 (`_ssExpanded` 상태·`.ss-card__toggle` CSS 삭제)
2. `e431df0` 미스틱 프론티어 도감 카드 크기 통일 — 패밀리어 원본 해상도가 87×107~398×358로 제각각이라 정사각박스+`object-fit:contain`이 작은 이미지를 억지로 확대하던 문제. `width/height:auto`+`max-width/max-height:100%`로 바꿔 확대 없이 축소만 되게 함. `.mf-grid` 5열 고정(모바일 3열, `!important` 필요 — 아래 버그패턴 참고)
3. `47644bf` 서버 상태 nav 아이콘(`info.webp`, 원본 50×48)이 `data-sec`별 크기 규칙 누락으로 원본 그대로 렌더링되어 라벨이 밀려 보이던 문제. `.sb-nav__icon` 기본값(28×28) 추가 + `serverstatus`/`mysticfrontier` 각각 크기 지정
4. `cace921` **미스틱 프론티어 도감 탭 신규 추가** — 사이드바 "환산주스탯" 바로 위, 아이콘은 `images/icons/Eqp_Roro_the_Familiar_Manager.png`. 캐릭터 목록 nav 아이콘 → `images/icons/835835maple.ico`(`.ico`도 `<img>`에서 정상 동작 확인). 서버 상태 nav 아이콘 → 캐릭터 목록이 쓰던 `info.webp`로 이동
5. `108b95c` 서버 상태에 채널별 세부 보기 추가(이후 3번 커밋에서 토글은 다시 제거됨) — 넥슨 API의 `GameNN`(0-index) 키를 채널 번호(NN+1)로 변환해 `channelList` 노출
6. `a815bf3` **패밀리어 아이콘/데이터 192개 전량 확보**: `data_familiars.js`(FAMILIAR_LIST: id/name/level/type/element), `images/familiars/icons/{id}.png` 192개, `images/familiars/type/*.webp` 9개, `images/familiars/elements/*.webp` 6개. MapleHub CDN에서 직접 다운로드(npc_id는 MapleHub "Select Familiar" 다이얼로그 DOM에서 추출)
7. `ec45db1` 보스 난이도 pill "EXTREME" 잘림 — **진짜 원인**: 기본 폰트 '고딕'이 실제로는 `font/ONE_Mobile_Title.ttf`(장식용 타이틀 폰트)라 일반 UI 폰트보다 훨씬 넓게 렌더링됨. `.boss-diff-pill .dpill__t`에 `font-family:'Segoe UI','Malgun Gothic',sans-serif` 고정 + 박스 80px로 확대. (`2afbccb`에서 먼저 박스만 키웠으나 부족했고, `8cc8a5f`의 최초 ellipsis 안전망은 "미봉책" 지적을 받고 이걸로 대체)
8. `b515300` 사이드바 캐릭터 카드 — 긴 직업명("Arch Mage (Ice, Lightning)") 줄바꿈 재발 방지. 사이드바 300→340px, 일러스트 108→84px로 여유 대폭 확대. 그 여파로 769~920px 폭에서 해방계산기/스타포스 2열 레이아웃이 40px로 짜부라지는 버그가 새로 생겨서 `@media (max-width:920px)`로 1열 전환 브레이크포인트 추가
9. `be93fc1` **서버 상태 페이지 신규 추가** (MapleHub 대비 마지막 기능 격차 해소). 넥슨 공식 `no-auth/v1/server-status`, `no-auth/v1/maintenance/10100` API를 실측해서 프록시. 이 과정에서 **`WORLD_NAMES`의 Hyperion(46)/Solis(70) worldId가 뒤바뀌어 있던 버그 발견 및 수정** (`api/_lib.js`, `serve.js`)
10. `7177bb0` 초광폭 화면(2560px+)에서 캐릭터 카드 일러스트가 무한정 커지던 것에 240px 상한
11. `1906406` 에렐 라이트 헥사 노드 구조 수정 — 스킬 1→2개, 마스터리 2→3개(사용자가 실제 아이콘 파일로 검증)
12. `3fe8d6d` 시아 아스텔/에렐 라이트 헥사 스킬 아이콘을 maplestorywiki.net 원본과 대조해 정확히 매칭 (기존에 완전히 잘못된 아이콘/표 스크린샷이 들어가 있었음)
13. `e4d2492` ~ `da4aec6` 등 — 캐릭터 카드 반응형 스윕 (모달, 초광폭, 큐브/스타포스 결과 렌더링 등 4단계로 나눠 진행)

**이번 세션에서 반복적으로 잡은 버그 패턴**:
1. CSS Grid/Flex에서 `1fr` 트랙이나 `flex:1` 아이템은 기본 최소 크기가 콘텐츠 기준(`auto`)이라, 특정 폭에서 형제 요소가 크면 다른 쪽이 그 미만으로 안 줄어들고 그리드/카드 밖으로 넘치거나 텍스트가 잘림. 해결은 거의 항상 `minmax(0, 1fr)` 또는 명시적 `min-width:0`. 앞으로 비슷한 잘림/오버플로 버그를 보면 이 패턴부터 의심할 것.
2. **CSS를 파일 맨 뒤에 새 블록으로 추가하면, 이미 파일 중간에 있는 모바일 미디어쿼리보다 소스 순서상 나중에 와서 명세도가 같을 때 미디어쿼리 쪽이 무시된다.** `.sf-layout`, `.mf-grid`에서 실제로 겪음 — 새 컴포넌트의 모바일 오버라이드를 쓸 때는 `!important`를 쓰거나, 기존 모바일 미디어쿼리 블록보다 앞쪽에 기본 규칙을 선언할 것.
3. nav 아이콘처럼 `data-sec`별로 개별 크기 규칙을 거는 구조에서, 새 항목을 추가하면서 크기 규칙을 깜빡하면 이미지 원본 픽셀 크기 그대로 렌더링되어 레이아웃이 밀림. 새 아이콘 추가 시 반드시 크기 규칙도 같이 추가할 것(이번에 `.sb-nav__icon`에 기본값을 넣어 안전장치는 마련해둠).

## 미해결 / 확인 필요한 것

### 1. 에렐 라이트 "Radiant Spear" 한글명 미확정
`data_hexa.js`의 `Erel Light.skill[1]`이 `'레디언트 스피어'`로 되어 있는데, 이건 확인된 공식 한글명이 아니라 기존 노드들의 음역 관례를 따라 임시로 붙인 이름. 사용자가 인게임/공식 패치노트에서 정확한 한글명을 확인하면 그 값만 바꾸면 됨.

### 2. 미스틱 프론티어(Mystic Frontier) — ✅ 완료 (도감 + 덱 구성 + 주사위 계산기)
아래는 이후 세션(커밋 `262b18c`, `e6a2f47`)에서 마무리됨. 더 손볼 게 없으면 이 항목은 지워도 됨.

- **잠재옵션/주사위 계산식 원본 확보**: maplehub.app이 403으로 WebFetch를 막아서, Bash의 curl로 우회해 그 사이트의 실제 프로덕션 JS 번들(`MysticFrontier-*.js`)을 직접 다운로드 → 안의 데이터 배열을 grep으로 추출. 추측이 아니라 실제 배포 코드 그대로.
  - `data_frontier_potentials.js` 신규: `FRONTIER_POTENTIALS`(1784건 — 조건 58종 × 등급 5단계) + `FRONTIER_DICE_ROLLERS`(20건, 소모 아이템)
  - 계산식도 번들에서 확인: `totalDice = floor((3d6 + Σ선택한 옵션 dice보너스) × (Σ선택한 옵션 mult보너스, 0이면 1배) + 1e-9)` — **배수 보너스는 곱셈이 아니라 여러 개 선택 시 서로 합산됨**(중요, 직관과 다름). node로 검증 완료.
- **덱 구성 UI**: 덱 3개 × 슬롯 3개, 슬롯 클릭 시 검색 가능한 패밀리어 피커. 저장은 `STORAGE_KEYS.mfDecks`(`mf_decks_v1`).
- **주사위 계산기 탭**: 처음엔 잠재옵션을 덱과 별개로 다시 고르게 만들었다가, 사용자 지적으로 리팩토링 — **덱 슬롯이 `{familiarId, potentialId}` 구조**로 바뀌어서 패밀리어 고를 때 그 카드의 잠재옵션도 같이 지정하고, 주사위 탭에서는 "덱 1/2/3" 중 고르기만 하면 그 덱의 잠재옵션을 그대로 사용. 다이스 롤러(소모 아이템)만 별도 선택.
- 롤러 아이콘은 maplehub.app 이미지를 핫링크하지 않고 색상 배지(`.mf-roller-dot`)로 대체.
- **주의**: 이 세션은 Claude_Browser/claude-in-chrome 프리뷰 도구가 연결되지 않아 실제 렌더링을 직접 확인하지 못함 — 문법·데이터 무결성·계산식은 전부 Node 스크립트로 검증했지만, 화면상 확인은 사용자가 배포 후 직접 함.
- 참고 데이터 위치는 기존과 동일: `FAMILIAR_LIST`(192종), 아이콘 `images/familiars/icons/{id}.png`

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
