/* ═══════════════════════════════════════════════
   bosspush.js — 보스 일정 알림 (앱이 닫혀 있어도 오는 푸시)

   캘린더 일정은 원래 이 브라우저의 localStorage에만 있어서 서버가 알 수 없다.
   알림을 보내려면 서버가 "언제 알릴지"를 알아야 하므로, 알림을 켠 사람에 한해
   알릴 시각과 보여줄 문구만 서버에 올린다. 캐릭터 정보나 획득 아이템 기록 같은
   나머지 데이터는 보내지 않는다.

   일정이 바뀌면(추가·삭제·반복 등록) 다시 올려야 하므로 bpSync()를 부른다.
═══════════════════════════════════════════════ */

/* 보스 시각 기준 몇 분 전에 알릴지. 0이면 정각에 알린다.
   30분 전으로 바꾸고 싶으면 이 값만 30으로 고치면 된다. */
const BP_NOTIFY_BEFORE_MIN = 0;

const BP_ENABLED_KEY = 'boss_push_enabled';

/* 서버가 준 base64 공개키를 구독 API가 요구하는 바이트 배열로 바꾼다 */
function bpUrlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/* 캘린더는 시각을 12시간제(오전/오후 + 1~12시)로 들고 있다.
   '오전 12시'는 자정(0시), '오후 12시'는 정오(12시)라는 점에 주의. */
function bpEventEpoch(dateStr, ev) {
  const [y, m, d] = dateStr.split('-').map(Number);
  let h = Number(ev.h) || 0;
  if (ev.ampm === '오후') { if (h < 12) h += 12; }
  else { if (h === 12) h = 0; }
  return new Date(y, m - 1, d, h, Number(ev.mi) || 0, 0, 0).getTime();
}

/* 앞으로 올 일정을 알림 항목으로 바꾼다. 캐릭터를 가리지 않고 이 기기에 저장된
   전부를 대상으로 한다 — 알림은 "이 폰을 쓰는 사람" 기준이 자연스럽기 때문. */
function bpCollectItems() {
  let evData = {};
  try { evData = JSON.parse(localStorage.getItem(STORAGE_KEYS.mapleCalEvents)) || {}; } catch {}

  const now = Date.now();
  const offset = BP_NOTIFY_BEFORE_MIN * 60 * 1000;
  const items = [];

  for (const [ds, list] of Object.entries(evData)) {
    if (!Array.isArray(list)) continue;
    for (const ev of list) {
      const at = bpEventEpoch(ds, ev) - offset;
      if (at <= now) continue;                    // 이미 지난 건 보낼 필요가 없다
      const ch = (typeof mcChar === 'function' && mcChar(ev.c)) || null;
      const what = ev.text || '보스';
      // 캐릭터가 지워졌을 수도 있으므로 이름이 없으면 그 부분만 빼고 문장을 만든다
      items.push({
        id: ev.id,
        at,
        title: ch ? `지금은 ${ch.name}의 ${what} 일정 시간입니다` : `지금은 ${what} 일정 시간입니다`,
        body: '준비 되셨나요?',
      });
    }
  }
  items.sort((a, b) => a.at - b.at);
  return items;
}

function bpIsEnabled() {
  try { return localStorage.getItem(BP_ENABLED_KEY) === '1'; } catch { return false; }
}

function bpSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/* 켜기 — 권한을 받고 구독한 뒤 일정을 올린다.
   실패 사유를 문자열로 돌려주면 UI에서 그대로 보여줄 수 있다. */
async function bpEnable() {
  if (!bpSupported()) return { ok: false, msg: '이 브라우저는 알림을 지원하지 않아요.' };

  // 아이폰은 홈 화면에 추가한 상태에서만 알림을 받을 수 있다
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIOS && !standalone) {
    return { ok: false, msg: '아이폰은 홈 화면에 추가한 뒤에만 알림을 받을 수 있어요. 먼저 설치해주세요.' };
  }

  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, msg: '알림이 차단되어 있어요. 브라우저 설정에서 알림을 허용해주세요.' };
  }

  const keyRes = await fetch('/api/push-key').then(r => r.json()).catch(() => null);
  if (!keyRes || !keyRes.ok) return { ok: false, msg: '서버 설정이 아직 안 됐어요.' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bpUrlB64ToUint8(keyRes.key),
    }).catch(() => null);
  }
  if (!sub) return { ok: false, msg: '알림 구독에 실패했어요.' };

  try { localStorage.setItem(BP_ENABLED_KEY, '1'); } catch {}
  const r = await bpSync();
  if (!r.ok) return { ok: false, msg: '일정을 서버에 올리지 못했어요.' };
  return { ok: true, count: r.count };
}

async function bpDisable() {
  try { localStorage.setItem(BP_ENABLED_KEY, '0'); } catch {}
  if (!bpSupported()) return { ok: true };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, unsubscribe: true }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return { ok: true };
}

/* 지금 저장된 일정을 서버에 올린다. 켜져 있지 않으면 아무것도 하지 않는다. */
async function bpSync() {
  if (!bpIsEnabled() || !bpSupported()) return { ok: true, count: 0, skipped: true };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: false, count: 0 };

  const items = bpCollectItems();
  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub, items }),
  }).then(r => r.json()).catch(() => null);

  if (!res || !res.ok) return { ok: false, count: 0 };
  return { ok: true, count: res.count };
}

// 앱을 열 때마다 한 번 맞춰둔다 — 다른 기기에서 일정을 바꿨거나 시간이 지나
// 목록이 낡았을 수 있기 때문
window.addEventListener('load', () => { bpSync().catch(() => {}); });
