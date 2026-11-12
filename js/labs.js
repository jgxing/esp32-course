/* ============================================================
   labs.js · 实验框架与共享组件
   各实验在 labs-a.js / labs-b.js 中通过 registerLab() 注册
   ============================================================ */

const LAB_DEFS = {};
function registerLab(id, def) { LAB_DEFS[id] = def; }

/* ---------------- 通用片段 ---------------- */
function labFrame(o) {
  return `
${o.controls ? `<div class="grid-2 equal">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>实验参数</h2><span class="sub">拖动即可实时改变现象</span></div>
    <div class="card-body"><div class="controls">${o.controls}</div>${o.controlNote || ''}</div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>电路与器件状态</h2></div>
    <div class="card-body">${o.stage || ''}</div></div>
</div>` : ''}

${o.wave ? `<div class="card" style="margin-top:18px"><div class="card-head"><span class="dot"></span><h2>${o.waveTitle || '实时波形与测量'}</h2><span class="sub">${o.waveSub || '仿真视图 · 非示波器实测'}</span></div>
  <div class="card-body">${o.wave}${o.readout || ''}</div></div>` : ''}

${o.extra || ''}

${o.theory ? `<div class="card" style="margin-top:18px"><div class="card-head"><span class="dot"></span><h2>原理深入 · 为什么是这样</h2><span class="sub">先动手观察现象，再回头理解机理</span></div>
  <div class="card-body">${o.theory}</div></div>` : ''}

<div class="grid-2 equal" style="margin-top:18px">
  <div>${o.code || ''}${o.codeNote || ''}</div>
  <div class="stack">
    ${o.terminal ? `<div class="card"><div class="card-head"><span class="dot"></span><h2>串口监视器</h2><span class="sub">115200 baud</span></div><div class="card-body">${o.terminal}<div class="btn-row" style="margin-top:10px"><button class="btn sm" data-term-clear>清空</button></div></div></div>` : ''}
    ${o.questions ? `<div class="card"><div class="card-head"><span class="dot"></span><h2>思考题</h2></div><div class="card-body">${questions(o.questions)}</div></div>` : ''}
  </div>
</div>`;
}
function questions(list) {
  return '<ol class="think-list">' + list.map(q => '<li>' + q + '</li>').join('') + '</ol>';
}

/* ---------------- 控件 ---------------- */
function slider(id, label, min, max, step, val, unit, shown) {
  return `<div class="field"><label>${label}<b class="val" data-out="${id}">${shown !== undefined ? shown : val + (unit || '')}</b></label>
    <input type="range" data-ctrl="${id}" data-numeric="1" data-unit="${unit || ''}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
}
function selectCtrl(id, label, options, val, numeric) {
  return `<div class="field"><label>${label}</label><select data-ctrl="${id}" ${numeric ? 'data-numeric="1"' : ''}>` +
    options.map(o => {
      const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`;
    }).join('') + '</select></div>';
}
function switchCtrl(id, label, on) {
  return `<label class="switch-row" style="padding:6px 0"><input type="checkbox" data-ctrl="${id}" ${on ? 'checked' : ''} style="display:none"><span class="switch ${on ? 'on' : ''}" data-sw="${id}"></span><span>${label}</span></label>`;
}
function segCtrl(id, options, active) {
  return `<div class="field" style="grid-column:1/-1"><label>${options.label || '模式'}</label><div class="seg" data-seg="${id}">` +
    options.items.map(o => `<button type="button" data-v="${o[0]}" class="${o[0] === active ? 'on' : ''}">${o[1]}</button>`).join('') +
    '</div></div>';
}
function onCtrl(root, id, fn, fmt) {
  const el = $('[data-ctrl="' + id + '"]', root);
  if (!el) return null;
  const fire = () => {
    const isNum = el.type === 'range' || el.dataset.numeric === '1';
    let v = el.type === 'checkbox' ? el.checked : (isNum ? Number(el.value) : el.value);
    const out = $('[data-out="' + id + '"]', root);
    if (out) {
      const custom = fmt ? fmt(v) : undefined;
      out.textContent = custom !== undefined ? custom
        : (el.dataset.unit && typeof v === 'number' ? v + el.dataset.unit : (typeof v === 'boolean' ? (v ? '开' : '关') : v));
    }
    if (el.type === 'checkbox') {
      const sw = $('[data-sw="' + id + '"]', root);
      if (sw) sw.classList.toggle('on', v);
    }
    fn(v, el);
  };
  el.addEventListener('input', fire);
  el.addEventListener('change', fire);
  return { el, fire };
}
function onSeg(root, id, fn) {
  const box = $('[data-seg="' + id + '"]', root);
  if (!box) return null;
  $$('button', box).forEach(b => b.onclick = () => {
    $$('button', box).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    fn(b.dataset.v, b);
  });
  return box;
}
function segValue(root, id) {
  const b = $('[data-seg="' + id + '"] button.on', root);
  return b ? b.dataset.v : '';
}
function simPanel(title, body, liveId) {
  return `<div class="sim-panel"><div class="sim-title">${title}${liveId ? `<span class="live" id="${liveId}">RUNNING</span>` : ''}</div>${body}</div>`;
}
function readout(items) {
  return '<div class="readout">' + items.map(it =>
    `<div class="ro"><span>${it[0]}</span><b class="${it[2] || ''}" data-read="${it[1]}">${it[3] !== undefined ? it[3] : '--'}</b></div>`
  ).join('') + '</div>';
}
function terminalBox(id) { return `<div class="terminal" id="${id}"></div>`; }
function bindTermClear(root) {
  const b = $('[data-term-clear]', root);
  if (b) {
    const t = $('.terminal', root);
    b.onclick = () => { if (t) t.innerHTML = ''; };
  }
}
function legend(items) {
  return '<div class="canvas-legend">' + items.map(i => `<span><i style="background:${i[1]}"></i>${i[0]}</span>`).join('') + '</div>';
}

