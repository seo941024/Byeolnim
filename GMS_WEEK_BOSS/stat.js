/* ═══════════════════════════════════════════════
   환산주스탯 도우미 — GMS STAT 창 OCR → maplescouter 콘솔코드
═══════════════════════════════════════════════ */

const STAT_JOB_TYPES = [
  { label: 'STR/DEX — 전사 / 해적 일부', stat: ['STR','DEX'],      third: 'ATK'  },
  { label: 'DEX/STR — 궁수 / 해적',      stat: ['DEX','STR'],      third: 'ATK'  },
  { label: 'INT/LUK — 마법사',           stat: ['INT','LUK'],      third: 'MATK' },
  { label: 'LUK/DEX — 도적',             stat: ['LUK','DEX'],      third: 'ATK'  },
  { label: 'STR/DEX/LUK — 제논',         stat: ['STR','DEX','LUK'], third: 'ATK' },
  { label: 'HP — 데몬어벤져',             stat: ['HP'],             third: 'ATK'  },
];

/* OCR 텍스트 → 필드값 파싱 */
function parseStatWindow(text) {
  const get = (re) => { const m = text.match(re); return m ? m[1].replace(/,/g,'') : ''; };
  return {
    level:        get(/Lv[\. ]+(\d+)/i),
    STR:          get(/\bSTR\b\s+([\d,]+)/),
    DEX:          get(/\bDEX\b\s+([\d,]+)/),
    INT:          get(/\bINT\b\s+([\d,]+)/),
    LUK:          get(/\bLUK\b\s+([\d,]+)/),
    HP:           get(/\bHP\b\s+([\d,]+)/),
    ATK:          get(/ATTACK POWER\s+[▲▼]?\s*([\d,]+)/),
    MATK:         get(/MAGIC ATT\s+([\d,]+)/),
    DAMAGE:       get(/(?<![A-Z ])DAMAGE\s+[▲▼]?\s*([\d.]+)%/),
    BOSS_DAMAGE:  get(/BOSS DAMAGE\s+([\d.]+)%/),
    FINAL_DAMAGE: get(/FINAL DAMAGE\s+([\d.]+)%/),
    IGNORE_DEF:   get(/IGNORE DEFENSE\s+([\d.]+)%/),
    NORMAL_DMG:   get(/NORMAL ENEMY DAMAGE\s+([\d.]+)%/),
    CRIT_RATE:    get(/CRITICAL RATE\s+[▲▼]?\s*([\d.]+)%/),
    CRIT_DMG:     get(/CRITICAL DAMAGE\s+([\d.]+)%/),
    CD_SEC:       get(/COOLDOWN REDUCTION\s+([\d.]+)\s*sec/),
    CD_PCT:       get(/COOLDOWN REDUCTION\s+[\d.]+ sec \/ ([\d.]+)%/),
    BUFF_DUR:     get(/BUFF DURATION\s+([\d.]+)%/),
    CD_NOT:       get(/COOLDOWN NOT APPLIED\s+([\d.]+)%/),
    IGNORE_ELEM:  get(/IGNORE ELEMENTAL RESISTANCE\s+([\d.]+)%/),
    ADD_STATUS:   get(/ADDITIONAL STATUS DAMAGE\s+([\d.]+)%/),
    SUMMONS:      get(/SUMMONS DURATION INCREASE\s+([\d.]+)%/),
  };
}

/* maplescouter /ko/input 필드 정의 */
function buildFields(jtIdx, parsed) {
  const jt  = STAT_JOB_TYPES[jtIdx];
  const rows = [];

  // 주스탯 행들 (최대 3행)
  const statKeys = jt.stat.slice(0, 3);
  statKeys.forEach((s, i) => {
    rows.push({ label: `${s} 기본수치`,  key: s,    idx: 3 + i*3, note: '합산값 입력 (% 분리 불가)' });
    rows.push({ label: `${s} % 수치`,   key: null,  idx: 4 + i*3, val: '0', note: '수동 입력' });
    rows.push({ label: `${s} % 미적용`, key: null,  idx: 5 + i*3, val: '0', note: '수동 입력' });
  });

  const direct = [
    { label: '기본 스공',          key: null,         idx: 12, val: '', note: '수동 입력' },
    { label: '데미지%',            key: 'DAMAGE',     idx: 13 },
    { label: '최종 데미지%',       key: 'FINAL_DAMAGE', idx: 14 },
    { label: '보스 데미지%',       key: 'BOSS_DAMAGE',  idx: 15 },
    { label: '방어율 무시%',       key: 'IGNORE_DEF',   idx: 16 },
    { label: '일반 데미지%',       key: 'NORMAL_DMG',   idx: 17 },
    { label: '공격력',             key: 'ATK',          idx: 18 },
    { label: '크리티컬 확률%',     key: 'CRIT_RATE',    idx: 19 },
    { label: '마력',               key: 'MATK',         idx: 20 },
    { label: '크리티컬 데미지%',   key: 'CRIT_DMG',     idx: 21 },
    { label: '재사용 감소(초)',    key: 'CD_SEC',        idx: 22 },
    { label: '재사용 감소(%)',     key: 'CD_PCT',        idx: 23 },
    { label: '버프 지속 시간%',    key: 'BUFF_DUR',     idx: 24 },
    { label: '재사용 미적용%',     key: 'CD_NOT',        idx: 25 },
    { label: '속성 내성 무시%',    key: 'IGNORE_ELEM',   idx: 26 },
    { label: '상태이상 추가뎀%',  key: 'ADD_STATUS',    idx: 27 },
    { label: '소환수 지속%',       key: 'SUMMONS',       idx: 28 },
    { label: '아케인 포스',        key: null,            idx: 29, val: '', note: '수동 입력' },
    { label: '어센틱/세이크리드 포스', key: null,        idx: 30, val: '', note: '수동 입력' },
  ];

  return [...rows, ...direct].map(f => ({
    ...f,
    val: f.val !== undefined ? f.val : (f.key ? (parsed[f.key] || '') : ''),
  }));
}

