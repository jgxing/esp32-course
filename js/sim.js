/* ============================================================
   sim.js · 可视化与仿真基础设施
   - 统一动画时钟 Clock（切换章节自动清理）
   - Canvas 高 DPI 绘制：示波器、曲线、时序、甘特、直方图
   - 代码语法高亮、终端日志、小工具
   ============================================================ */

const $ = (id, root) => (root || document).querySelector(id);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

/* ---------------- 统一动画时钟 ---------------- */
const Clock = {
  tasks: new Map(), t: 0, last: 0, raf: 0, running: false,
  add(key, fn) { this.tasks.set(key, fn); if (!this.running) this.start(); return () => this.remove(key); },
  remove(key) { this.tasks.delete(key); },
  clear() { this.tasks.clear(); this.t = 0; this.last = 0; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.running = false; },
  start() {
    this.running = true; this.last = 0;
    const loop = ts => {
      if (!this.running) return;
      const dt = this.last ? Math.min(60, ts - this.last) : 16;
      this.last = ts; this.t += dt;
      for (const [k, fn] of Array.from(this.tasks)) {
        try { fn(this.t, dt); } catch (e) { console.error('[clock:' + k + ']', e); this.tasks.delete(k); }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
};

/* ---------------- Canvas 基础 ---------------- */
function prep(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 150;
  const nw = Math.round(w * dpr), nh = Math.round(h * dpr);
  if (canvas.width !== nw || canvas.height !== nh) { canvas.width = nw; canvas.height = nh; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = cssVar('--surface');
  ctx.fillRect(0, 0, w, h);
  return { ctx, w, h };
}

function grid(ctx, w, h, pad, rows, cols) {
  ctx.save();
  ctx.strokeStyle = cssVar('--border'); ctx.lineWidth = 1;
  ctx.globalAlpha = .85;
  const x0 = pad.l, y0 = pad.t, gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  for (let i = 0; i <= rows; i++) {
    const y = Math.round(y0 + gh * i / rows) + .5;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + gw, y); ctx.stroke();
  }
  for (let i = 0; i <= cols; i++) {
    const x = Math.round(x0 + gw * i / cols) + .5;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + gh); ctx.stroke();
  }
  ctx.restore();
}

function label(ctx, text, x, y, color, align, size) {
  ctx.save();
  ctx.fillStyle = color || cssVar('--text-3');
  ctx.font = (size || 10) + 'px ' + '"JetBrains Mono", Consolas, monospace';
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * 示波器：以「当前时刻 t」为右边界，向左回溯 window ms，按通道函数重绘。
 * channels: [{ fn(t)->0/1/数值, color, label, type:'step'|'line', lane:0..n-1, base, amp }]
 */
function scope(canvas, opts) {
  const { ctx, w, h } = prep(canvas);
  const windowMs = opts.window || 1000;
  const lanes = opts.channels.length;
  const pad = { l: opts.padL || 46, r: 12, t: 10, b: 22 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  const laneH = gh / lanes;
  const N = Math.max(220, Math.min(1400, Math.round(gw * 1.5)));
  const t0 = (opts.now || Clock.t) - windowMs;

  grid(ctx, w, h, pad, lanes * 2, opts.cols || 8);

  // 左侧通道标签
  opts.channels.forEach((ch, i) => {
    const cy = pad.t + laneH * (i + .5);
    label(ctx, ch.label || ('CH' + i), 6, cy, ch.color || cssVar('--text-2'), 'left', 10);
  });
  // 时间轴
  for (let i = 0; i <= (opts.cols || 8); i++) {
    const x = pad.l + gw * i / (opts.cols || 8);
    const tv = t0 + windowMs * i / (opts.cols || 8);
    const ttext = opts.timeFmt ? opts.timeFmt(tv, i, opts.cols || 8, windowMs)
      : (opts.timeUnit === 's' ? (tv / 1000).toFixed(1) + 's' : Math.round(tv) + 'ms');
    label(ctx, ttext, x, h - 10, cssVar('--text-3'), i === 0 ? 'left' : (i === (opts.cols || 8) ? 'right' : 'center'), 9.5);
  }

  opts.channels.forEach((ch, li) => {
    const hi = pad.t + laneH * li + 6;
    const lo = pad.t + laneH * (li + 1) - 6;
    const base = ch.base !== undefined ? ch.base : lo;
    const amp = ch.amp !== undefined ? ch.amp : (lo - hi);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t + laneH * li, gw, laneH);
    ctx.clip();
    ctx.strokeStyle = ch.color || cssVar('--primary');
    ctx.lineWidth = ch.width || 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const tt = t0 + windowMs * i / N;
      const x = pad.l + gw * i / N;
      let v;
      try { v = ch.fn(tt); } catch (e) { v = 0; }
      const y = base - clamp(v, 0, 1) * amp;
      if (i === 0) { ctx.moveTo(x, y); prev = y; }
      else if (ch.type === 'step') {
        if (Math.abs(y - prev) > .01) { ctx.lineTo(x, prev); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
        prev = y;
      } else { ctx.lineTo(x, y); prev = y; }
    }
    ctx.stroke();
    if (ch.fill) {
      ctx.lineTo(pad.l + gw, base); ctx.lineTo(pad.l, base); ctx.closePath();
      ctx.globalAlpha = .14; ctx.fillStyle = ch.color; ctx.fill();
    }
    ctx.restore();
  });

  // 右侧游标
  ctx.save();
  ctx.strokeStyle = cssVar('--primary'); ctx.globalAlpha = .5; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(w - pad.r, pad.t); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
  ctx.restore();
  return { ctx, w, h, pad, gw, gh };
}

/** 连续曲线图：series = [{ data:[{x,y}], color, label, fill, dash }] */
function lineChart(canvas, opts) {
  const { ctx, w, h } = prep(canvas);
  const pad = { l: 42, r: 12, t: 12, b: 22 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  const xMin = opts.xMin, xMax = opts.xMax, yMin = opts.yMin, yMax = opts.yMax;
  grid(ctx, w, h, pad, opts.rows || 4, opts.cols || 6);
  for (let i = 0; i <= (opts.rows || 4); i++) {
    const v = yMax - (yMax - yMin) * i / (opts.rows || 4);
    label(ctx, (opts.yFmt ? opts.yFmt(v) : v.toFixed(1)), pad.l - 6, pad.t + gh * i / (opts.rows || 4), cssVar('--text-3'), 'right', 9.5);
  }
  for (let i = 0; i <= (opts.cols || 6); i++) {
    const v = xMin + (xMax - xMin) * i / (opts.cols || 6);
    label(ctx, (opts.xFmt ? opts.xFmt(v) : v.toFixed(0)), pad.l + gw * i / (opts.cols || 6), h - 9, cssVar('--text-3'), 'center', 9.5);
  }
  (opts.series || []).forEach(s => {
    if (!s.data || s.data.length < 2) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(pad.l, pad.t, gw, gh); ctx.clip();
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2;
    if (s.dash) ctx.setLineDash(s.dash);
    ctx.beginPath();
    s.data.forEach((p, i) => {
      const x = pad.l + (p.x - xMin) / (xMax - xMin || 1) * gw;
      const y = pad.t + (yMax - clamp(p.y, yMin, yMax)) / (yMax - yMin || 1) * gh;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    if (s.fill) {
      ctx.lineTo(pad.l + gw, pad.t + gh); ctx.lineTo(pad.l, pad.t + gh); ctx.closePath();
      ctx.globalAlpha = .13; ctx.fillStyle = s.color; ctx.fill();
    }
    ctx.restore();
  });
  if (opts.threshold !== undefined) {
    const y = pad.t + (yMax - opts.threshold) / (yMax - yMin) * gh;
    ctx.save(); ctx.strokeStyle = cssVar('--red'); ctx.setLineDash([5, 4]); ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke(); ctx.restore();
    label(ctx, opts.thresholdLabel || '阈值', pad.l + gw - 4, y - 8, cssVar('--red'), 'right', 9.5);
  }
  return { ctx, w, h, pad, gw, gh };
}

/** 柱状图：items=[{label, value, color}]，value 已经归一化到 0..1 或由 max 归一 */
function barChart(canvas, opts) {
  const { ctx, w, h } = prep(canvas);
  const pad = { l: 40, r: 12, t: 14, b: 34 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  grid(ctx, w, h, pad, 4, 4);
  const items = opts.items || [], max = opts.max || 1;
  const bw = Math.min(64, gw / (items.length * 1.8));
  const step = gw / Math.max(1, items.length);
  items.forEach((it, i) => {
    const x = pad.l + step * (i + .5);
    const bh = clamp(it.value / max, 0, 1) * gh;
    ctx.fillStyle = it.color || cssVar('--primary');
    ctx.beginPath();
    const y = pad.t + gh - bh;
    if (ctx.roundRect) { ctx.roundRect(x - bw / 2, y, bw, bh, [4, 4, 0, 0]); ctx.fill(); }
    else ctx.fillRect(x - bw / 2, y, bw, bh);
    label(ctx, opts.valueFmt ? opts.valueFmt(it.value) : it.value.toFixed(1), x, y - 8, cssVar('--text-2'), 'center', 10);
    label(ctx, it.label, x, h - 20, cssVar('--text-2'), 'center', 10);
    if (it.sub) label(ctx, it.sub, x, h - 8, cssVar('--text-3'), 'center', 9);
  });
  return { ctx, w, h };
}

/** 直方图（ADC 码值分布） */
function histogram(canvas, values, opts) {
  const { ctx, w, h } = prep(canvas);
  const pad = { l: 36, r: 12, t: 12, b: 22 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  grid(ctx, w, h, pad, 4, 8);
  const bins = opts.bins || 32, maxV = opts.max || 1;
  const counts = new Array(bins).fill(0);
  values.forEach(v => { const i = clamp(Math.floor(v / maxV * bins), 0, bins - 1); counts[i]++; });
  const peak = Math.max(1, ...counts);
  const bw = gw / bins;
  counts.forEach((c, i) => {
    const bh = c / peak * gh;
    ctx.fillStyle = opts.color || cssVar('--blue');
    ctx.globalAlpha = .85;
    ctx.fillRect(pad.l + i * bw + .5, pad.t + gh - bh, Math.max(1, bw - 1), bh);
  });
  ctx.globalAlpha = 1;
  label(ctx, '0', pad.l, h - 9, cssVar('--text-3'), 'left', 9.5);
  label(ctx, String(maxV), pad.l + gw, h - 9, cssVar('--text-3'), 'right', 9.5);
  label(ctx, opts.title || '分布', pad.l + 6, pad.t + 10, cssVar('--text-3'), 'left', 9.5);
  return { ctx, w, h };
}

/** 数字时序图：channels=[{name,color,bits:[{t0,t1,v}], labels}]，progress 控制动画高亮 */
function timing(canvas, opts) {
  const { ctx, w, h } = prep(canvas);
  const chs = opts.channels || [];
  const pad = { l: 62, r: 14, t: 16, b: 26 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  const laneH = gh / Math.max(1, chs.length);
  const total = opts.total || 1;
  const prog = opts.progress === undefined ? 1 : opts.progress;
  const X = t => pad.l + t / total * gw;

  // 位分隔
  ctx.save(); ctx.strokeStyle = cssVar('--border'); ctx.setLineDash([3, 4]);
  (opts.marks || []).forEach(m => {
    const x = X(m.t);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
    if (m.label) label(ctx, m.label, x + 3, pad.t + 6, cssVar('--text-3'), 'left', 9);
  });
  ctx.restore();

  chs.forEach((ch, i) => {
    const top = pad.t + laneH * i + 6, bot = pad.t + laneH * (i + 1) - 6;
    const hi = top + 3, lo = bot - 3;
    label(ctx, ch.name, 6, (hi + lo) / 2, ch.color || cssVar('--text-2'), 'left', 10.5);
    ctx.save();
    ctx.strokeStyle = ch.color || cssVar('--primary'); ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    let prevV = null;
    (ch.bits || []).forEach(b => {
      const x0 = X(b.t0), x1 = X(b.t1);
      const y = b.v ? hi : lo;
      if (prevV === null) ctx.moveTo(x0, y);
      else if (prevV !== b.v) { ctx.lineTo(x0, prevV ? hi : lo); ctx.lineTo(x0, y); }
      else ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
      prevV = b.v;
    });
    ctx.stroke();
    // 上升/下降沿小标记
    (ch.bits || []).forEach(b => {
      if (b.edge) {
        const x = X(b.edge === 'start' ? b.t0 : b.t1);
        ctx.save(); ctx.strokeStyle = cssVar('--amber'); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, hi - 4); ctx.lineTo(x, lo + 4); ctx.stroke(); ctx.restore();
      }
    });
    ctx.restore();
    // 每位数值标注
    (ch.bits || []).forEach(b => {
      if (b.text !== undefined) label(ctx, b.text, (X(b.t0) + X(b.t1)) / 2, hi - 9, cssVar('--text-2'), 'center', 9.5);
    });
  });

  if (prog < 1) {
    const x = X(total * prog);
    ctx.save();
    ctx.fillStyle = cssVar('--primary'); ctx.globalAlpha = .07;
    ctx.fillRect(x, pad.t, w - pad.r - x, gh);
    ctx.globalAlpha = 1; ctx.strokeStyle = cssVar('--primary'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
    ctx.restore();
  }
  return { ctx, w, h };
}

/** 甘特图：tasks=[{name,color,segments:[{t0,t1,state:'run'|'ready'|'block'}]}] */
function gantt(canvas, opts) {
  const { ctx, w, h } = prep(canvas);
  const tasks = opts.tasks || [];
  const pad = { l: 96, r: 14, t: 16, b: 24 };
  const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;
  const rowH = gh / Math.max(1, tasks.length);
  const total = opts.total || 1000;
  const X = t => pad.l + clamp(t, 0, total) / total * gw;
  grid(ctx, w, h, pad, tasks.length, 10);
  tasks.forEach((task, i) => {
    const y = pad.t + rowH * i + 5, bh = Math.max(9, rowH - 12);
    label(ctx, task.name, 6, y + bh / 2, cssVar('--text-2'), 'left', 10.5);
    (task.segments || []).forEach(s => {
      const x0 = X(s.t0), x1 = X(s.t1);
      ctx.save();
      if (s.state === 'run') { ctx.fillStyle = task.color || cssVar('--primary'); ctx.globalAlpha = .95; }
      else if (s.state === 'ready') { ctx.fillStyle = cssVar('--amber'); ctx.globalAlpha = .35; }
      else { ctx.fillStyle = cssVar('--border-strong'); ctx.globalAlpha = .55; }
      if (ctx.roundRect) { ctx.roundRect(x0, y, Math.max(1, x1 - x0), bh, 3); ctx.fill(); }
      else ctx.fillRect(x0, y, Math.max(1, x1 - x0), bh);
      ctx.restore();
    });
  });
  const cx = X(opts.now || 0);
  ctx.save(); ctx.strokeStyle = cssVar('--red'); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b); ctx.stroke(); ctx.restore();
  label(ctx, 'now', cx + 3, pad.t + 6, cssVar('--red'), 'left', 9);
  return { ctx, w, h };
}

/* ---------------- 语法高亮 ---------------- */
const KW = /\b(?:void|int|float|double|char|long|short|bool|const|static|struct|class|enum|typedef|volatile|if|else|for|while|do|switch|case|break|continue|return|goto|sizeof|new|delete|this|public|private|protected|template|namespace|using|try|catch|import|from|def|lambda|yield|async|await|let|var|function|in|not|and|or|None|True|False|pass|with|as|global)\b/g;
const TYPES = /\b(?:uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|String|boolean|BaseType_t|TickType_t|TaskHandle_t|QueueHandle_t|esp_err_t|WiFiClient|PubSubClient|HardwareSerial|ArduinoJson|JsonDocument|unsigned|signed)\b/g;
const CONSTS = /\b(?:HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|INPUT_PULLDOWN|FALLING|RISING|CHANGE|LED_BUILTIN|A0|ADC_11db|ADC_0db|WIFI_STA|WIFI_AP|nullptr|NULL|true|false|null|Serial|WiFi|Wire|SPI|Serial2|portTICK_PERIOD_MS|pdMS_TO_TICKS|ARDUINO_RUNNING_CORE)\b/g;

function hl(code) {
  let s = esc(code), store = [];
  const stash = (m, cls) => {
    const i = store.length;
    store.push('<span class="' + cls + '">' + m + '</span>');
    return '\uE000' + String.fromCharCode(0xE100 + i) + '\uE001';
  };
  s = s.replace(/\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\//g, m => stash(m, 'c'));
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => stash(m, 's'));
  s = s.replace(CONSTS, m => stash(m, 'n'));
  s = s.replace(KW, m => stash(m, 'k'));
  s = s.replace(TYPES, m => stash(m, 't'));
  s = s.replace(/\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)\b/g, m => stash(m, 'n'));
  s = s.replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, m => stash(m, 'f'));
  s = s.replace(/\uE000([\s\S])\uE001/g, (m, c) => store[c.charCodeAt(0) - 0xE100] || m);
  return s;
}
function codeBlock(id, filename, lang, code, extraBtn) {
  return '<div class="code-block"><div class="code-toolbar">' +
    '<span class="fname">' + esc(filename) + '</span><span class="lang">' + esc(lang) + '</span><span class="spacer"></span>' +
    (extraBtn || '') + '<button data-copy="' + id + '">复制代码</button></div>' +
    '<pre class="code" id="' + id + '">' + hl(code) + '</pre></div>';
}
function setCode(id, code) { const el = document.getElementById(id); if (el) el.innerHTML = hl(code); }

/* ---------------- 终端 ---------------- */
class Terminal {
  constructor(el, maxLines) { this.el = el; this.max = maxLines || 90; }
  _time() {
    const ms = Clock.t;
    return String(Math.floor(ms / 60000)).padStart(2, '0') + ':' +
      String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' +
      String(Math.floor(ms % 1000)).padStart(3, '0');
  }
  log(msg, cls) {
    if (!this.el) return;
    const d = document.createElement('div');
    d.className = 'ln';
    d.innerHTML = '<span class="ts">[' + this._time() + ']</span> <span class="' + (cls || '') + '">' + esc(msg) + '</span>';
    this.el.appendChild(d);
    while (this.el.children.length > this.max) this.el.removeChild(this.el.firstChild);
    this.el.scrollTop = this.el.scrollHeight;
  }
  clear() { if (this.el) this.el.innerHTML = ''; }
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}
function copyText(text, btn) {
  const done = () => { toast('已复制到剪贴板'); if (btn) { const old = btn.textContent; btn.textContent = '已复制 ✓'; setTimeout(() => btn.textContent = old, 1400); } };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallback());
  } else fallback();
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择代码'); }
    document.body.removeChild(ta);
  }
}

/* ---------------- 小工具 ---------------- */
const pwmLevel = (t, freq, duty) => ((t % (1000 / freq)) / (1000 / freq)) < duty ? 1 : 0;
const square = (t, ms, duty) => pwmLevel(t, 1000 / ms, duty === undefined ? .5 : duty);
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function fmtV(v) { return v.toFixed(2) + ' V'; }
function bindCopy(root) {
  $$('[data-copy]', root).forEach(b => {
    b.onclick = () => {
      const el = document.getElementById(b.dataset.copy);
      if (el) copyText(el.textContent, b);
    };
  });
}
/** 数字读数更新助手 */
function setRead(root, key, val) {
  const el = $('[data-read="' + key + '"]', root);
  if (el && el.textContent !== String(val)) el.textContent = val;
}
