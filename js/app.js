/* ============================================================
   app.js · 路由、导航、进度、主题、引脚地图、自测、首页
   ============================================================ */

const PKEY = 'esp32_interactive_course_v1';
const FLAT = SECTIONS.flatMap(g => g.items.map(it => ({ ...it, group: g.group })));
const byId = id => FLAT.find(x => x.id === id);
let store = { done: [], theme: 'light', quiz: {} };
try { Object.assign(store, JSON.parse(localStorage.getItem(PKEY) || '{}')); } catch (e) { /* ignore */ }
if (!Array.isArray(store.done)) store.done = [];
const save = () => { try { localStorage.setItem(PKEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };
let currentId = null;

/* ---------------- 通用 ---------------- */
function header(meta) {
  return `<header class="page-header">
    <div class="eyebrow">${esc(meta.eyebrow)}</div>
    <h1>${esc(meta.title)}</h1>
    <p class="lead">${meta.lead}</p>
    <div class="header-meta">${(meta.chips || []).map((c, i) => `<span class="chip ${i === 0 ? 'accent' : ''}">${esc(c)}</span>`).join('')}
      ${meta.time ? `<span class="chip">⏱ ${esc(meta.time)}</span>` : ''}</div>
  </header>`;
}
function footerNav(id) {
  const i = FLAT.findIndex(x => x.id === id);
  const prev = FLAT[i - 1], next = FLAT[i + 1];
  const done = store.done.includes(id);
  return `<div class="lab-nav">
    ${prev ? `<button class="btn" data-goto="${prev.id}">← ${esc(prev.title)}</button>` : '<span></span>'}
    <div class="btn-row"><button class="btn ${done ? '' : 'primary'}" id="markDone">${done ? '✓ 已完成（点击取消）' : '□ 标记为已完成'}</button></div>
    ${next ? `<button class="btn" data-goto="${next.id}">${esc(next.title)} →</button>` : '<span></span>'}
  </div>`;
}
function updateProgress() {
  const total = FLAT.length, done = store.done.length;
  const fill = $('#progressFill'), txt = $('#progressText');
  if (fill) fill.style.width = (done / total * 100) + '%';
  if (txt) txt.textContent = done + ' / ' + total;
  $$('.nav-item').forEach(b => {
    const id = b.dataset.id, chk = b.querySelector('.nav-check');
    const on = store.done.includes(id);
    if (chk) chk.textContent = on ? '✓' : '';
    b.classList.toggle('completed', on);
  });
}

/* ---------------- 导航 ---------------- */
function buildNav() {
  const nav = $('#navList');
  let idx = 0;
  nav.innerHTML = SECTIONS.map(g => `<div class="nav-group"><div class="nav-group-title">${esc(g.group)}</div>` +
    g.items.map(it => {
      idx++;
      return `<button class="nav-item" data-id="${it.id}" data-idx="${idx}" data-search="${esc((it.title + ' ' + it.short + ' ' + g.group).toLowerCase())}">
        <span class="nav-idx">${String(idx).padStart(2, '0')}</span>
        <span class="nav-label">${esc(it.title)}</span><span class="nav-check"></span></button>`;
    }).join('') + '</div>').join('');
  $$('.nav-item', nav).forEach(b => b.onclick = () => { navigate(b.dataset.id); closeDrawer(); });
}
function closeDrawer() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
}
function setActiveNav(id) {
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  const active = $('.nav-item.active');
  if (active) {
    const box = $('.sidebar-scroll');
    const top = active.offsetTop, bottom = top + active.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTop = top - 120;
  }
}

/* ---------------- 路由 ---------------- */
function navigate(id, skipHash) {
  if (!byId(id)) id = 'overview';
  const item = byId(id);
  // 清理上一视图的动画与全局监听
  Clock.clear();
  if (currentId && LAB_DEFS[currentId] && LAB_DEFS[currentId].cleanup) {
    try { LAB_DEFS[currentId].cleanup($('#view')); } catch (e) { console.warn(e); }
  }
  currentId = id;
  if (!skipHash && location.hash !== '#' + id) location.hash = id;
  const view = $('#view');
  let html = '';
  if (item.kind === 'overview') html = renderOverview();
  else if (item.kind === 'quiz') html = renderQuiz();
  else if (item.kind === 'page') {
    const p = PAGES[id];
    html = header({ ...p, time: item.time }) + p.html + footerNav(id);
  } else {
    const def = LAB_DEFS[id];
    if (!def) { html = '<div class="callout danger">内容加载失败：' + esc(id) + '</div>'; }
    else html = header({ ...def.meta, time: item.time }) + def.html() + footerNav(id);
  }
  view.innerHTML = html;
  $('#main').scrollTop = 0;
  $('#footerCrumb').textContent = item.group + ' / ' + item.title;
  document.title = item.title + ' · ESP32 交互实验室';
  setActiveNav(id);
  updateProgress();

  // 挂载交互
  if (id === 'hardware') mountPinout(view);
  if (id === 'quiz') mountQuiz(view);
  if (LAB_DEFS[id] && LAB_DEFS[id].mount) {
    try { LAB_DEFS[id].mount(view); } catch (e) { console.error('[mount ' + id + ']', e); }
  }
  bindTermClear(view);
  // 代码块的额外按钮（若有）
  $$('[data-term-clear]', view).forEach(() => {});
}

/* ---------------- 首页 ---------------- */
function renderOverview() {
  const done = store.done.length, total = FLAT.length;
  return `<div class="hero">
    <h1>把嵌入式系统<br>变成一门看得见的课程</h1>
    <p>以 ESP32-WROOM-32 为主线，把 GPIO、PWM、ADC、总线时序、WiFi、FreeRTOS 与低功耗全部做成可交互仿真。不用开发板，也能先建立正确的直觉；有板子时，每个实验都能直接对照上板验证。</p>
    <div class="hero-btns">
      <button class="btn solid" data-goto="hardware">开始学习 →</button>
      <button class="btn" data-goto="lab-gpio">直接进入实验 1</button>
      <button class="btn" data-goto="quiz">课程自测</button>
    </div>
    <div class="hero-stats">
      <div><b>${COURSE.weeks}</b><span>教学周</span></div>
      <div><b>9</b><span>交互实验</span></div>
      <div><b>${QUIZ.length}</b><span>自测题目</span></div>
      <div><b>${done}/${total}</b><span>已完成章节</span></div>
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><b>${COURSE.credits}</b><span>学分</span></div>
    <div class="stat-card"><b>${COURSE.theoryHours}</b><span>理论学时</span></div>
    <div class="stat-card"><b>${COURSE.labHours}</b><span>实验学时</span></div>
    <div class="stat-card"><b>100%</b><span>离线可用 · 无需后端</span></div>
  </div>

  <h2 class="section-title">课程学习目标 <small>完成本课程后，你应该能够…</small></h2>
  <div class="toc-grid">${COURSE.goals.map((g, i) => `<div class="card" style="padding:16px 18px;box-shadow:var(--shadow-sm)">
    <div class="tc-num">0${i + 1}</div><h3 style="margin:6px 0 6px;font-size:15px">${esc(g.t)}</h3>
    <p style="font-size:12.5px;color:var(--text-3);margin:0;line-height:1.6">${esc(g.d)}</p></div>`).join('')}</div>

  <h2 class="section-title">推荐学习路径 <small>点击任意卡片跳转</small></h2>
  <div class="toc-grid">${SECTIONS.slice(1).map((g, gi) => `<button class="toc-card" data-goto="${g.items[0].id}">
    <div class="tc-num">PATH ${String(gi + 1).padStart(2, '0')}</div>
    <h3>${esc(g.group)}</h3><p>${esc(g.items.map(i => i.title.replace(/^实验 \d+ · /, '')).join(' · '))}</p>
    <div class="tc-foot"><span>${g.items.length} 个章节</span><span>→</span></div></button>`).join('')}</div>

  <div class="grid-2" style="margin-top:22px">
    <div class="card"><div class="card-head"><span class="dot"></span><h2>教学周历</h2></div><div class="card-body">
      <div class="table-wrap"><table class="tbl">
        <tr><th>周次</th><th>主题</th><th>配套实验</th></tr>
        ${COURSE.syllabus.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b><br><span class="small muted">${esc(r[2])}</span></td><td>${esc(r[3])}</td></tr>`).join('')}
      </table></div></div></div>
    <div class="stack">
      <div class="card"><div class="card-head"><span class="dot"></span><h2>考核方式</h2></div><div class="card-body">
        <div class="table-wrap"><table class="tbl">
          <tr><th>项目</th><th>占比</th><th>说明</th></tr>
          ${COURSE.assessment.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}
        </table></div></div></div>
      <div class="card"><div class="card-head"><span class="dot"></span><h2>先修知识与环境</h2></div><div class="card-body">
        <p><b>面向：</b>${esc(COURSE.audience)}</p>
        <p><b>先修：</b>${esc(COURSE.prerequisite)}</p>
        <p><b>软件：</b>Arduino IDE 2.x + esp32 开发板包（2.x 核心）／可选 ESP-IDF、MicroPython。</p>
        <p><b>硬件：</b>ESP32 DevKit V1、USB 数据线、面包板、LED、220 Ω 电阻、按键、DHT22、SSD1306 OLED、电位器。</p>
        <div class="callout note" style="margin-bottom:0"><div class="ci">i</div><p>本课件所有实验均为<b>浏览器内仿真</b>，数据用于理解原理；有硬件时请按每章代码上板验证，并在实验报告中区分"仿真"与"实测"。</p></div>
      </div></div>
    </div>
  </div>
  ${footerNav('overview')}`;
}

/* ---------------- 交互式引脚地图 ---------------- */
function pinColor(pin) {
  const c = PIN_CATEGORIES.find(c => c.cats.includes(pin.cat));
  return c ? c.color : '#8697a9';
}
function mountPinout(view) {
  const host = $('#pinoutHost', view);
  if (!host) return;
  const left = PINS_LEFT, right = PINS_RIGHT, rows = Math.max(left.length, right.length);
  const H = rows * 22 + 46, W = 250;
  let svg = `<svg id="pinoutSvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="ESP32 30 针引脚图">
    <rect class="brd" x="44" y="10" width="162" height="${H - 20}" rx="9" style="fill:var(--surface-2);stroke:var(--border-strong);stroke-width:1.5"/>
    <rect x="76" y="${H / 2 - 58}" width="98" height="96" rx="5" style="fill:var(--primary);opacity:.82"/>
    <text x="125" y="${H / 2 - 8}" font-size="13" font-family="monospace" fill="#ffffff" text-anchor="middle" font-weight="bold">ESP32</text>
    <text x="125" y="${H / 2 + 10}" font-size="8.5" font-family="monospace" fill="#ffffff" text-anchor="middle" opacity=".85">WROOM-32</text>
    <rect x="101" y="${H / 2 + 28}" width="48" height="14" rx="2" style="fill:var(--border-strong)"/>
    <text x="125" y="${H / 2 + 38}" font-size="7" font-family="monospace" style="fill:var(--text)" text-anchor="middle">WiFi/BT</text>
    <rect x="99" y="${H - 26}" width="52" height="16" rx="3" style="fill:var(--border-strong)"/>
    <text x="125" y="${H - 15}" font-size="7.5" font-family="monospace" style="fill:var(--text)" text-anchor="middle">USB</text>`;
  const addPin = (pin, side, i) => {
    const y = 28 + i * 22;
    const x = side === 'L' ? 28 : 206;
    const tx = side === 'L' ? 62 : 190;
    const anchor = side === 'L' ? 'start' : 'end';
    const col = pinColor(pin);
    return `<g class="pin" data-side="${side}" data-i="${i}" data-key="${esc(pin.n)}">
      <rect x="${x}" y="${y - 7}" width="16" height="14" rx="2.5" fill="${col}"/>
      <text x="${tx}" y="${y + 3}" font-size="8.5" font-family="monospace" text-anchor="${anchor}" style="fill:var(--text)">${esc(pin.n)}</text></g>`;
  };
  svg += left.map((p, i) => addPin(p, 'L', i)).join('');
  svg += right.map((p, i) => addPin(p, 'R', i)).join('');
  svg += '</svg>';
  host.innerHTML = svg;

  const legend = $('#pinLegend', view);
  if (legend) legend.innerHTML = PIN_CATEGORIES.map(c =>
    `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join('');
  const detail = $('#pinDetail', view), pop = $('#pinPopover');
  const getPin = el => (el.dataset.side === 'L' ? PINS_LEFT : PINS_RIGHT)[Number(el.dataset.i)];
  function showDetail(pin) {
    if (!pin || !detail) return;
    const c = PIN_CATEGORIES.find(c => c.cats.includes(pin.cat));
    detail.innerHTML = `<h3>${esc(pin.n)} <span class="tag" style="background:${c ? c.color : '#888'}22;color:${c ? c.color : '#888'}">${esc(pin.cat)}</span></h3>
      <p style="margin:0;color:var(--text-2);font-size:13.5px">${esc(pin.desc)}</p>
      <div class="pin-tags">${pin.funcs.map(f => `<span>${esc(f)}</span>`).join('')}
        ${pin.gpio !== null ? `<span class="blue">GPIO ${pin.gpio}</span>` : ''}
        ${pin.type === 'input' ? '<span class="warn">仅输入 · 无内部上拉</span>' : ''}</div>
      ${pin.warn ? `<div class="callout warn" style="margin:0"><div class="ci">!</div><p>${esc(pin.warn)}</p></div>` : ''}
      <p class="mini-note">点击其它引脚继续查看 · 悬停可看快速提示</p>`;
  }
  $$('.pin', host).forEach(g => {
    g.addEventListener('click', () => {
      $$('.pin', host).forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      showDetail(getPin(g));
    });
    g.addEventListener('mouseenter', e => {
      const p = getPin(g);
      pop.innerHTML = `<strong>${esc(p.n)} · ${esc(p.cat)}</strong>${esc(p.funcs.join(' / '))}${p.warn ? '<br><span style="color:var(--amber)">⚠ ' + esc(p.warn) + '</span>' : ''}`;
      pop.style.display = 'block';
      pop.style.left = Math.min(window.innerWidth - 310, e.clientX + 14) + 'px';
      pop.style.top = Math.min(window.innerHeight - 150, e.clientY + 12) + 'px';
    });
    g.addEventListener('mouseleave', () => { pop.style.display = 'none'; });
  });
  showDetail(PINS_LEFT[6]);
}

