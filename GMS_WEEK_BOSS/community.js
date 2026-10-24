/* ═══════════════════════════════════════════════
   커뮤니티 — 글쓰기 / 목록 / 글 보기 / 댓글

   서버: api/community.js (글·댓글·사진 업로드 전부 이 파일 하나 — Vercel Hobby
   플랜의 서버리스 함수 12개 제한 때문에 action:'upload'로 합쳐져 있다)
   로그인은 cloudsave.js가 관리하는 토큰(localStorage: gms_cloud_token)을 그대로 쓴다.
   목록·읽기는 로그인 없이 되고, 글·댓글 쓰기는 로그인해야 한다.

   화면은 세 가지뿐이고 _cmView로 갈아 끼운다:
     list  — 글 목록
     write — 글쓰기
     post  — 글 하나 + 댓글
═══════════════════════════════════════════════ */

const CM_IMAGES_MAX = 10;
const CM_IMG_MAX_BYTES = 3 * 1024 * 1024;   // api/community.js의 UPLOAD_MAX_BYTES와 같게

let _cmView = 'list';
let _cmPostId = null;
let _cmPosts = [];
let _cmPage = 1;        // 지금 보고 있는 페이지 — 글 봤다가 목록으로 돌아오면 이 페이지 그대로 보여준다
let _cmTotalPages = 1;
let _cmBusy = false;
let _cmEditor = null;
let _cmReplyTo = null;   // 답글 대상 댓글 id. 깊이 제한 없이 계속 이어서 달 수 있다.
let _cmEditPostId = null; // null이면 새 글쓰기, id가 있으면 그 글을 수정하는 중
let _cmEditPost = null;   // 수정 중인 글의 원본 데이터(제목·본문 미리 채우기용)

// 기본 Quill 색 포맷은 style="color: ..."를 만든다. 서버는 style을 전혀
// 허용하지 않으므로, 세 가지 고정 색상만 class로 기록하는 포맷으로 교체한다.
const CM_COLOR_CLASS = Quill.import('attributors/class/color');
Quill.register(CM_COLOR_CLASS, true);

function cmEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}

function cmToken() { return localStorage.getItem('gms_cloud_token') || ''; }
function cmLoggedIn() { return !!cmToken(); }

/* 관리자는 남의 글·댓글도 지울 수 있다. 실제 판단은 서버(ADMIN_IDS)가 하고,
   여기서는 버튼을 보여줄지만 정한다 — 이 값을 위조해도 서버에서 막힌다.
   _csAdmin은 cloudsave.js가 로그인 응답의 isAdmin으로 채워 둔 전역이다. */
function cmIsAdmin() { return typeof _csAdmin !== 'undefined' && _csAdmin === true; }
function cmCanDelete(authorId) {
  if (!cmLoggedIn()) return false;
  return authorId === (localStorage.getItem('gms_cloud_id') || '') || cmIsAdmin();
}
/* 수정은 삭제와 달리 작성자 본인만 — 관리자도 남의 글 내용은 못 바꾼다(서버와 동일 규칙) */
function cmCanEdit(authorId) {
  return cmLoggedIn() && authorId === (localStorage.getItem('gms_cloud_id') || '');
}

async function cmApi(action, extra) {
  // 네트워크가 끊겨도 throw하지 않는다 — 호출하는 쪽이 _cmBusy를 켠 채 기다린다
  let r;
  try {
    r = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action, token: cmToken() }, extra || {})),
    });
  } catch {
    return { ok: false, error: '서버에 연결하지 못했습니다' };
  }
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  return j || { ok: false, error: '서버 응답을 읽지 못했습니다' };
}