/* ---------------- 共享电路图 ---------------- */
function ledCircuit() {
  return `<svg viewBox="0 0 560 210" class="raw" xmlns="http://www.w3.org/2000/svg" aria-label="ESP32 驱动 LED 电路">
    <defs><linearGradient id="boardG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8eef5"/><stop offset="1" stop-color="#cdd9e6"/></linearGradient>
    <filter id="ledBlur"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <rect x="18" y="28" width="126" height="154" rx="10" fill="url(#boardG)" stroke="#8fa4b8" stroke-width="2"/>
    <rect x="36" y="52" width="90" height="58" rx="4" fill="#4a5f73"/><text id="chipLabel" x="81" y="85" font-size="12" fill="#eaf3fa" text-anchor="middle" font-family="monospace">ESP32</text>
    <rect x="52" y="118" width="58" height="22" rx="3" fill="#9aaec0"/><text x="81" y="133" font-size="10" fill="#243645" text-anchor="middle" font-family="monospace">USB</text>
    <path d="M144 76 H200" stroke="#455c70" stroke-width="3" fill="none"/>
    <text id="pinLabel" x="172" y="66" font-size="12" fill="#0d7c72" text-anchor="middle" font-family="monospace" font-weight="bold">GPIO2</text>
    <path d="M200 76 l8 -10 l12 20 l12 -20 l12 20 l8 -10" stroke="#455c70" stroke-width="2.5" fill="none"/>
    <text id="resLabel" x="226" y="106" font-size="11" fill="#52637a" text-anchor="middle" font-family="monospace">220 Ω</text>
    <path d="M252 76 H308" stroke="#455c70" stroke-width="3" fill="none"/>
    <circle id="ledGlow" cx="335" cy="76" r="26" fill="#ffd34d" opacity="0" filter="url(#ledBlur)"/>
    <polygon points="310,60 310,92 340,76" fill="#e0524d" stroke="#92322f" stroke-width="2"/>
    <path d="M342 58 V94" stroke="#92322f" stroke-width="3"/>
    <path d="M322 58 l10 -12 M334 58 l10 -12" stroke="#e0a23a" stroke-width="2" stroke-linecap="round"/>
    <text x="335" y="116" font-size="11" fill="#52637a" text-anchor="middle" font-family="monospace">LED</text>
    <path d="M342 76 H452 V166 H144" stroke="#455c70" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <path d="M452 166 h-16 M444 166 h-16 M436 166 h-16" stroke="#455c70" stroke-width="2"/>
    <text x="60" y="172" font-size="11" fill="#52637a" font-family="monospace">GND</text>
    <circle id="wireDot" cx="270" cy="76" r="5" fill="#0d7c72" opacity="0"/>
    <circle cx="420" cy="166" r="5" fill="#0d7c72" opacity="0" id="wireDot2"/>
  </svg>`;
}
function buttonCircuit() {
  return `<svg viewBox="0 0 560 210" class="raw" xmlns="http://www.w3.org/2000/svg" aria-label="ESP32 按键输入电路">
    <rect x="18" y="28" width="126" height="154" rx="10" fill="#e8eef5" stroke="#8fa4b8" stroke-width="2"/>
    <rect x="36" y="52" width="90" height="58" rx="4" fill="#4a5f73"/><text x="81" y="85" font-size="12" fill="#eaf3fa" text-anchor="middle" font-family="monospace">ESP32</text>
    <text id="btnPinLabel" x="172" y="60" font-size="12" fill="#0d7c72" text-anchor="middle" font-family="monospace" font-weight="bold">GPIO4</text>
    <path d="M144 76 H300" stroke="#455c70" stroke-width="3" fill="none"/>
    <circle cx="230" cy="76" r="4" fill="#455c70"/><text x="230" y="62" font-size="10" fill="#52637a" text-anchor="middle" font-family="monospace">采样点</text>
    <path d="M230 76 V112" stroke="#455c70" stroke-width="2.5" fill="none"/>
    <path d="M202 112 H258" stroke="#455c70" stroke-width="3" fill="none"/>
    <path id="btnContact" d="M212 112 L248 132" stroke="#0d7c72" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="212" cy="112" r="4" fill="#455c70"/><circle cx="248" cy="112" r="4" fill="#455c70"/>
    <path d="M230 132 V164" stroke="#455c70" stroke-width="3" fill="none"/>
    <path d="M212 164 h36 M216 170 h28 M222 176 h16" stroke="#455c70" stroke-width="2.5"/>
    <text x="298" y="120" font-size="11" fill="#52637a" font-family="monospace">按键 → GND</text>
    <text id="pullLabel" x="330" y="60" font-size="11" fill="#2563eb" font-family="monospace">内部上拉 45 kΩ → 3.3 V</text>
    <path d="M300 76 H420 V164 H144" stroke="#455c70" stroke-width="3" fill="none" opacity="0" stroke-linejoin="round"/>
    <rect id="btnStateChip" x="300" y="140" width="150" height="30" rx="8" fill="#e2f4ec"/>
    <text id="btnStateText" x="375" y="160" font-size="12" fill="#16835c" text-anchor="middle" font-family="monospace" font-weight="bold">松开 · HIGH</text>
  </svg>`;
}
function boardTopology() {
  return `<svg viewBox="0 0 560 210" class="raw" xmlns="http://www.w3.org/2000/svg" aria-label="网络拓扑">
    <defs><marker id="arw" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#8fa4b8"/></marker></defs>
    <g font-family="monospace" font-size="11" text-anchor="middle">
      <rect x="18" y="70" width="90" height="62" rx="9" fill="#e0f3ef" stroke="#0d7c72" stroke-width="2"/>
      <text x="63" y="96" fill="#0d7c72" font-weight="bold">ESP32</text><text x="63" y="114" fill="#52637a" font-size="9">STA / Sensor</text>
      <rect x="158" y="70" width="90" height="62" rx="9" fill="#e7efff" stroke="#2563eb" stroke-width="2"/>
      <text x="203" y="96" fill="#2563eb" font-weight="bold">无线 AP</text><text x="203" y="114" fill="#52637a" font-size="9">2.4 GHz</text>
      <rect x="298" y="70" width="90" height="62" rx="9" fill="#f0e9fc" stroke="#7c4dd6" stroke-width="2"/>
      <text x="343" y="96" fill="#7c4dd6" font-weight="bold">Broker</text><text x="343" y="114" fill="#52637a" font-size="9">MQTT :1883</text>
      <rect x="438" y="70" width="104" height="62" rx="9" fill="#fdf1dc" stroke="#d97706" stroke-width="2"/>
      <text x="490" y="96" fill="#d97706" font-weight="bold">看板 / 手机</text><text x="490" y="114" fill="#52637a" font-size="9">Subscriber</text>
    </g>
    <path d="M108 101 H156" stroke="#8fa4b8" stroke-width="2" marker-end="url(#arw)"/>
    <path d="M248 101 H296" stroke="#8fa4b8" stroke-width="2" marker-end="url(#arw)"/>
    <path d="M388 101 H436" stroke="#8fa4b8" stroke-width="2" marker-end="url(#arw)"/>
    <text x="132" y="90" font-size="9" fill="#52637a" text-anchor="middle" font-family="monospace">WiFi</text>
    <text x="272" y="90" font-size="9" fill="#52637a" text-anchor="middle" font-family="monospace">TCP/IP</text>
    <text x="412" y="90" font-size="9" fill="#52637a" text-anchor="middle" font-family="monospace">Topic</text>
    <path id="pktPath" d="M108 101 H156 M248 101 H296 M388 101 H436" fill="none" stroke="none"/>
    <circle id="pkt1" cx="108" cy="101" r="6" fill="#0d7c72" opacity="0"/>
    <circle id="pkt2" cx="248" cy="101" r="6" fill="#2563eb" opacity="0"/>
    <circle id="pkt3" cx="388" cy="101" r="6" fill="#d97706" opacity="0"/>
    <text id="topoStatus" x="280" y="172" font-size="12" fill="#52637a" text-anchor="middle" font-family="monospace">未连接</text>
  </svg>`;
}

