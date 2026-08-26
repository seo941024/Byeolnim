/* =============================================
   api/community-upload.js — 커뮤니티 사진 업로드 (Vercel Blob)

     POST /api/community-upload
     body: { token, data: "data:image/png;base64,..." }
     응답: { ok:true, url }

   로그인(auth.js 토큰)이 있어야 올릴 수 있다. 사진 1장씩 올리고, 여러 장은
   프론트에서 반복 호출한다 — 한 번에 여러 장을 보내면 하나가 실패했을 때
   전체를 다시 보내야 해서 번거롭다.

   ※ BLOB_READ_WRITE_TOKEN이 없으면(로컬 개발 등) 그 사실을 그대로 알려준다.
      Vercel 프로젝트에서 Blob 저장소를 연결하면 자동으로 채워지는 값이다.
   ============================================= */
const { getRedis } = require('./_lib');

const MAX_BYTES = 5 * 1024 * 1024; // 원본 파일 기준 5MB
const ALLOWED = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

function bad(res, code, msg) { res.status(code).json({ ok: false, error: msg }); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'POST만 허용');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return bad(res, 500, '사진 저장소가 설정되지 않았습니다(BLOB_READ_WRITE_TOKEN)');

  const redis = getRedis();
  if (!redis) return bad(res, 500, '서버 저장소가 설정되지 않았습니다');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return bad(res, 400, '요청 형식이 올바르지 않습니다');

  const token = String(body.token || '');
  const uid = token && await redis.get('auth:tok:' + token);
  if (!uid) return bad(res, 401, '로그인이 필요합니다');

  const data = String(body.data || '');
  const m = data.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return bad(res, 400, '이미지 파일이 아닙니다');
  const mime = m[1];
  const ext = ALLOWED[mime];
  if (!ext) return bad(res, 400, '지원하지 않는 이미지 형식입니다(png/jpg/gif/webp만)');

  let buf;
  try { buf = Buffer.from(m[2], 'base64'); } catch { return bad(res, 400, '이미지 데이터가 손상되었습니다'); }
  if (buf.length > MAX_BYTES) return bad(res, 400, '사진 1장은 5MB 이내여야 합니다');

  try {
    const { put } = require('@vercel/blob');
    const name = `community/${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(name, buf, { access: 'public', contentType: mime });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    return bad(res, 500, '업로드 실패: ' + e.message);
  }
};
