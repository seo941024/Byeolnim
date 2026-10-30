/* ═══════════════════════════════════════════════
   클라우드 저장 — 회원가입 / 로그인 / 서버 저장·불러오기

   파일로 주고받던 백업을 서버에 올려두고 아이디로 꺼내 쓰게 한다.
   올리는 내용은 파일 "내보내기"와 같은 묶음이다(settings.js의 backupBundle).

   토큰은 localStorage에 둔다. 6개월 뒤 서버에서 자동 만료된다.
═══════════════════════════════════════════════ */

const CS_TOKEN_KEY = 'gms_cloud_token';
const CS_ID_KEY    = 'gms_cloud_id';

let _csUser = null;      // 로그인된 아이디
let _csNick = null;      // 표시용 닉네임. 안 정했으면 서버가 아이디를 그대로 돌려준다
// 관리자 배지 표시 여부. 서버(ADMIN_IDS)가 판단해서 내려주는 값만 믿는다 — 여기서 정하지 않는다.
let _csAdmin = false;
let _csBusy = false;
let _csMode = 'login';   // 로그아웃 화면에서 'login' | 'signup'
let _csPwOpen = false;   // 로그인 화면에서 비밀번호 변경 폼이 펼쳐져 있는지

function csToken() { return localStorage.getItem(CS_TOKEN_KEY) || ''; }

/* 네트워크가 끊겨도 throw하지 않고 실패 응답으로 돌려준다. 호출하는 쪽이 _csBusy를
   켠 채 기다리므로, 여기서 예외가 나가면 새로고침 전까지 모든 버튼이 막힌다.
   status는 csRefresh가 "토큰 만료(401)"와 "일시적인 서버 오류"를 가리는 데 쓴다. */
async function csApi(action, extra) {
  let r;
  try {
    r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action, token: csToken() }, extra || {})),
    });
  } catch {
    return { ok: false, status: 0, error: '서버에 연결하지 못했습니다' };
  }
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  if (!j) return { ok: false, status: r.status, error: '서버 응답을 읽지 못했습니다' };
  j.status = r.status;
  return j;
}

/* 요청하는 동안 버튼을 busyText로 바꿔 잠그고, 다른 요청도 막는다. 끝나면 원래 글자로 돌린다. */
async function csCall(btnId, busyText, action, extra) {
  _csBusy = true;
  const btn = document.getElementById(btnId);
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = busyText; }
  const j = await csApi(action, extra);
  if (btn) { btn.disabled = false; btn.textContent = label; }
  _csBusy = false;
  return j;
}

/* 서버가 알려 준 로그인 상태를 기억한다 */
function csRemember(j) {
  _csUser = j.id;
  _csNick = j.nickname || j.id;
  _csAdmin = !!j.isAdmin;
}
/* 로그아웃했거나 토큰이 만료됐을 때 */
function csForget() {
  localStorage.removeItem(CS_TOKEN_KEY);
  localStorage.removeItem(CS_ID_KEY);
  _csUser = null;
  _csNick = null;
  _csAdmin = false;
}