/* ---------------- 通用启动助手 ---------------- */
function startScope(root, canvasId, buildOpts, fps) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  let acc = 0;
  Clock.add(canvasId, (t, dt) => {
    acc += dt;
    if (acc < (fps ? 1000 / fps : 16)) return;
    acc = 0;
    scope(cv, buildOpts(t));
  });
  scope(cv, buildOpts(0));
}
function toggleRun(root, btnId, liveId, onStop, onStart) {
  const btn = $('#' + btnId, root), live = liveId ? $('#' + liveId, root) : null;
  if (!btn) return { isRunning: () => true };
  let running = true;
  btn.onclick = () => {
    running = !running;
    btn.textContent = running ? '⏸ 暂停仿真' : '▶ 继续仿真';
    btn.classList.toggle('primary', !running);
    if (live) { live.classList.toggle('running', running); live.textContent = running ? 'RUNNING' : 'PAUSED'; }
    if (running) { if (onStart) onStart(); } else { if (onStop) onStop(); }
  };
  return { isRunning: () => running, setRunning(v) { running = v; btn.textContent = v ? '⏸ 暂停仿真' : '▶ 继续仿真'; if (live) { live.classList.toggle('running', v); live.textContent = v ? 'RUNNING' : 'PAUSED'; } } };
}
