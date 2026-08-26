/* =============================================
   api/community.js — 커뮤니티 게시판 (글/댓글)

   함수 하나에서 action으로 갈라 쓴다(auth.js와 같은 패턴).
   로그인(auth.js에서 발급한 token)이 있어야 글/댓글을 쓸 수 있고, 목록·조회는
   로그인 없이도 된다.

   저장 구조 (Upstash Redis)
     community:post:<id>      (json) { id, authorId, authorNick, title, body,
                                        images:[url,...], createdAt, commentCount }
     community:posts          (zset) score=createdAt, member=id  ← 최신순 목록용
     community:comments:<pid> (json) [{ id, authorId, authorNick, body, createdAt }, ...]

   닉네임은 글 작성 시점 값을 그대로 박아 둔다(스냅샷). 나중에 닉네임을 바꿔도
   이미 쓴 글에는 소급 반영되지 않는다 — 매번 사용자 레코드를 다시 조회하지
   않아도 되고, "누가 썼는지"가 그 시점 기준으로 고정되는 게 자연스럽다.
   ============================================= */
const crypto = require('crypto');
const { getRedis, isAdminId } = require('./_lib');

const TITLE_MAX = 80;
const BODY_MAX = 5000;
const COMMENT_MAX = 1000;
const IMAGES_MAX = 10;
const LIST_PAGE = 20;
const COMMENTS_MAX_PER_POST = 500; // 도배 방지용 상한

// 사진 업로드용 — 원래 api/community-upload.js였는데, Vercel Hobby 플랜의
// 서버리스 함수 12개 제한에 걸려서 이 파일의 action으로 합쳤다.
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 원본 파일 기준 5MB
const UPLOAD_ALLOWED = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

function bad(res, code, msg) { res.status(code).json({ ok: false, error: msg }); }
function newId() { return Date.now().toString(36) + crypto.randomBytes(4).toString('hex'); }

async function getUid(redis, token) {
  if (!token) return null;
  return await redis.get('auth:tok:' + token);
}