/* 방금 전 / n분 전 / 날짜 — 목록에서 시간을 한눈에 보게 */
function cmFmtTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return '방금 전';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + '분 전';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + '시간 전';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}.`;
}

/* ── 대표 캐릭터 팝업 — 글·댓글의 닉네임을 누르면 뜬다.
   dailytasks.js의 오버레이 준비 패턴(_dtEnsureOverlay)과 같은 방식으로,
   처음 한 번만 오버레이 껍데기를 만들고 다음부터는 안쪽만 새로 그린다. */
function cmEnsureRepOverlay() {
  let ov = document.getElementById('cmRepOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'cmRepOverlay';
    ov.className = 'overlay';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
  }
  return ov;
}

function cmShowRepChar(nick, repChar) {
  const ov = cmEnsureRepOverlay();
  // 세로형 카드 — 사이드바 캐릭터 카드(.char-card)와 같은 구성 요소(배경/portrait/서버
  // 아이콘)를 그대로 재사용하되, 초상화가 위 · 정보가 아래로 오는 세로 배치만 다르다.
  const sIcon = repChar && repChar.world ? serverIconSrc(repChar.world) : '';
  const bodyHtml = repChar ? `
    <div class="cm-rep">
      <div class="cm-rep__portrait">
        ${typeof portraitBgHtml === 'function' ? portraitBgHtml(repChar.cardBg) : ''}
        <img class="cm-rep__img" src="${repChar.img ? cmEsc(repChar.img) : 'images/dailytasks/default.png'}" alt=""
          onerror="this.src='images/dailytasks/default.png'">
      </div>
      <div class="cm-rep__name">${cmEsc(repChar.name)}</div>
      <div class="cm-rep__lv">Lv.${cmEsc(String(repChar.level))}</div>
      ${repChar.world ? `<div class="cm-rep__world-line">${sIcon ? `<img src="${cmEsc(sIcon)}" onerror="this.style.display='none'">` : ''}<span>${cmEsc(repChar.world)}</span></div>` : ''}
      ${repChar.job ? `<div class="cm-rep__job">${cmEsc(repChar.job)}</div>` : ''}
    </div>`
    : '<p class="empty">대표 캐릭터가 설정되지 않았습니다.</p>';
  ov.innerHTML = `
    <div class="modal cm-rep-modal">
      <div class="modal__head">
        <span class="modal__title">${cmEsc(nick)}</span>
        <button class="modal__close" id="cmRepClose">×</button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
    </div>`;
  document.getElementById('cmRepClose').addEventListener('click', () => ov.classList.remove('open'));
  ov.classList.add('open');
}

/* ── 화면 그리기 ── */
function renderCommunity() {
  const sec = document.getElementById('sec-community');
  if (!sec) return;
  if (_cmView === 'write') return cmRenderWrite(sec);
  if (_cmView === 'post') return cmRenderPost(sec);
  return cmRenderList(sec);
}

function cmRenderList(sec) {
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">커뮤니티</h2></div>
    <p class="dt-help">자유롭게 글을 쓰고 다른 사람 글에 댓글을 달 수 있습니다. 글쓰기와 댓글은 로그인이 필요합니다.</p>
    <div class="cm-toolbar">
      <button class="sbtn sbtn--primary" id="cmWriteBtn">글쓰기</button>
    </div>
    <div class="cm-list" id="cmList"><p class="empty">불러오는 중...</p></div>
    <div class="cm-pager" id="cmPager"></div>`;

  document.getElementById('cmWriteBtn').addEventListener('click', () => {
    if (!cmLoggedIn()) { showToast('로그인 후 글을 쓸 수 있습니다.'); return; }
    _cmEditPostId = null;
    _cmEditPost = null;
    _cmView = 'write';
    renderCommunity();
  });

  cmLoadPage(_cmPage);
}

/* 번호 페이지 방식 — "더 보기"로 이어붙이면 옛날 글 보려고 몇 번이고 눌러야 해서
   불편하다는 지적으로 바꿨다. 글 봤다가 목록으로 돌아오면 보던 페이지 그대로 보여준다. */
async function cmLoadPage(page) {
  if (_cmBusy) return;
  _cmBusy = true;
  document.getElementById('cmList').innerHTML = '<p class="empty">불러오는 중...</p>';
  const j = await cmApi('list', { page });
  _cmBusy = false;
  if (!j.ok) {
    document.getElementById('cmList').innerHTML = `<p class="empty">${cmEsc(j.error)}</p>`;
    return;
  }
  _cmPosts = j.posts;
  _cmPage = j.page;
  _cmTotalPages = j.totalPages;
  cmPaintList();
}