/* 콘솔코드 생성 */
function generateConsoleCode(fields) {
  const lines = [
    `// byeolnim.app 생성 — maplescouter.com/ko/input 콘솔(F12)에 붙여넣기`,
    `(function(){`,
    `  const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;`,
    `  const set=(i,v)=>{`,
    `    const el=document.querySelectorAll('input')[i];`,
    `    if(!el||v===''||v==null)return;`,
    `    s.call(el,String(v));`,
    `    el.dispatchEvent(new Event('input',{bubbles:true}));`,
    `    el.dispatchEvent(new Event('change',{bubbles:true}));`,
    `  };`,
  ];

  fields.forEach(f => {
    if (f.val !== '' && f.val != null) {
      lines.push(`  set(${f.idx},'${f.val}'); // ${f.label}`);
    }
  });

  lines.push(`})();`);
  return lines.join('\n');
}

/* ─── UI 렌더링 ─── */
function initStatOCR() {
  const sec = document.getElementById('sec-statocr');
  if (!sec) return;

  let _parsed   = {};
  let _fields   = [];
  let _jtIdx    = 0;
  let _tesseract = null;

  const jobOpts = STAT_JOB_TYPES.map((jt,i) =>
    `<option value="${i}">${jt.label}</option>`).join('');

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">환산주스탯 도우미</h2></div>
    <div class="sf-tabs" style="margin-bottom:12px">
      <button class="sf-tab active" id="statTabOcr">자동 추출 (OCR)</button>
      <button class="sf-tab" id="statTabManual">수동 입력</button>
    </div>
    <hr class="sec-sep" />

    <div class="sf-layout">
      <!-- 좌측 설정 -->
      <div class="card" style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div>
          <div class="card__title">직업 스탯 유형</div>
          <select class="sel w100" id="statJobType" style="margin-top:8px">${jobOpts}</select>
        </div>

        <!-- OCR 탭 -->
        <div id="statPanelOcr">
          <div class="card__title">STAT 창 스크린샷</div>
          <div class="stat-paste-zone" id="statPasteZone" tabindex="0">
            <p>여기에 스크린샷을 <b>붙여넣기 (Ctrl+V)</b></p>
            <p style="font-size:.75rem;color:var(--text-sub);margin-top:4px">또는 클릭하여 파일 선택</p>
            <input type="file" id="statFileInput" accept="image/*" style="display:none" />
          </div>
          <canvas id="statPreviewCanvas" style="display:none;max-width:100%;border-radius:8px;margin-top:8px"></canvas>
          <button class="sbtn sbtn--primary w100" id="statOcrBtn" style="margin-top:10px" disabled>OCR 실행</button>
          <div id="statOcrStatus" style="font-size:.78rem;color:var(--text-sub);margin-top:6px;text-align:center"></div>
        </div>

        <!-- 수동 탭 -->
        <div id="statPanelManual" style="display:none">
          <p style="font-size:.8rem;color:var(--text-sub)">아래 결과 테이블에 직접 값을 입력하세요.</p>
          <button class="sbtn sbtn--ghost w100" id="statManualInitBtn" style="margin-top:8px">테이블 초기화</button>
        </div>

        <div>
          <button class="sbtn sbtn--primary w100" id="statCopyBtn" disabled>📋 콘솔코드 복사</button>
          <p style="font-size:.72rem;color:var(--text-sub);margin-top:6px;line-height:1.6">
            복사 후 <a href="https://maplescouter.com/ko/input" target="_blank" style="color:var(--primary)">maplescouter 직접입력</a> 페이지에서<br>F12 → 콘솔 탭에 붙여넣고 Enter
          </p>
        </div>
      </div>

      <!-- 우측 결과 테이블 -->
      <div class="card" style="min-width:0;overflow-x:auto">
        <div class="card__title">추출 결과 <span style="font-size:.72rem;font-weight:400;color:var(--text-sub)">(수정 가능)</span></div>
        <div id="statResultTable" style="margin-top:10px">
          <p class="empty">OCR 실행 또는 수동 입력을 시작하세요.</p>
        </div>
      </div>
    </div>`;

  /* 탭 전환 */
  let ocrMode = true;
  sec.querySelector('#statTabOcr').addEventListener('click', () => {
    ocrMode = true;
    sec.querySelectorAll('.sf-tab').forEach(t => t.classList.remove('active'));
    sec.querySelector('#statTabOcr').classList.add('active');
    document.getElementById('statPanelOcr').style.display = '';
    document.getElementById('statPanelManual').style.display = 'none';
  });
  sec.querySelector('#statTabManual').addEventListener('click', () => {
    ocrMode = false;
    sec.querySelectorAll('.sf-tab').forEach(t => t.classList.remove('active'));
    sec.querySelector('#statTabManual').classList.add('active');
    document.getElementById('statPanelOcr').style.display = 'none';
    document.getElementById('statPanelManual').style.display = '';
    renderTable({});
  });

  document.getElementById('statManualInitBtn')?.addEventListener('click', () => renderTable({}));

  /* 직업 유형 변경 */
  document.getElementById('statJobType').addEventListener('change', e => {
    _jtIdx = parseInt(e.target.value);
    renderTable(_parsed);
  });

  /* 붙여넣기 영역 */
  const pasteZone = document.getElementById('statPasteZone');
  const fileInput = document.getElementById('statFileInput');
  const canvas    = document.getElementById('statPreviewCanvas');

  pasteZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
  });
  pasteZone.addEventListener('paste', handlePaste);
  document.addEventListener('paste', e => {
    if (document.getElementById('sec-statocr').classList.contains('active')) handlePaste(e);
  });

  function handlePaste(e) {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) loadImage(item.getAsFile());
  }

  function loadImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.style.display = 'block';
      pasteZone.style.display = 'none';
      document.getElementById('statOcrBtn').disabled = false;
      document.getElementById('statOcrStatus').textContent = '이미지 로드 완료 — OCR 실행 버튼을 누르세요.';
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* OCR 실행 */
  document.getElementById('statOcrBtn').addEventListener('click', async () => {
    const btn    = document.getElementById('statOcrBtn');
    const status = document.getElementById('statOcrStatus');
    btn.disabled = true;
    status.textContent = 'Tesseract 로딩 중...';

    try {
      if (!window.Tesseract) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      status.textContent = 'OCR 인식 중... (최초 실행 시 수십 초 소요)';

      const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text')
            status.textContent = `OCR 중... ${Math.round(m.progress * 100)}%`;
        }
      });

      _parsed = parseStatWindow(text);
      renderTable(_parsed);
      status.textContent = '✅ OCR 완료 — 값을 확인·수정 후 콘솔코드를 복사하세요.';
    } catch(e) {
      status.textContent = '❌ OCR 오류: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* 테이블 렌더링 */
  function renderTable(parsed) {
    _parsed = parsed;
    _jtIdx  = parseInt(document.getElementById('statJobType').value);
    _fields = buildFields(_jtIdx, parsed);

    const tbody = _fields.map((f, i) => {
      const hasVal  = f.val !== '' && f.val != null;
      const noteCls = f.note ? 'stat-note' : '';
      return `<tr>
        <td class="stat-lbl">${f.label}${f.note ? `<br><span class="stat-note">${f.note}</span>` : ''}</td>
        <td><input class="inp stat-val-inp" data-i="${i}" value="${f.val || ''}" placeholder="—" /></td>
        <td class="stat-idx">[${f.idx}]</td>
      </tr>`;
    }).join('');

    document.getElementById('statResultTable').innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:6px 8px;font-size:.78rem;color:var(--text-sub);border-bottom:1px solid var(--border)">필드</th>
          <th style="text-align:left;padding:6px 8px;font-size:.78rem;color:var(--text-sub);border-bottom:1px solid var(--border)">값</th>
          <th style="text-align:left;padding:6px 8px;font-size:.78rem;color:var(--text-sub);border-bottom:1px solid var(--border)">인덱스</th>
        </tr></thead>
        <tbody>${tbody}</tbody>
      </table>`;

    document.querySelectorAll('.stat-val-inp').forEach(inp => {
      inp.addEventListener('input', () => {
        _fields[parseInt(inp.dataset.i)].val = inp.value;
      });
    });

    document.getElementById('statCopyBtn').disabled = false;
  }

  /* 콘솔코드 복사 */
  document.getElementById('statCopyBtn').addEventListener('click', () => {
    const code = generateConsoleCode(_fields);
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('statCopyBtn');
      btn.textContent = '✅ 복사됨!';
      setTimeout(() => { btn.textContent = '📋 콘솔코드 복사'; }, 2000);
    });
  });
}

initStatOCR();
