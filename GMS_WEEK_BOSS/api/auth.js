/* =============================================
   api/auth.js — 회원가입 / 로그인 / 데이터 저장·불러오기

   함수 하나에서 action으로 갈라 쓴다. Vercel 무료 플랜은 서버리스 함수
   개수 제한이 있어서 엔드포인트를 잘게 쪼개지 않는다.

   저장 구조 (Upstash Redis)
     auth:user:<id>    (json) { id, salt, hash, created, nickname }   ← 비밀번호 원문은 절대 저장 안 함
     auth:tok:<token>  (str)  id                            ← 세션, 30일 후 자동 만료
     auth:data:<id>    (json) 사용자가 저장한 앱 데이터
     auth:fail:<id>    (int)  로그인 연속 실패 횟수, 10분 후 자동 소멸

   비밀번호는 scrypt로 해시해서 넣는다. 같은 비밀번호라도 사용자마다 salt가
   달라 결과가 다르고, 해시에서 원문을 되돌릴 수 없다. 비교는 timingSafeEqual로
   해서 응답 시간 차이로 정답을 유추하지 못하게 막는다.
   ============================================= */
const crypto = require('crypto');
const { getRedis, isAdminId } = require('./_lib');

const ID_RE = /^[A-Za-z0-9_]{3,16}$/;     // 대소문자 구분, 영문·숫자·밑줄
// 한글·영문·숫자·기호·공백 1~12자. 순수 공백만으로는 안 되게 아래서 trim 후 길이를 다시 본다.
const NICK_RE = /^[가-힣a-zA-Z0-9 !-~]{1,12}$/;
const PW_MIN = 4;
const PW_MAX = 10;                         // 요청대로 10자 이내
const TOKEN_TTL = 60 * 60 * 24 * 30 * 6;   // 6개월(30일 기준 근사치)
const FAIL_TTL = 60 * 10;                  // 실패 카운트 유지 10분
const FAIL_MAX = 10;                       // 10회 틀리면 잠시 차단
const DATA_MAX = 1024 * 512;               // 저장 데이터 상한 512KB

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* isAdminId는 _lib.js로 옮겼다 — community.js(글/댓글 삭제 권한)도 같이 쓴다. */