function cmPaintList() {
  const box = document.getElementById('cmList');
  if (!box) return;
  if (!_cmPosts.length) {
    box.innerHTML = '<p class="empty">아직 글이 없습니다. 첫 글을 남겨보세요.</p>';
    document.getElementById('cmPager').innerHTML = '';
    return;
  }
  box.innerHTML = _cmPosts.map(p => `
    <button type="button" class="cm-item" data-id="${cmEsc(p.id)}">
      ${p.thumb ? `<img class="cm-item__thumb" src="${cmEsc(p.thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <span class="cm-item__body">
        <span class="cm-item__title">${cmEsc(p.title)}${p.commentCount ? `<span class="cm-item__cc">[${p.commentCount}]</span>` : ''}</span>
        <span class="cm-item__preview">${cmEsc(p.bodyPreview)}</span>
        <span class="cm-item__meta">
          <span class="cm-item__nick">${cmEsc(p.authorNick)}</span>
          <span>${cmFmtTime(p.createdAt)}</span>
          ${p.imageCount ? `<span>사진 ${p.imageCount}장</span>` : ''}
        </span>
      </span>
    </button>`).join('');

  box.querySelectorAll('.cm-item').forEach(el => {
    el.addEventListener('click', () => {
      _cmPostId = el.dataset.id;
      _cmView = 'post';
      renderCommunity();
    });
  });

  cmPaintPager();
}

/* 페이지 번호 버튼 — 지금 페이지 중심으로 최대 7개(양옆 3개씩)만 보여주고,
   양 끝은 처음/끝으로 바로 점프하는 버튼을 둔다. 페이지가 하나뿐이면 아예 숨긴다. */
function cmPaintPager() {
  const pager = document.getElementById('cmPager');
  if (!pager) return;
  if (_cmTotalPages <= 1) { pager.innerHTML = ''; return; }

  const cur = _cmPage, total = _cmTotalPages;
  const lo = Math.max(1, cur - 3), hi = Math.min(total, cur + 3);
  const nums = [];
  for (let p = lo; p <= hi; p++) nums.push(p);

  // 처음/이전/다음/마지막은 페이지 값이 우연히 지금 페이지와 같아도(1페이지에서
  // "처음"·"이전") 번호 버튼처럼 강조되면 안 되니, 강조 여부를 따로 받는다.
  const btn = (label, page, opts = {}) =>
    `<button type="button" class="cm-page${opts.cur ? ' cm-page--cur' : ''}"
      data-page="${page}" ${opts.disabled ? 'disabled' : ''}>${label}</button>`;

  pager.innerHTML = `
    ${btn('처음', 1, { disabled: cur === 1 })}
    ${btn('이전', Math.max(1, cur - 1), { disabled: cur === 1 })}
    ${nums.map(p => btn(String(p), p, { cur: p === cur })).join('')}
    ${btn('다음', Math.min(total, cur + 1), { disabled: cur === total })}
    ${btn('마지막', total, { disabled: cur === total })}`;

  pager.querySelectorAll('.cm-page').forEach(el => {
    el.addEventListener('click', () => cmLoadPage(Number(el.dataset.page)));
  });
}

/* ── 글쓰기 ── */
function cmRenderWrite(sec) {
  const editing = !!_cmEditPostId;
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">${editing ? '글 수정' : '글쓰기'}</h2></div>
    <div class="card cm-write">
      <div class="field">
        <label class="field__label">제목</label>
        <input class="inp" id="cmTitle" maxlength="80" placeholder="제목을 입력하세요" autocomplete="off" />
      </div>
      <div class="field mt8">
        <label class="field__label">내용</label>
        <div id="cmEditor" class="cm-editor"></div>
      </div>
      <div class="field mt8">
        <label class="field__label">사진 (본문에 삽입 · 최대 ${CM_IMAGES_MAX}장, 1장당 3MB)</label>
        <input type="file" id="cmFile" accept="image/png,image/jpeg,image/gif,image/webp" multiple style="display:none" />
        <button class="sbtn sbtn--ghost" id="cmPickBtn">사진 삽입</button>
        <span class="cm-upstate" id="cmUpState"></span>
      </div>
      <div class="cm-write__foot">
        <button class="sbtn sbtn--ghost" id="cmCancelBtn">취소</button>
        <button class="sbtn sbtn--primary" id="cmSubmitBtn">${editing ? '수정 완료' : '등록'}</button>
      </div>
    </div>`;

  _cmEditor = new Quill('#cmEditor', {
    theme: 'snow',
    placeholder: '내용을 입력하세요',
    modules: { toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ size: ['small', false, 'large', 'huge'] }],
      // false는 Quill이 자동으로 "색 없음"(기본 글자색으로 되돌리기) 항목을 만들어준다 —
      // 커스텀 배열을 쓰면 이게 자동으로 안 붙어서 따로 넣어야 한다.
      [{ color: ['red', 'yellow', 'blue', false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'image'], ['clean'],
    ] },
  });
  const toolbar = _cmEditor.getModule('toolbar');
  toolbar.addHandler('image', () => document.getElementById('cmFile').click());
  _cmEditor.root.addEventListener('paste', e => cmCaptureEditorImages(e));
  _cmEditor.root.addEventListener('drop', e => cmCaptureEditorImages(e));

  if (editing && _cmEditPost) {
    document.getElementById('cmTitle').value = _cmEditPost.title;
    _cmEditor.root.innerHTML = _cmEditPost.body;
  }

  document.getElementById('cmCancelBtn').addEventListener('click', () => {
    _cmView = editing ? 'post' : 'list';
    _cmEditPostId = null;
    _cmEditPost = null;
    _cmEditor = null;
    renderCommunity();
  });
  document.getElementById('cmPickBtn').addEventListener('click', () => document.getElementById('cmFile').click());
  document.getElementById('cmFile').addEventListener('change', e => cmUploadFiles(e.target.files));
  document.getElementById('cmSubmitBtn').addEventListener('click', cmSubmitPost);
}