/* ---------------- 自测题库 ---------------- */
function renderQuiz() {
  return header({
    eyebrow: 'ASSESSMENT · 课程自测',
    title: '课程自测题库',
    lead: '覆盖硬件约束、GPIO、中断、PWM、ADC、总线、RTOS 与低功耗的核心概念。每题即时判定并给出解析，可以随时重做。',
    chips: [QUIZ.length + ' 道题', '即时判分', '逐题解析', '本地保存进度'], time: '20 min'
  }) + `<div class="score-box">
      <b id="quizScore">0</b><span>已得分 / 满分 ${QUIZ.length * 10} 分 · 已作答 <span id="quizDone">0</span> / ${QUIZ.length} 题</span>
      <div class="btn-row" style="justify-content:center;margin-top:14px"><button class="btn" id="quizReset">↺ 重新作答</button></div>
    </div>
    <div id="quizList">${QUIZ.map((q, i) => `<div class="quiz-item" data-q="${i}">
      <div class="q-head"><span class="q-no">${i + 1}</span><span>${q.q}</span></div>
      <div class="quiz-opts">${q.o.map((o, j) => `<div class="quiz-opt" data-opt="${j}"><span class="ol">${'ABCD'[j]}</span><span>${o}</span></div>`).join('')}</div>
      <div class="quiz-exp"></div>
    </div>`).join('')}</div>` + footerNav('quiz');
}
function mountQuiz(view) {
  const letters = 'ABCD';
  function paint() {
    const ans = store.quiz || {};
    let score = 0, count = 0;
    $$('.quiz-item', view).forEach((item, i) => {
      const picked = ans[i];
      const exp = $('.quiz-exp', item);
      $$('.quiz-opt', item).forEach((op, j) => {
        op.classList.remove('correct', 'wrong', 'sel', 'locked');
        op.classList.add('locked');
        if (picked !== undefined) {
          if (j === QUIZ[i].a) op.classList.add('correct');
          else if (j === picked) op.classList.add('wrong');
        }
      });
      if (picked !== undefined) {
        count++;
        if (picked === QUIZ[i].a) score += 10;
        exp.innerHTML = (picked === QUIZ[i].a ? '<b style="color:var(--green)">✓ 回答正确。</b> ' : '<b style="color:var(--red)">✗ 正确答案：' + letters[QUIZ[i].a] + '。</b> ') + esc(QUIZ[i].e);
        exp.classList.add('show');
      } else { exp.classList.remove('show'); exp.innerHTML = ''; }
    });
    $('#quizScore', view).textContent = String(score);
    $('#quizDone', view).textContent = String(count);
    if (count === QUIZ.length && !store.done.includes('quiz')) {
      store.done.push('quiz'); save(); updateProgress();
      toast('自测完成！章节已标记为完成');
    }
  }
  $$('.quiz-item', view).forEach((item, i) => {
    $$('.quiz-opt', item).forEach((op, j) => {
      op.onclick = () => {
        if (!store.quiz) store.quiz = {};
        if (store.quiz[i] !== undefined) return;
        store.quiz[i] = j; save(); paint();
      };
    });
  });
  $('#quizReset', view).onclick = () => { store.quiz = {}; save(); paint(); toast('已清空作答记录'); };
  paint();
}

