/* =============================================
   settings.js — 설정 창
   백업 내보내기·불러오기, 전체 초기화, 글자 크기·글꼴·테마, 관리자 알림 발송.
   app.js 바로 뒤에 읽힌다. 백업 묶음 함수는 cloudsave.js의 서버 저장도 같이 쓴다.
   ============================================= */

/* ── 설정 모달 ── */
const FONT_KEY = STORAGE_KEYS.font;
const overlaySettings = document.getElementById('overlaySettings');
['sbBtnSettings', 'headerBtnSettings'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => overlaySettings.classList.add('open'));
});
document.getElementById('settingsClose').addEventListener('click', () => overlaySettings.classList.remove('open'));

/* ── 내보내기 / 불러오기 ──
   보스/캐릭(state)뿐 아니라 해방·헥사·폰트 등 모든 localStorage 키를 함께 백업.

   파일 안에 표시를 넣어두는 이유: 아무 JSON이나 읽어서 통째로 state에 넣어버리면
   데이터가 깨진다. 우리가 만든 파일인지 먼저 확인하고 아니면 거부한다. */
const BACKUP_MARK = '_byeolnim';
/* 이 기기에만 의미가 있는 값이라 파일 백업·클라우드 저장에 넣지도, 되살리지도 않는다.
   로그인 토큰이 파일에 들어가면 파일을 받은 사람이 그 계정으로 로그인되고,
   알림 켜짐 표시는 구독이 없는 다른 기기에서 켜진 것처럼 보이게 된다. */
const BACKUP_SKIP_KEYS = new Set(['gms_cloud_token', 'gms_cloud_id', 'boss_push_enabled', 'pwa_installed']);

/* 지금 브라우저에 있는 모든 데이터를 한 덩어리로. 파일 백업과 서버 저장이 같은 모양을 쓴다. */
function backupBundle() {
  const extra = {};
  // 모든 localStorage 키 백업 (캐릭터별 헥사 hx_*_<id> 등 포함)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k === STORAGE_KEYS.boss) continue; // state로 따로 저장
    if (BACKUP_SKIP_KEYS.has(k)) continue;
    extra[k] = localStorage.getItem(k);
  }
  return { [BACKUP_MARK]: 1, state, extra };
}
/* 받아온 묶음을 브라우저에 되살린다. 되살린 뒤에는 부르는 쪽이 새로고침한다. */
function applyBackupBundle(bundle) {
  if (bundle.state) { state = bundle.state; save(); }
  Object.entries(bundle.extra || {}).forEach(([k, v]) => {
    if (typeof v === 'string' && !BACKUP_SKIP_KEYS.has(k)) localStorage.setItem(k, v);
  });
}