async function cmUploadFiles(fileList) {
  const files = Array.from(fileList || []);
  document.getElementById('cmFile').value = '';   // 같은 파일 다시 골라도 change가 뜨게
  if (!files.length) return;

  const room = CM_IMAGES_MAX - document.querySelectorAll('#cmEditor .ql-editor img').length;
  if (room <= 0) { showToast(`사진은 ${CM_IMAGES_MAX}장까지만 올릴 수 있습니다.`); return; }
  const targets = files.slice(0, room);
  if (files.length > room) showToast(`${CM_IMAGES_MAX}장까지만 올라갑니다. ${targets.length}장만 올립니다.`);

  const st = document.getElementById('cmUpState');
  let pos = _cmEditor.getSelection(true)?.index ?? _cmEditor.getLength();
  for (let i = 0; i < targets.length; i++) {
    const f = targets[i];
    if (f.size > CM_IMG_MAX_BYTES) { showToast(`${f.name}은(는) 3MB가 넘어 건너뜁니다.`); continue; }
    st.textContent = `올리는 중... (${i + 1}/${targets.length})`;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('읽기 실패'));
        fr.readAsDataURL(f);
      });
      const j = await cmApi('upload', { data: dataUrl });
      if (!j.ok) { showToast(j.error || '업로드 실패'); continue; }
      _cmEditor.insertEmbed(pos, 'image', j.url, 'user');
      _cmEditor.setSelection(++pos, 0, 'silent');
    } catch (e) {
      showToast('업로드 실패: ' + e.message);
    }
  }
  st.textContent = '';
}