async function getNick(redis, uid) {
  const raw = await redis.get('auth:user:' + uid);
  const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  return (rec && rec.nickname) || uid;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'POST만 허용');

  const redis = getRedis();
  if (!redis) return bad(res, 500, '서버 저장소가 설정되지 않았습니다');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return bad(res, 400, '요청 형식이 올바르지 않습니다');

  const action = String(body.action || '');

  try {
    /* ── 목록 (로그인 불필요) ── */
    if (action === 'list') {
      const cursor = Number(body.cursor) || 0; // 이전 응답의 nextCursor를 그대로 넣으면 이어서
      const ids = await redis.zrange('community:posts', cursor, cursor + LIST_PAGE - 1, { rev: true });
      if (!ids || !ids.length) return res.status(200).json({ ok: true, posts: [], nextCursor: null });

      const raws = await Promise.all(ids.map(id => redis.get('community:post:' + id)));
      const posts = raws.filter(Boolean).map(r => {
        const p = typeof r === 'string' ? JSON.parse(r) : r;
        // 목록에는 본문 전체 대신 미리보기(100자)와 첫 사진만 — 응답을 가볍게
        return {
          id: p.id, title: p.title, authorNick: p.authorNick, createdAt: p.createdAt,
          commentCount: p.commentCount || 0,
          bodyPreview: (p.body || '').slice(0, 100),
          thumb: (p.images && p.images[0]) || null,
          imageCount: (p.images && p.images.length) || 0,
        };
      });
      const nextCursor = ids.length === LIST_PAGE ? cursor + LIST_PAGE : null;
      return res.status(200).json({ ok: true, posts, nextCursor });
    }

    /* ── 글 하나 + 댓글 (로그인 불필요) ── */
    if (action === 'get') {
      const id = String(body.id || '');
      const raw = await redis.get('community:post:' + id);
      if (!raw) return bad(res, 404, '글을 찾을 수 없습니다');
      const post = typeof raw === 'string' ? JSON.parse(raw) : raw;

      const craw = await redis.get('community:comments:' + id);
      const comments = craw ? (typeof craw === 'string' ? JSON.parse(craw) : craw) : [];
      return res.status(200).json({ ok: true, post, comments });
    }

    /* 아래는 전부 로그인된 사람만 */
    const token = String(body.token || '');
    const uid = await getUid(redis, token);
    if (!uid) return bad(res, 401, '로그인이 필요합니다');

    /* ── 사진 업로드 (Vercel Blob) ──
       사진 1장씩 올리고, 여러 장은 프론트에서 반복 호출한다 — 한 번에 여러 장을
       보내면 하나가 실패했을 때 전체를 다시 보내야 해서 번거롭다. */
    if (action === 'upload') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return bad(res, 500, '사진 저장소가 설정되지 않았습니다(BLOB_READ_WRITE_TOKEN)');

      const data = String(body.data || '');
      const m = data.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!m) return bad(res, 400, '이미지 파일이 아닙니다');
      const mime = m[1];
      const ext = UPLOAD_ALLOWED[mime];
      if (!ext) return bad(res, 400, '지원하지 않는 이미지 형식입니다(png/jpg/gif/webp만)');

      let buf;
      try { buf = Buffer.from(m[2], 'base64'); } catch { return bad(res, 400, '이미지 데이터가 손상되었습니다'); }
      if (buf.length > UPLOAD_MAX_BYTES) return bad(res, 400, '사진 1장은 5MB 이내여야 합니다');

      try {
        const { put } = require('@vercel/blob');
        const name = `community/${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await put(name, buf, { access: 'public', contentType: mime });
        return res.status(200).json({ ok: true, url: blob.url });
      } catch (e) {
        return bad(res, 500, '업로드 실패: ' + e.message);
      }
    }

    /* ── 글쓰기 ── */
    if (action === 'create') {
      const title = String(body.title || '').trim();
      const text = String(body.body || '').trim();
      const images = Array.isArray(body.images) ? body.images.slice(0, IMAGES_MAX) : [];

      if (!title) return bad(res, 400, '제목을 입력해주세요');
      if (title.length > TITLE_MAX) return bad(res, 400, `제목은 ${TITLE_MAX}자 이내여야 합니다`);
      if (!text) return bad(res, 400, '내용을 입력해주세요');
      if (text.length > BODY_MAX) return bad(res, 400, `내용은 ${BODY_MAX}자 이내여야 합니다`);
      // 업로드 API가 내려준 blob URL만 받는다 — 아무 URL이나 박아서 외부 이미지를
      // 끌어오는 걸 막는다.
      if (images.some(u => typeof u !== 'string' || !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(u))) {
        return bad(res, 400, '사진 형식이 올바르지 않습니다');
      }

      const nickname = await getNick(redis, uid);
      const id = newId();
      const createdAt = Date.now();
      const post = { id, authorId: uid, authorNick: nickname, title, body: text, images, createdAt, commentCount: 0 };
      await redis.set('community:post:' + id, JSON.stringify(post));
      await redis.zadd('community:posts', { score: createdAt, member: id });
      return res.status(200).json({ ok: true, id });
    }

    /* ── 글 삭제 (작성자 또는 관리자) ── */
    if (action === 'delete') {
      const id = String(body.id || '');
      const raw = await redis.get('community:post:' + id);
      if (!raw) return bad(res, 404, '글을 찾을 수 없습니다');
      const post = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (post.authorId !== uid && !isAdminId(uid)) return bad(res, 403, '삭제 권한이 없습니다');

      await redis.del('community:post:' + id);
      await redis.del('community:comments:' + id);
      await redis.zrem('community:posts', id);
      return res.status(200).json({ ok: true });
    }

    /* ── 댓글 작성 ── */
    if (action === 'comment') {
      const postId = String(body.postId || '');
      const text = String(body.body || '').trim();
      if (!text) return bad(res, 400, '댓글 내용을 입력해주세요');
      if (text.length > COMMENT_MAX) return bad(res, 400, `댓글은 ${COMMENT_MAX}자 이내여야 합니다`);

      const praw = await redis.get('community:post:' + postId);
      if (!praw) return bad(res, 404, '글을 찾을 수 없습니다');
      const post = typeof praw === 'string' ? JSON.parse(praw) : praw;

      const craw = await redis.get('community:comments:' + postId);
      const comments = craw ? (typeof craw === 'string' ? JSON.parse(craw) : craw) : [];
      if (comments.length >= COMMENTS_MAX_PER_POST) return bad(res, 400, '댓글이 너무 많습니다');

      const nickname = await getNick(redis, uid);
      const comment = { id: newId(), authorId: uid, authorNick: nickname, body: text, createdAt: Date.now() };
      comments.push(comment);
      await redis.set('community:comments:' + postId, JSON.stringify(comments));

      post.commentCount = comments.length;
      await redis.set('community:post:' + postId, JSON.stringify(post));
      return res.status(200).json({ ok: true, comment });
    }

    /* ── 댓글 삭제 (작성자 또는 관리자) ── */
    if (action === 'comment-delete') {
      const postId = String(body.postId || '');
      const commentId = String(body.commentId || '');
      const craw = await redis.get('community:comments:' + postId);
      const comments = craw ? (typeof craw === 'string' ? JSON.parse(craw) : craw) : [];
      const target = comments.find(c => c.id === commentId);
      if (!target) return bad(res, 404, '댓글을 찾을 수 없습니다');
      if (target.authorId !== uid && !isAdminId(uid)) return bad(res, 403, '삭제 권한이 없습니다');

      const next = comments.filter(c => c.id !== commentId);
      await redis.set('community:comments:' + postId, JSON.stringify(next));

      const praw = await redis.get('community:post:' + postId);
      if (praw) {
        const post = typeof praw === 'string' ? JSON.parse(praw) : praw;
        post.commentCount = next.length;
        await redis.set('community:post:' + postId, JSON.stringify(post));
      }
      return res.status(200).json({ ok: true });
    }

    return bad(res, 400, '알 수 없는 요청입니다');
  } catch (e) {
    return bad(res, 500, '서버 오류: ' + e.message);
  }
};