document.getElementById('btnExport').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backupBundle(),null,2)],{type:'application/json'}));
  a.download = `byeolnim_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      // 우리 파일이 아니면 여기서 멈춘다 — 통째로 state에 넣으면 데이터가 깨진다.
      if (!data || !data[BACKUP_MARK]) {
        showToast('별님앱 백업 파일이 아닙니다.');
        return;
      }
      /* 덮어쓰기 전에 속을 먼저 살펴본다. 넣다가 중간에 잘못되면 원래 데이터도 없고
         새 데이터도 온전치 않은 상태로 남아서, 이상하면 아예 시작을 안 하는 게 낫다. */
      const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
      const st = data.state, ex = data.extra;
      if (!isObj(st) || !Array.isArray(st.chars) || (ex !== undefined && !isObj(ex))) {
        showToast('백업 파일이 손상된 것 같습니다.');
        return;
      }
      applyBackupBundle(data);
      showToast('불러오기 완료! 새로고침합니다…');
      setTimeout(() => location.reload(), 600);
    } catch { showToast('파일 형식이 올바르지 않습니다.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ── 관리자 — 전체 알림 발송 ──
   비밀번호를 앱 안에서 대조하지 않는다. 클라이언트 코드는 누구나 열어볼 수 있어
   거기 적힌 비밀번호는 이미 비밀이 아니고, 검사 자체도 우회할 수 있기 때문.
   대신 입력한 값을 그대로 서버로 보내 서버가 판단한다(api/push-broadcast).
   비밀번호가 틀리면 서버가 거부하므로 관리자탭이 열려 있어도 발송되지 않는다. */
/* 예전엔 ?admin=1 로만 항목을 드러냈는데, 한 번 들어오면 기기에 기억돼서 그냥
   주소로 들어와도 계속 보였다(= 숨기는 의미가 없었다). 지금은 비밀번호로 로그인해야
   실제 기능이 드러나므로, 항목 자체는 그냥 두고 로그인으로 막는다. */
const overlayAdmin = document.getElementById('overlayAdmin');

/* 로그인에 성공한 비밀번호를 이 모달이 열려 있는 동안만 들고 있는다.
   저장하지 않으므로 닫으면 다시 로그인해야 한다. */
let _admSecret = null;

function admSetLoggedIn(on) {
  if (!on) _admSecret = null;
  const show = (id, v) => { document.getElementById(id).style.display = v ? '' : 'none'; };
  show('admLoginStep', !on);
  show('admWorkStep', on);
  show('admBtnLogin', !on);
  show('admBtnCheck', on);
  show('admBtnSend', on);
}

/* ok: true 성공, false 실패, 생략하면 진행 중 */
function admSay(msg, ok) {
  const resEl = document.getElementById('admResult');
  resEl.textContent = msg;
  resEl.className = 'adm-result' + (ok === true ? ' is-ok' : ok === false ? ' is-err' : '');
}
async function admPost(url, secret, payload) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => null);
  return { r, j };
}
/* 서버가 거절했을 때 보여줄 문구 */
function admFailMsg(r, j) {
  return r.status === 401 ? '비밀번호가 맞지 않습니다.' : ((j && j.error) || `요청 실패 (${r.status})`);
}

document.getElementById('btnAdmin')?.addEventListener('click', () => {
  overlaySettings.classList.remove('open');
  // 열 때마다 로그아웃 상태에서 시작한다
  document.getElementById('admSecret').value = '';
  document.getElementById('admResult').textContent = '';
  admSetLoggedIn(false);
  overlayAdmin.classList.add('open');
});

/* 로그인 — 비밀번호가 맞는지는 서버만 알 수 있으므로, 아무것도 보내지 않는
   dryRun 요청으로 확인한다(대상 수만 세고 발송은 안 한다). 401이면 거부. */
document.getElementById('admBtnLogin')?.addEventListener('click', async () => {
  const secret = document.getElementById('admSecret').value.trim();
  if (!secret) { admSay('비밀번호를 입력하세요.', false); return; }

  const btn = document.getElementById('admBtnLogin');
  btn.disabled = true;
  admSay('확인 중…');
  try {
    const { r, j } = await admPost('/api/push-broadcast', secret, { title: '로그인 확인', dryRun: true });
    if (!r.ok || !j || !j.ok) { admSay(admFailMsg(r, j), false); return; }
    _admSecret = secret;
    admSetLoggedIn(true);
    admSay(`로그인됨 · 받을 사람 ${j.targets}명` + (j.skipped ? ` (제외 ${j.skipped})` : ''), true);
  } catch (e) {
    admSay('요청 실패: ' + (e && e.message || e), false);
  } finally {
    btn.disabled = false;
  }
});
document.getElementById('adminClose')?.addEventListener('click', () => overlayAdmin.classList.remove('open'));
/* 바깥을 클릭해도 닫지 않는다 — 알림 문구를 길게 쓰다가 실수로 바깥을 누르면
   작성하던 내용이 통째로 날아간다. 닫기(×)로만 닫게 한다. */

async function admSend(dryRun) {
  const secret = _admSecret;   // 로그인할 때 확인된 비밀번호만 쓴다
  const title  = document.getElementById('admTitle').value.trim();
  const body   = document.getElementById('admBody').value.trim();

  if (!secret) { admSay('비밀번호를 입력하세요.', false); return; }
  if (!title)  { admSay('제목을 입력하세요.', false); return; }
  // 전체 발송은 되돌릴 수 없으므로 한 번 더 묻는다
  if (!dryRun && !confirm(`"${title}"\n\n알림을 켠 전원에게 지금 보냅니다. 취소할 수 없습니다.`)) return;

  const btnC = document.getElementById('admBtnCheck');
  const btnS = document.getElementById('admBtnSend');
  btnC.disabled = btnS.disabled = true;
  admSay(dryRun ? '확인 중…' : '발송 중…');

  try {
    const { r, j } = await admPost('/api/push-broadcast', secret, { title, body, url: '/', dryRun });
    if (!r.ok || !j || !j.ok) {
      admSay(admFailMsg(r, j), false);
    } else if (dryRun) {
      admSay(`받을 사람 ${j.targets}명` + (j.skipped ? ` (제외 ${j.skipped})` : ''), true);
    } else {
      admSay(`발송 완료 · 성공 ${j.sent} / 실패 ${j.failed}`
          + (j.pruned ? ` / 만료 정리 ${j.pruned}` : '')
          + (j.skipped ? ` / 제외 ${j.skipped}` : ''), true);
    }
  } catch (e) {
    admSay('요청 실패: ' + (e && e.message || e), false);
  } finally {
    btnC.disabled = btnS.disabled = false;
  }
}
document.getElementById('admBtnCheck')?.addEventListener('click', () => admSend(true));
document.getElementById('admBtnSend')?.addEventListener('click', () => admSend(false));

/* 구독 목록 비우기 — 예전 주소로 설치한 기기까지 확실히 끊어내는 유일한 방법이다.
   저장된 구독에는 출처가 없어 골라낼 수 없기 때문(이제부터 구독하는 것만 기록된다). */
document.getElementById('admBtnPurge')?.addEventListener('click', async () => {
  const secret = _admSecret;   // 로그인할 때 확인된 비밀번호만 쓴다
  if (!secret) { admSay('비밀번호를 입력하세요.', false); return; }
  if (!confirm('저장된 구독을 모두 지웁니다.\n\n지운 뒤에는 모두가 알림을 다시 켜야 합니다. 되돌릴 수 없습니다.')) return;

  const btn = document.getElementById('admBtnPurge');
  btn.disabled = true;
  admSay('삭제 중…');
  try {
    const { r, j } = await admPost('/api/push-purge', secret, { confirm: true });
    if (!r.ok || !j || !j.ok) {
      admSay(admFailMsg(r, j), false);
    } else {
      admSay(`구독 ${j.removed}개를 지웠습니다. 모두 알림을 다시 켜야 합니다.`, true);
    }
  } catch (e) {
    admSay('요청 실패: ' + (e && e.message || e), false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btnResetAll').addEventListener('click', () => {
  openConfirm('모든 데이터를 초기화하시겠습니까? 되돌릴 수 없습니다.', () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    // 헥사는 캐릭터별 키(hx_skill_<id> 등), 코디 시뮬레이터는 자기 키에 따로 저장한다
    const hxPrefixes = HEXA_KEY_BASES.map(b => b + '_');
    Object.keys(localStorage).filter(k => hxPrefixes.some(p => k.startsWith(p))).forEach(k => localStorage.removeItem(k));
    if (typeof MX_STORE !== 'undefined') localStorage.removeItem(MX_STORE);
    location.reload();
  });
});

/* 글자 크기 기준값(rem의 기준). 거의 모든 크기가 rem이라 여기만 올리면 전체가 같이 커진다.
   PC에서 글씨가 작다는 피드백에 데스크톱만 +3px까지 올렸다가, 이번엔 너무 커졌다는
   지적을 받아 +1px로 낮춘다(사이드바 메뉴 글씨가 특히 커 보였다).
   '고딕'(ONE_Mobile_Title)은 원래 폭이 넓게 렌더링돼 15px로 낮춰뒀던 값이라 그 차이는 유지. */
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');
function rootFontPx() {
  const base = document.body.dataset.font === '고딕' ? 15 : 16;
  return MOBILE_MQ.matches ? base : base + 1;
}
function applyRootFontSize() {
  document.documentElement.style.fontSize = rootFontPx() + 'px';
}
// resize 이벤트만 보면 창 크기 변경을 놓치는 경우가 있어 미디어쿼리 변화도 같이 구독
MOBILE_MQ.addEventListener('change', applyRootFontSize);
window.addEventListener('resize', applyRootFontSize);

function applyFont(name) {
  document.body.style.fontFamily = `'${name}', 'Segoe UI', 'Malgun Gothic', sans-serif`;
  document.body.dataset.font = name;
  applyRootFontSize();
  localStorage.setItem(FONT_KEY, name);
  document.querySelectorAll('.settings-font-btns [data-font]').forEach(b => {
    b.classList.toggle('sbtn--primary', b.dataset.font === name);
  });
}

document.querySelectorAll('.settings-font-btns [data-font]').forEach(btn => {
  btn.addEventListener('click', () => applyFont(btn.dataset.font));
});

/* ── 테마 ──
   색은 대부분 :root의 CSS 변수를 거쳐 쓰이므로, html에 data-theme만 걸면
   style.css의 :root[data-theme="light"] 블록이 변수를 갈아끼운다. */
const THEME_KEY = STORAGE_KEYS.theme;
function applyTheme(name) {
  const t = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.classList.toggle('theme-toggle--light', t === 'light');
    btn.setAttribute('aria-pressed', t === 'light');
  }
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = t === 'light' ? '화이트 모드' : '다크 모드';
  // 설정 모달의 테마 버튼도 같은 상태를 보여줘야 한다(헤더 토글은 모바일에서 숨겨진다)
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.classList.toggle('sbtn--primary', b.dataset.themeSet === t);
  });
}
document.getElementById('themeToggle')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});
// 모바일은 헤더 폭이 모자라 토글을 숨기므로 설정에서 고른다
document.querySelectorAll('[data-theme-set]').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet));
});

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
applyFont(localStorage.getItem(FONT_KEY) || '고딕');