/* ---------------- 主题 / 全局事件 ---------------- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = $('#themeIcon');
  if (icon) icon.innerHTML = t === 'dark'
    ? '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'
    : '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>';
}
function init() {
  applyTheme(store.theme === 'dark' ? 'dark' : 'light');
  buildNav();
  updateProgress();

  // 事件委托：导航跳转、代码复制、完成标记
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) { navigate(go.dataset.goto); closeDrawer(); return; }
    const sc = e.target.closest('[data-scroll]');
    if (sc) {
      const target = document.getElementById(sc.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const el = document.getElementById(cp.dataset.copy);
      if (el) copyText(el.textContent, cp);
      return;
    }
    const mk = e.target.closest('#markDone');
    if (mk) {
      const id = currentId;
      const i = store.done.indexOf(id);
      if (i >= 0) store.done.splice(i, 1); else store.done.push(id);
      save(); updateProgress();
      mk.textContent = i >= 0 ? '□ 标记为已完成' : '✓ 已完成（点击取消）';
      mk.classList.toggle('primary', i >= 0);
      toast(i >= 0 ? '已取消完成标记' : '章节已标记为完成');
    }
  });
  $('#themeToggle').onclick = () => {
    store.theme = store.theme === 'dark' ? 'light' : 'dark';
    applyTheme(store.theme); save();
    toast(store.theme === 'dark' ? '已切换到深色主题' : '已切换到浅色主题');
  };
  $('#resetProgress').onclick = () => {
    if (!confirm('确定重置全部学习进度与自测记录吗？此操作只影响本机浏览器数据。')) return;
    store.done = []; store.quiz = {}; save();
    if (currentId === 'quiz') navigate('quiz', true);
    else updateProgress();
    toast('学习进度已重置');
  };
  $('#menuToggle').onclick = () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarBackdrop').classList.toggle('show');
  };
  $('#sidebarBackdrop').onclick = closeDrawer;
  $('#sideSearch').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    $$('.nav-group').forEach(g => {
      let visible = 0;
      $$('.nav-item', g).forEach(b => {
        const hit = !q || b.dataset.search.includes(q);
        b.classList.toggle('hidden-by-search', !hit);
        if (hit) visible++;
      });
      g.classList.toggle('hidden-by-search', visible === 0);
    });
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== currentId) navigate(id, true);
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) closeDrawer(); });

  const initial = location.hash.slice(1) || 'overview';
  navigate(initial, true);
}
document.addEventListener('DOMContentLoaded', init);
