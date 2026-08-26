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
const CM_IMG_MAX_BYTES = 5 * 1024 * 1024;

let _cmView = 'list';
let _cmPostId = null;
let _cmPosts = [];
let _cmNextCursor = 0;
let _cmBusy = false;
let _cmEditor = null;

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

async function cmApi(action, extra) {
  const r = await fetch('/api/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action, token: cmToken() }, extra || {})),
  });
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
    <div class="cm-more" id="cmMoreWrap"></div>`;

  document.getElementById('cmWriteBtn').addEventListener('click', () => {
    if (!cmLoggedIn()) { showToast('로그인 후 글을 쓸 수 있습니다.'); return; }
    _cmView = 'write';
    renderCommunity();
  });

  _cmPosts = [];
  _cmNextCursor = 0;
  cmLoadMore();
}

async function cmLoadMore() {
  if (_cmBusy || _cmNextCursor === null) return;
  _cmBusy = true;
  const j = await cmApi('list', { cursor: _cmNextCursor });
  _cmBusy = false;
  if (!j.ok) {
    document.getElementById('cmList').innerHTML = `<p class="empty">${cmEsc(j.error)}</p>`;
    return;
  }
  _cmPosts = _cmPosts.concat(j.posts);
  _cmNextCursor = j.nextCursor;
  cmPaintList();
}

function cmPaintList() {
  const box = document.getElementById('cmList');
  if (!box) return;
  if (!_cmPosts.length) {
    box.innerHTML = '<p class="empty">아직 글이 없습니다. 첫 글을 남겨보세요.</p>';
    document.getElementById('cmMoreWrap').innerHTML = '';
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

  const moreWrap = document.getElementById('cmMoreWrap');
  moreWrap.innerHTML = _cmNextCursor === null
    ? ''
    : '<button class="sbtn sbtn--ghost w100" id="cmMoreBtn">더 보기</button>';
  document.getElementById('cmMoreBtn')?.addEventListener('click', cmLoadMore);
}

/* ── 글쓰기 ── */
function cmRenderWrite(sec) {
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">글쓰기</h2></div>
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
        <label class="field__label">사진 (본문에 삽입 · 최대 ${CM_IMAGES_MAX}장, 1장당 5MB)</label>
        <input type="file" id="cmFile" accept="image/png,image/jpeg,image/gif,image/webp" multiple style="display:none" />
        <button class="sbtn sbtn--ghost" id="cmPickBtn">사진 삽입</button>
        <span class="cm-upstate" id="cmUpState"></span>
      </div>
      <div class="cm-write__foot">
        <button class="sbtn sbtn--ghost" id="cmCancelBtn">취소</button>
        <button class="sbtn sbtn--primary" id="cmSubmitBtn">등록</button>
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

  document.getElementById('cmCancelBtn').addEventListener('click', () => {
    _cmView = 'list';
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
    if (f.size > CM_IMG_MAX_BYTES) { showToast(`${f.name}은(는) 5MB가 넘어 건너뜁니다.`); continue; }
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

  const btn = document.getElementById('cmSubmitBtn');
  _cmBusy = true; btn.disabled = true; btn.textContent = '등록 중...';
  const j = await cmApi('create', { title, body });
  _cmBusy = false; btn.disabled = false; btn.textContent = '등록';

  if (!j.ok) { showToast(j.error); return; }
  showToast('글이 등록되었습니다.');
  _cmEditor = null;
  _cmPostId = j.id;
  _cmView = 'post';
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

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">커뮤니티</h2></div>
    <div class="cm-toolbar">
      <button class="sbtn sbtn--ghost" id="cmBackBtn">← 목록</button>
      ${canDeletePost ? '<button class="sbtn sbtn--danger sbtn--sm" id="cmDelPost">글 삭제</button>' : ''}
    </div>
    <div class="card cm-post">
      <h3 class="cm-post__title">${cmEsc(p.title)}</h3>
      <div class="cm-post__meta">
        <span class="cm-post__nick">${cmEsc(p.authorNick)}</span>
        <span>${cmFmtTime(p.createdAt)}</span>
      </div>
      <div class="cm-post__body">${p.body}</div>
      ${(p.images || []).map(u => `<img class="cm-post__img" src="${cmEsc(u)}" alt="" loading="lazy" onerror="this.style.display='none'">`).join('')}
    </div>

    <div class="card cm-comments">
      <div class="card__title">댓글 ${j.comments.length}</div>
      <div class="cm-clist" id="cmClist"></div>
      ${cmLoggedIn() ? `
      <div class="cm-cwrite">
        <textarea class="inp cm-cinput" id="cmCommentBody" maxlength="1000" placeholder="댓글을 입력하세요"></textarea>
        <button class="sbtn sbtn--primary" id="cmCommentBtn">등록</button>
      </div>` : '<p class="dt-help">댓글을 쓰려면 로그인해주세요.</p>'}
    </div>`;

  document.getElementById('cmBackBtn').addEventListener('click', () => { _cmView = 'list'; renderCommunity(); });
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
}

function cmPaintComments(comments) {
  const box = document.getElementById('cmClist');
  if (!box) return;
  if (!comments.length) { box.innerHTML = '<p class="empty">아직 댓글이 없습니다.</p>'; return; }
  box.innerHTML = comments.map(c => `
    <div class="cm-c">
      <div class="cm-c__head">
        <span class="cm-c__nick">${cmEsc(c.authorNick)}</span>
        <span class="cm-c__time">${cmFmtTime(c.createdAt)}</span>
        ${cmCanDelete(c.authorId) ? `<button class="cm-c__del" data-cid="${cmEsc(c.id)}" title="댓글 삭제">×</button>` : ''}
      </div>
      <div class="cm-c__body">${cmEsc(c.body)}</div>
    </div>`).join('');

  box.querySelectorAll('.cm-c__del').forEach(b => {
    b.addEventListener('click', async () => {
      const d = await cmApi('comment-delete', { postId: _cmPostId, commentId: b.dataset.cid });
      if (!d.ok) { showToast(d.error); return; }
      renderCommunity();
    });
  });
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