function csFmtTime(ms) {
  if (!ms) return '없음';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* 헤더 버튼에 로그인 상태를 반영한다. 닉네임을 정했으면 닉네임, 아니면 아이디가 보인다. */
function csSyncHeader() {
  const btn = document.getElementById('headerBtnAuth');
  if (!btn) return;
  const shown = _csNick || _csUser;
  /* 배지가 붙으므로 textContent 대신 innerHTML — 닉네임은 반드시 이스케이프한다.
     이름은 따로 감싼다. 버튼 폭이 좁아질 때 이름만 줄어들고 배지는 남아야 한다. */
  btn.innerHTML = shown
    ? `${_csAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}<span class="hbtn__name">${escHtml(shown)}</span>`
    : '로그인';
  btn.classList.toggle('hbtn--on', !!_csUser);
  btn.title = _csUser ? `${shown} — 클라우드 저장 열기` : '로그인 / 회원가입';
}

/* ── 화면 그리기 ── */
function csRender(savedAt) {
  csSyncHeader();
  const box = document.getElementById('cloudBox');
  if (!box) return;

  if (!_csUser) {
    const isSignup = _csMode === 'signup';
    box.innerHTML = `
      <div class="cs-tabs">
        <button class="cs-tab${isSignup ? '' : ' sel'}" data-mode="login">로그인</button>
        <button class="cs-tab${isSignup ? ' sel' : ''}" data-mode="signup">회원가입</button>
      </div>
      <div class="cs-row mt8">
        <input class="inp cs-inp" id="csId" placeholder="아이디" maxlength="16" autocomplete="username">
      </div>
      <div class="cs-row mt8">
        <input class="inp cs-inp" id="csPw" type="password" placeholder="비밀번호" maxlength="10"
               autocomplete="${isSignup ? 'new-password' : 'current-password'}">
      </div>
      ${isSignup ? `
      <div class="cs-row mt8">
        <input class="inp cs-inp" id="csPw2" type="password" placeholder="비밀번호 확인" maxlength="10" autocomplete="new-password">
      </div>` : ''}
      <div class="cs-row mt8">
        <button class="sbtn sbtn--primary w100" id="csGoBtn">${isSignup ? '가입하기' : '로그인'}</button>
      </div>
      <p class="dt-help mt8">아이디는 영문·숫자 3~16자이고 대소문자를 구분합니다. 비밀번호는 4~10자입니다.</p>`;

    box.querySelectorAll('.cs-tab').forEach(btn => {
      btn.addEventListener('click', () => { _csMode = btn.dataset.mode; csRender(savedAt); });
    });
    document.getElementById('csGoBtn').addEventListener('click', () => csAuth(isSignup ? 'signup' : 'login'));
    const lastInput = document.getElementById(isSignup ? 'csPw2' : 'csPw');
    lastInput.addEventListener('keydown', e => { if (e.key === 'Enter') csAuth(isSignup ? 'signup' : 'login'); });
    return;
  }

  box.innerHTML = `
    <div class="cs-me">
      <div class="cs-me__body">
        <span class="cs-me__nick">${escHtml(_csNick || _csUser)}</span>
        <span class="cs-me__idsub">@${escHtml(_csUser)}</span>
      </div>
      <button class="sbtn sbtn--ghost sbtn--sm" id="csLogoutBtn">로그아웃</button>
    </div>
    <div class="cs-row mt8">
      <input class="inp cs-inp" id="csNickInp" value="${escHtml(_csNick || _csUser)}" maxlength="12" placeholder="닉네임">
      <button class="sbtn sbtn--ghost" id="csNickSaveBtn">닉네임 저장</button>
    </div>
    <p class="dt-help mt8">한글·영문·숫자·기호로 1~12자까지 정할 수 있고, 우측 위 버튼에 이 이름으로 표시됩니다.</p>
    <div class="sf-res-item"><span class="sf-res-label">마지막 저장</span><span class="sf-res-val" id="csSavedAt">${csFmtTime(savedAt)}</span></div>
    <div class="cs-row mt8">
      <button class="sbtn sbtn--primary" id="csSaveBtn">서버에 저장</button>
      <button class="sbtn sbtn--ghost" id="csLoadBtn">서버에서 불러오기</button>
    </div>
    <p class="dt-help mt8">저장하면 이 기기의 모든 데이터가 서버에 올라가고, 불러오면 이 기기의 데이터를 서버 것으로 덮어씁니다.</p>
    <button class="sbtn sbtn--ghost sbtn--sm mt8" id="csPwToggleBtn">${_csPwOpen ? '비밀번호 변경 닫기' : '비밀번호 변경'}</button>
    ${_csPwOpen ? `
    <div class="cs-pwbox mt8">
      <div class="cs-row"><input class="inp cs-inp" id="csCurPw" type="password" placeholder="현재 비밀번호" maxlength="10" autocomplete="current-password"></div>
      <div class="cs-row mt8"><input class="inp cs-inp" id="csNewPw" type="password" placeholder="새 비밀번호" maxlength="10" autocomplete="new-password"></div>
      <div class="cs-row mt8"><input class="inp cs-inp" id="csNewPw2" type="password" placeholder="새 비밀번호 확인" maxlength="10" autocomplete="new-password"></div>
      <button class="sbtn sbtn--primary w100 mt8" id="csPwSubmitBtn">비밀번호 변경</button>
    </div>` : ''}`;

  document.getElementById('csLogoutBtn').addEventListener('click', csLogout);
  document.getElementById('csNickSaveBtn').addEventListener('click', () => csSetNick(savedAt));
  document.getElementById('csNickInp').addEventListener('keydown', e => { if (e.key === 'Enter') csSetNick(savedAt); });
  document.getElementById('csSaveBtn').addEventListener('click', csSave);
  document.getElementById('csLoadBtn').addEventListener('click', csLoad);
  document.getElementById('csPwToggleBtn').addEventListener('click', () => {
    _csPwOpen = !_csPwOpen;
    csRender(savedAt);
  });
  if (_csPwOpen) {
    document.getElementById('csPwSubmitBtn').addEventListener('click', () => csChangePw(savedAt));
    document.getElementById('csNewPw2').addEventListener('keydown', e => { if (e.key === 'Enter') csChangePw(savedAt); });
  }
}

/* ── 가입 / 로그인 ── */
async function csAuth(action) {
  if (_csBusy) return;
  const id = (document.getElementById('csId').value || '').trim();
  const pw = document.getElementById('csPw').value || '';
  if (!id || !pw) { showToast('아이디와 비밀번호를 입력해주세요.'); return; }

  if (action === 'signup') {
    const pw2 = document.getElementById('csPw2').value || '';
    // 서버까지 안 보내고 여기서 먼저 잡는다 — "잘못 쳤다가 로그인이 안 되는" 억울함은
    // 여기서 미리 걸러야 의미가 있다(서버는 이미 저장된 뒤라 되돌릴 방법이 없다)
    if (pw !== pw2) { showToast('비밀번호가 서로 다릅니다. 다시 확인해주세요.'); return; }
  }

  const j = await csCall('csGoBtn', '처리 중...', action, { id, pw });
  if (!j.ok) { showToast(j.error || '실패했습니다.'); return; }

  localStorage.setItem(CS_TOKEN_KEY, j.token);
  localStorage.setItem(CS_ID_KEY, j.id);
  csRemember(j);
  showToast(action === 'signup' ? '가입 완료! 이제 서버에 저장할 수 있습니다.' : '로그인되었습니다.');
  // 이미 허용해 둔 이 브라우저의 푸시 구독을 방금 로그인한 계정에 연결한다.
  if (typeof bpSync === 'function') bpSync().catch(() => {});
  csRefresh();
}

async function csLogout() {
  await csApi('logout');
  csForget();
  _csPwOpen = false;
  // 이 기기의 푸시 구독을 토큰 없이 다시 올려 계정 연결을 끊는다(댓글 알림이 더 오지 않게)
  if (typeof bpSync === 'function') bpSync().catch(() => {});
  showToast('로그아웃되었습니다.');
  csRender(null);
}

/* ── 비밀번호 변경 ── */
async function csChangePw(savedAt) {
  if (_csBusy) return;
  const curPw = document.getElementById('csCurPw').value || '';
  const newPw = document.getElementById('csNewPw').value || '';
  const newPw2 = document.getElementById('csNewPw2').value || '';
  if (!curPw || !newPw) { showToast('현재 비밀번호와 새 비밀번호를 입력해주세요.'); return; }
  if (newPw !== newPw2) { showToast('새 비밀번호가 서로 다릅니다. 다시 확인해주세요.'); return; }

  const j = await csCall('csPwSubmitBtn', '변경 중...', 'changepw', { curPw, newPw });
  // 실패했을 땐 입력한 걸 지우지 않는다 — 오타 하나 고치려고 세 칸 다시 치게 하는 건 불친절하다
  if (!j.ok) { showToast(j.error || '변경에 실패했습니다.'); return; }
  _csPwOpen = false;
  showToast('비밀번호를 변경했습니다.');
  csRender(savedAt);
}

/* ── 닉네임 변경 ── */
async function csSetNick(savedAt) {
  if (_csBusy) return;
  const nickname = (document.getElementById('csNickInp').value || '').trim();
  if (!nickname) { showToast('닉네임을 입력해주세요.'); return; }
  if (nickname === _csNick) return;   // 안 바뀌었으면 요청할 필요 없다

  const j = await csCall('csNickSaveBtn', '저장 중...', 'setnick', { nickname });
  if (!j.ok) { showToast(j.error || '닉네임 변경에 실패했습니다.'); return; }
  _csNick = j.nickname;
  showToast('닉네임을 저장했습니다.');
  csRender(savedAt);
}

/* ── 저장 / 불러오기 ── */
async function csSave() {
  if (_csBusy) return;
  const j = await csCall('csSaveBtn', '저장 중...', 'save', { data: JSON.stringify(backupBundle()) });
  if (!j.ok) { showToast(j.error || '저장에 실패했습니다.'); return; }
  const el = document.getElementById('csSavedAt');
  if (el) el.textContent = csFmtTime(j.at);
  showToast('서버에 저장했습니다.');
}

function csLoad() {
  if (_csBusy) return;
  /* 덮어쓰기는 되돌릴 수 없으니 먼저 확인받는다 */
  openConfirm('서버에 저장된 데이터로 이 기기의 데이터를 덮어씁니다. 계속할까요?', () => {
    closeConfirm();
    csDoLoad();
  });
}

async function csDoLoad() {
  const j = await csCall('csLoadBtn', '불러오는 중...', 'load');
  if (!j.ok) { showToast(j.error || '불러오기에 실패했습니다.'); return; }
  if (j.data == null) { showToast('서버에 저장된 데이터가 없습니다.'); return; }

  let bundle = null;
  try { bundle = JSON.parse(j.data); } catch { bundle = null; }
  if (!bundle) { showToast('저장된 데이터를 읽지 못했습니다.'); return; }

  applyBackupBundle(bundle);
  showToast('불러오기 완료! 새로고침합니다…');
  setTimeout(() => location.reload(), 600);
}

/* ── 로그인 상태 확인 ── */
async function csRefresh() {
  if (!csToken()) { _csUser = null; csRender(null); return; }
  const j = await csApi('me');
  if (!j.ok) {
    // 서버가 잠깐 안 될 때는 토큰을 그대로 두고, 만료(401)일 때만 조용히 로그아웃 상태로
    if (j.status === 401) csForget();
    csRender(null);
    return;
  }
  csRemember(j);
  csRender(j.savedAt);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('headerBtnAuth');
  const ov = document.getElementById('overlayAuth');
  if (btn && ov) {
    btn.addEventListener('click', () => {
      // 열 때마다 서버에 상태를 다시 물어본다 — 다른 기기에서 저장했을 수 있다
      csRefresh();
      ov.classList.add('open');
    });
    document.getElementById('authClose').addEventListener('click', () => ov.classList.remove('open'));
  }
  if (document.getElementById('cloudBox')) csRefresh();
});