function cmCaptureEditorImages(e) {
  const files = Array.from((e.clipboardData || e.dataTransfer || {}).files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  cmUploadFiles(files);
}

async function cmSubmitPost() {
  if (_cmBusy) return;
  const title = document.getElementById('cmTitle').value.trim();
  const body = _cmEditor.root.innerHTML;
  const text = _cmEditor.getText().trim();
  if (!title) { showToast('제목을 입력해주세요.'); return; }
  if (!text && !_cmEditor.root.querySelector('img')) { showToast('내용을 입력해주세요.'); return; }

  const editing = !!_cmEditPostId;
  const btn = document.getElementById('cmSubmitBtn');
  _cmBusy = true; btn.disabled = true; btn.textContent = editing ? '수정 중...' : '등록 중...';
  const j = editing ? await cmApi('edit', { id: _cmEditPostId, title, body }) : await cmApi('create', { title, body });
  _cmBusy = false; btn.disabled = false; btn.textContent = editing ? '수정 완료' : '등록';

  if (!j.ok) { showToast(j.error); return; }
  showToast(editing ? '글이 수정되었습니다.' : '글이 등록되었습니다.');
  _cmEditor = null;
  _cmPostId = j.id;
  _cmEditPostId = null;
  _cmEditPost = null;
  _cmView = 'post';
  if (!editing) _cmPage = 1; // 새 글은 최신순 1페이지 맨 위에 뜨니, 목록으로 돌아갔을 때 그게 보이게
  renderCommunity();
}

/* ── 글 하나 + 댓글 ── */
async function cmRenderPost(sec) {
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">커뮤니티</h2></div>
    <p class="empty">불러오는 중...</p>`;

  const j = await cmApi('get', { id: _cmPostId });
  if (!j.ok) {
    sec.innerHTML = `
      <div class="sec-head"><h2 class="sec-title">커뮤니티</h2></div>
      <p class="empty">${cmEsc(j.error)}</p>
      <button class="sbtn sbtn--ghost" id="cmBackBtn">목록으로</button>`;
    document.getElementById('cmBackBtn').addEventListener('click', () => { _cmView = 'list'; renderCommunity(); });
    return;
  }

  const p = j.post;
  const canDeletePost = cmCanDelete(p.authorId);
  const canEditPost = cmCanEdit(p.authorId);

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">커뮤니티</h2></div>
    <div class="cm-toolbar">
      <button class="sbtn sbtn--ghost" id="cmBackBtn">← 목록</button>
      ${canEditPost ? '<button class="sbtn sbtn--ghost sbtn--sm" id="cmEditPostBtn">글 수정</button>' : ''}
      ${canDeletePost ? '<button class="sbtn sbtn--danger sbtn--sm" id="cmDelPost">글 삭제</button>' : ''}
    </div>
    <div class="card cm-post">
      <h3 class="cm-post__title">${cmEsc(p.title)}</h3>
      <div class="cm-post__meta">
        <button type="button" class="cm-post__nick" id="cmPostNickBtn">${cmEsc(p.authorNick)}</button>
        <span>${cmFmtTime(p.createdAt)}${p.editedAt ? ' · 수정됨' : ''}</span>
      </div>
      <div class="cm-post__body">${p.body}</div>
      ${(p.images || []).map(u => `<img class="cm-post__img" src="${cmEsc(u)}" alt="" loading="lazy" onerror="this.style.display='none'">`).join('')}
    </div>

    <div class="card cm-comments">
      <div class="card__title">댓글 ${j.comments.length}</div>
      <div class="cm-clist" id="cmClist"></div>
      ${cmLoggedIn() ? `
      ${typeof bpIsEnabled === 'function' && !bpIsEnabled() ? `
      <div class="cm-pushhint">
        <span>내 글이나 댓글에 답글이 달리면 바로 알려드릴게요.</span>
        <button class="sbtn sbtn--ghost sbtn--sm" id="cmCommentPushBtn">댓글 알림 켜기</button>
      </div>` : ''}
      <div class="cm-cwrite">
        <textarea class="inp cm-cinput" id="cmCommentBody" maxlength="1000" placeholder="댓글을 입력하세요"></textarea>
        <button class="sbtn sbtn--primary" id="cmCommentBtn">등록</button>
      </div>` : '<p class="dt-help">댓글을 쓰려면 로그인해주세요.</p>'}
    </div>`;

  document.getElementById('cmBackBtn').addEventListener('click', () => { _cmView = 'list'; renderCommunity(); });
  document.getElementById('cmPostNickBtn').addEventListener('click', () => cmShowRepChar(p.authorNick, p.authorRepChar));
  document.getElementById('cmEditPostBtn')?.addEventListener('click', () => {
    _cmEditPostId = p.id;
    _cmEditPost = p;
    _cmView = 'write';
    renderCommunity();
  });
  document.getElementById('cmDelPost')?.addEventListener('click', async () => {
    if (!confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
    const d = await cmApi('delete', { id: p.id });
    if (!d.ok) { showToast(d.error); return; }
    showToast('글을 삭제했습니다.');
    _cmView = 'list';
    renderCommunity();
  });

  cmPaintComments(j.comments);
  document.getElementById('cmCommentBtn')?.addEventListener('click', cmSubmitComment);
  document.getElementById('cmCommentPushBtn')?.addEventListener('click', async () => {
    const r = typeof bpEnable === 'function' ? await bpEnable() : { ok: false, msg: '이 브라우저는 알림을 지원하지 않아요.' };
    if (!r.ok) { showToast(r.msg || '알림을 켜지 못했습니다.'); return; }
    showToast('댓글 알림을 켰습니다.');
    renderCommunity();
  });
}

function cmPaintComments(comments) {
  const box = document.getElementById('cmClist');
  if (!box) return;
  if (!comments.length) { box.innerHTML = '<p class="empty">아직 댓글이 없습니다.</p>'; return; }
  const byId = new Map(comments.map(c => [c.id, c]));
  const roots = comments.filter(c => !c.parentId || !byId.has(c.parentId));
  const replies = new Map();
  comments.filter(c => c.parentId && byId.has(c.parentId)).forEach(c => {
    const list = replies.get(c.parentId) || [];
    list.push(c); replies.set(c.parentId, list);
  });
  const card = (c, depth) => `
    <div class="cm-c${depth ? ' cm-c--reply' : ''}"${depth ? ` style="--cm-reply-depth:${Math.min(depth, 4)}"` : ''}>
      <div class="cm-c__head">
        <button type="button" class="cm-c__nick" data-cnick="${cmEsc(c.id)}">${cmEsc(c.authorNick)}</button>
        <span class="cm-c__time">${cmFmtTime(c.createdAt)}</span>
        ${cmLoggedIn() ? `<button class="cm-c__reply" data-rid="${cmEsc(c.id)}">답글</button>` : ''}
        ${cmCanDelete(c.authorId) ? `<button class="cm-c__del" data-cid="${cmEsc(c.id)}" title="댓글 삭제">×</button>` : ''}
      </div>
      <div class="cm-c__body">${cmEsc(c.body)}</div>
    </div>`;
  const branch = (c, depth) => {
    const children = (replies.get(c.id) || []).map(r => branch(r, depth + 1)).join('');
    const writer = _cmReplyTo === c.id ? `
      <div class="cm-replywrite">
        <textarea class="inp cm-cinput" id="cmReplyBody" maxlength="1000" placeholder="답글을 입력하세요"></textarea>
        <div class="cm-replywrite__actions">
          <button class="sbtn sbtn--ghost sbtn--sm" id="cmReplyCancelBtn">취소</button>
          <button class="sbtn sbtn--primary sbtn--sm" id="cmReplyBtn" data-rid="${cmEsc(c.id)}">답글 등록</button>
        </div>
      </div>` : '';
    return card(c, depth) + children + writer;
  };
  box.innerHTML = roots.map(c => branch(c, 0)).join('');

  // 닉네임 버튼은 댓글 id로 원본 배열에서 찾아 그 사람의 대표 캐릭터를 띄운다
  // (data 속성에 JSON을 통째로 넣는 것보다 간단하고 안전하다).
  box.querySelectorAll('.cm-c__nick').forEach(b => {
    b.addEventListener('click', () => {
      const c = comments.find(x => x.id === b.dataset.cnick);
      if (c) cmShowRepChar(c.authorNick, c.authorRepChar);
    });
  });

  box.querySelectorAll('.cm-c__del').forEach(b => {
    b.addEventListener('click', async () => {
      const d = await cmApi('comment-delete', { postId: _cmPostId, commentId: b.dataset.cid });
      if (!d.ok) { showToast(d.error); return; }
      renderCommunity();
    });
  });
  box.querySelectorAll('.cm-c__reply').forEach(b => {
    b.addEventListener('click', () => {
      _cmReplyTo = _cmReplyTo === b.dataset.rid ? null : b.dataset.rid;
      cmPaintComments(comments);
    });
  });
  document.getElementById('cmReplyCancelBtn')?.addEventListener('click', () => {
    _cmReplyTo = null;
    cmPaintComments(comments);
  });
  document.getElementById('cmReplyBtn')?.addEventListener('click', cmSubmitReply);
}

async function cmSubmitComment() {
  if (_cmBusy) return;
  const el = document.getElementById('cmCommentBody');
  const text = el.value.trim();
  if (!text) { showToast('댓글 내용을 입력해주세요.'); return; }

  const btn = document.getElementById('cmCommentBtn');
  _cmBusy = true; btn.disabled = true;
  const j = await cmApi('comment', { postId: _cmPostId, body: text });
  _cmBusy = false; btn.disabled = false;

  if (!j.ok) { showToast(j.error); return; }
  el.value = '';
  renderCommunity();
}

async function cmSubmitReply() {
  if (_cmBusy) return;
  const el = document.getElementById('cmReplyBody');
  const parentId = document.getElementById('cmReplyBtn')?.dataset.rid || '';
  const text = (el?.value || '').trim();
  if (!text) { showToast('답글 내용을 입력해주세요.'); return; }
  const btn = document.getElementById('cmReplyBtn');
  _cmBusy = true; btn.disabled = true;
  const j = await cmApi('comment', { postId: _cmPostId, parentId, body: text });
  _cmBusy = false; btn.disabled = false;
  if (!j.ok) { showToast(j.error); return; }
  _cmReplyTo = null;
  renderCommunity();
}

// 푸시 알림을 누르면 관련 글을 곧바로 연다. 열고 나면 쿼리를 지워 새로고침 때
// 같은 글이 계속 열리지 않게 한다.
window.addEventListener('load', () => {
  const postId = new URLSearchParams(location.search).get('community');
  if (!postId || typeof navigateTo !== 'function') return;
  _cmPostId = postId;
  _cmView = 'post';
  navigateTo('community');
  _cmView = 'post';
  renderCommunity();
  history.replaceState(null, '', location.pathname);
});