function hashPw(pw, salt) {
  // N=16384는 서버리스 환경에서 100ms 안팎 — 무차별 대입을 충분히 느리게 만든다
  return crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

/* 길이가 달라도 예외 없이 false를 돌려주는 비교 */
function safeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function bad(res, code, msg) { res.status(code).json({ ok: false, error: msg }); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'POST만 허용');

  const redis = getRedis();
  if (!redis) return bad(res, 500, '서버 저장소가 설정되지 않았습니다');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return bad(res, 400, '요청 형식이 올바르지 않습니다');

  const action = String(body.action || '');

  try {
    /* ── 회원가입 ── */
    if (action === 'signup') {
      const id = String(body.id || '');
      const pw = String(body.pw || '');
      if (!ID_RE.test(id)) return bad(res, 400, '아이디는 영문·숫자·밑줄 3~16자여야 합니다');
      if (pw.length < PW_MIN || pw.length > PW_MAX)
        return bad(res, 400, `비밀번호는 ${PW_MIN}~${PW_MAX}자여야 합니다`);

      // 대소문자를 구분하되, 대소문자만 다른 아이디는 헷갈리므로 함께 막는다
      const lockKey = 'auth:idlock:' + id.toLowerCase();
      const taken = await redis.set(lockKey, id, { nx: true });
      if (!taken) return bad(res, 409, '이미 사용 중인 아이디입니다');

      const salt = crypto.randomBytes(16).toString('hex');
      // 기본 닉네임은 아이디와 동일 — 따로 설정하기 전까지는 아이디가 그대로 보인다
      const rec = { id, salt, hash: hashPw(pw, salt), created: Date.now(), nickname: id };
      await redis.set('auth:user:' + id, JSON.stringify(rec));

      const token = newToken();
      await redis.set('auth:tok:' + token, id, { ex: TOKEN_TTL });
      return res.status(200).json({ ok: true, id, nickname: id, token, isAdmin: isAdminId(id), repChar: null });
    }

    /* ── 로그인 ── */
    if (action === 'login') {
      const id = String(body.id || '');
      const pw = String(body.pw || '');
      if (!ID_RE.test(id) || !pw) return bad(res, 400, '아이디 또는 비밀번호가 올바르지 않습니다');

      const failKey = 'auth:fail:' + id;
      const fails = Number(await redis.get(failKey)) || 0;
      if (fails >= FAIL_MAX)
        return bad(res, 429, '로그인 시도가 너무 많습니다. 10분 후 다시 시도해주세요');

      const raw = await redis.get('auth:user:' + id);
      const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

      // 아이디가 없을 때도 같은 시간이 걸리게 해서 아이디 존재 여부를 못 알아내게 한다
      if (!rec) {
        hashPw(pw, 'dummy-salt-for-timing');
        await redis.set(failKey, fails + 1, { ex: FAIL_TTL });
        await sleep(150);
        return bad(res, 401, '아이디 또는 비밀번호가 올바르지 않습니다');
      }

      if (!safeEq(hashPw(pw, rec.salt), rec.hash)) {
        await redis.set(failKey, fails + 1, { ex: FAIL_TTL });
        await sleep(150);
        return bad(res, 401, '아이디 또는 비밀번호가 올바르지 않습니다');
      }

      await redis.del(failKey);
      const token = newToken();
      await redis.set('auth:tok:' + token, id, { ex: TOKEN_TTL });
      // 오래된 계정(닉네임 필드가 생기기 전 가입)은 nickname이 없을 수 있어 아이디로 대체
      return res.status(200).json({ ok: true, id, nickname: rec.nickname || id, token, isAdmin: isAdminId(id), repChar: rec.repChar || null });
    }

    /* 아래는 전부 로그인된 사람만 */
    const token = String(body.token || '');
    if (!token) return bad(res, 401, '로그인이 필요합니다');
    const uid = await redis.get('auth:tok:' + token);
    if (!uid) return bad(res, 401, '로그인이 만료되었습니다. 다시 로그인해주세요');

    /* ── 비밀번호 변경 ── */
    if (action === 'changepw') {
      const curPw = String(body.curPw || '');
      const newPw = String(body.newPw || '');
      if (newPw.length < PW_MIN || newPw.length > PW_MAX)
        return bad(res, 400, `새 비밀번호는 ${PW_MIN}~${PW_MAX}자여야 합니다`);

      const raw = await redis.get('auth:user:' + uid);
      const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      if (!rec) return bad(res, 404, '계정 정보를 찾을 수 없습니다');

      // 잘못된 현재 비밀번호도 로그인과 같은 잠금 카운터를 쓴다 — 여기가 뚫려있으면
      // 남의 토큰만 훔쳐도 비밀번호 대입 공격이 가능해지기 때문
      const failKey = 'auth:fail:' + uid;
      const fails = Number(await redis.get(failKey)) || 0;
      if (fails >= FAIL_MAX)
        return bad(res, 429, '시도가 너무 많습니다. 10분 후 다시 시도해주세요');

      if (!safeEq(hashPw(curPw, rec.salt), rec.hash)) {
        await redis.set(failKey, fails + 1, { ex: FAIL_TTL });
        await sleep(150);
        return bad(res, 401, '현재 비밀번호가 올바르지 않습니다');
      }
      await redis.del(failKey);

      // salt도 새로 뽑는다 — 같은 salt를 재사용할 이유가 없다
      const salt = crypto.randomBytes(16).toString('hex');
      rec.hash = hashPw(newPw, salt);
      rec.salt = salt;
      await redis.set('auth:user:' + uid, JSON.stringify(rec));
      // 지금 쓰던 토큰(세션)은 그대로 둔다 — 방금 인증한 사람을 다시 로그인시키는 건 불필요
      return res.status(200).json({ ok: true });
    }

    /* ── 닉네임 변경 ── */
    if (action === 'setnick') {
      const nickname = String(body.nickname || '').trim();
      if (!nickname) return bad(res, 400, '닉네임을 입력해주세요');
      if (!NICK_RE.test(nickname)) return bad(res, 400, '닉네임은 한글·영문·숫자·기호로 1~12자여야 합니다');

      const raw = await redis.get('auth:user:' + uid);
      const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      if (!rec) return bad(res, 404, '계정 정보를 찾을 수 없습니다');

      rec.nickname = nickname;
      await redis.set('auth:user:' + uid, JSON.stringify(rec));
      return res.status(200).json({ ok: true, nickname });
    }

    /* ── 대표 캐릭터 설정/해제 ──
       커뮤니티 글·댓글에서 닉네임을 누르면 보여줄 캐릭터. 캐릭터 목록은
       각자 브라우저 localStorage에만 있어 서버가 원래 접근 못 하므로, 고를 때
       화면에 보이는 값(이름·레벨·직업·서버·이미지)만 그대로 올려받아 그 계정
       레코드에 스냅샷으로 저장한다 — 실시간 조회가 아니다. 닉네임과 같은 원칙:
       나중에 캐릭터가 바뀌어도 이미 쓴 글에는 소급 반영되지 않는다. */
    if (action === 'setrepchar') {
      const raw = await redis.get('auth:user:' + uid);
      const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      if (!rec) return bad(res, 404, '계정 정보를 찾을 수 없습니다');

      if (body.clear) {
        rec.repChar = null;
        await redis.set('auth:user:' + uid, JSON.stringify(rec));
        return res.status(200).json({ ok: true, repChar: null });
      }

      const name = String(body.name || '').trim().slice(0, 20);
      const level = Math.min(300, Math.max(1, Number(body.level) || 0));
      const job = String(body.job || '').trim().slice(0, 40);
      const world = String(body.world || '').trim().slice(0, 20);
      const region = body.region === 'EU' ? 'EU' : 'NA';
      const img = String(body.img || '');
      // 넥슨이 실제로 내려주는 아바타 도메인만 허용 — 아무 이미지 URL이나
      // 프로필에 박아 넣는 걸 막는다(글 사진의 Blob URL 검증과 같은 이유).
      const IMG_RE = /^https:\/\/msavatar\d*\.nexon\.net\//i;
      const safeImg = IMG_RE.test(img) ? img : '';
      // 카드 배경도 캐릭터가 골라둔 값 그대로 — bgN 형식만 허용(임의 문자열 방지).
      const cardBg = /^bg\d+$/.test(String(body.cardBg || '')) ? body.cardBg : null;

      if (!name) return bad(res, 400, '캐릭터를 선택해주세요');

      rec.repChar = { name, level, job, world, region, img: safeImg, cardBg };
      await redis.set('auth:user:' + uid, JSON.stringify(rec));
      return res.status(200).json({ ok: true, repChar: rec.repChar });
    }

    /* ── 저장 ── */
    if (action === 'save') {
      const data = body.data;
      if (data == null) return bad(res, 400, '저장할 데이터가 없습니다');
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      if (str.length > DATA_MAX) return bad(res, 413, '데이터가 너무 큽니다');
      await redis.set('auth:data:' + uid, str);
      await redis.set('auth:datameta:' + uid, JSON.stringify({ at: Date.now(), size: str.length }));
      return res.status(200).json({ ok: true, at: Date.now(), size: str.length });
    }

    /* ── 불러오기 ── */
    if (action === 'load') {
      const raw = await redis.get('auth:data:' + uid);
      if (raw == null) return res.status(200).json({ ok: true, data: null });
      const metaRaw = await redis.get('auth:datameta:' + uid);
      const meta = metaRaw ? (typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw) : null;
      return res.status(200).json({
        ok: true,
        data: typeof raw === 'string' ? raw : JSON.stringify(raw),
        at: meta && meta.at,
      });
    }

    /* ── 로그인 상태 확인 ── */
    if (action === 'me') {
      const raw = await redis.get('auth:user:' + uid);
      const rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      const metaRaw = await redis.get('auth:datameta:' + uid);
      const meta = metaRaw ? (typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw) : null;
      return res.status(200).json({ ok: true, id: uid, nickname: (rec && rec.nickname) || uid, savedAt: meta && meta.at, isAdmin: isAdminId(uid), repChar: (rec && rec.repChar) || null });
    }

    /* ── 로그아웃 ── */
    if (action === 'logout') {
      await redis.del('auth:tok:' + token);
      return res.status(200).json({ ok: true });
    }

    return bad(res, 400, '알 수 없는 요청입니다');
  } catch (e) {
    return bad(res, 500, '서버 오류가 발생했습니다');
  }
};
