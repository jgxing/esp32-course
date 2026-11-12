/* ============================================================
   labs-a.js · 实验 1–5：GPIO / 按键中断 / PWM / ADC / 串行总线
   ============================================================ */

/* ================================================================
   实验 1 · GPIO 与 LED 闪烁
   ================================================================ */
registerLab('lab-gpio', {
  meta: {
    eyebrow: 'LAB 01 · 数字输出',
    title: 'GPIO 输出与 LED 闪烁',
    lead: '从最经典的 Blink 开始，把"代码里的一次 digitalWrite"与"引脚上真实的电平跳变、电流路径、波形周期"三者对应起来。',
    chips: ['推挽输出', '限流电阻计算', '阻塞 vs 非阻塞', '逻辑波形'],
    time: '25 min'
  },
  html: () => labFrame({
    theory: `
      <p>GPIO（General Purpose Input/Output）是软件与物理世界的第一个接口。ESP32 通过 <b>GPIO 交换矩阵</b>把内部外设信号路由到物理引脚；<code class="inline">pinMode(pin, OUTPUT)</code> 配置为推挽输出后，写 HIGH 时内部 PMOS 导通把引脚接到 3.3 V，写 LOW 时 NMOS 导通把引脚接到 GND。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">为什么必须串限流电阻</h3>
          <p>LED 是非线性器件，导通后压降基本固定（红光约 2.0 V，蓝/白光约 3.0 V）。若直接接 GPIO，电流仅由芯片内阻决定，会远超 <b>12 mA 推荐值</b>。用欧姆定律限定电流：</p>
          <div class="formula">I = (V<sub>CC</sub> − V<sub>F</sub>) / R<br>R = (3.3 V − 2.0 V) / 0.01 A ≈ 130 Ω<br>工程取值：220 Ω → I ≈ 5.9 mA；330 Ω → I ≈ 3.9 mA</div>
          <p class="small muted">也可采用<b>灌电流</b>接法：LED 阳极经电阻接 3.3 V，阴极接 GPIO，此时 GPIO 输出 LOW 才点亮。ESP32 灌电流能力略强于拉电流，但两种接法在 6 mA 量级都没问题——区别在于<b>逻辑是反的</b>，代码要对应调整。</p>
        </div>
        <div>
          <h3 class="under">delay() 与 millis() 的分水岭</h3>
          <p><code class="inline">delay()</code> 会让当前任务进入阻塞，期间无法响应按键、无法采样传感器。真正的多任务程序使用基于时间的状态机：</p>
          <div class="formula">if (millis() - last &gt;= halfPeriod) {<br>&nbsp;&nbsp;last += halfPeriod;<br>&nbsp;&nbsp;digitalWrite(pin, !digitalRead(pin));<br>}</div>
          <p class="small muted">切换左侧参数中的"代码实现方式"观察代码变化。请留意：无论用哪种写法，<b>引脚上的波形是完全一样的</b>——区别只在于 CPU 在等待期间能不能干别的事。</p>
        </div>
      </div>
      <div class="callout warn"><div class="ci">!</div><p>波形图是 <b>理想逻辑电平仿真</b>：真实的上升/下降沿有数纳秒的过渡时间，长导线还会带来过冲与振铃，需要用示波器才能观察到。仿真用于建立"代码 ↔ 时序"的直觉，不能替代实测，报告里请如实标注。</p></div>`,
    controls:
      selectCtrl('gPin', '输出引脚', [[2, 'GPIO2（板载 LED）'], [4, 'GPIO4'], [5, 'GPIO5'], [18, 'GPIO18'], [19, 'GPIO19'], [23, 'GPIO23'], [25, 'GPIO25'], [26, 'GPIO26'], [27, 'GPIO27'], [32, 'GPIO32'], [33, 'GPIO33']], 2, true) +
      slider('gPeriod', '闪烁周期', 100, 2000, 50, 1000, ' ms') +
      slider('gDuty', '高电平占空比', 10, 90, 5, 50, ' %') +
      selectCtrl('gR', '限流电阻', [[220, '220 Ω'], [330, '330 Ω'], [1000, '1 kΩ'], [0, '不接（危险）']], 220, true) +
      selectCtrl('gMode', '代码实现方式', [['delay', '阻塞式 delay()'], ['millis', '非阻塞 millis()']], 'delay'),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="gRun">⏸ 暂停仿真</button><button class="btn" id="gStep">单步：翻转一次</button></div>
      <div class="callout tip" style="margin-top:14px"><div class="ci">✓</div><p>试试把周期调到 <b>100 ms</b> 再调到 <b>2000 ms</b>，观察示波器时间轴与 LED 的变化；把电阻改成"不接"，看看电流读数会给出什么警告。</p></div>`,
    stage: `<div class="circuit-stage">${ledCircuit()}</div>
      <div class="callout note" style="margin-bottom:0"><div class="ci">i</div><p id="gCircuitNote">电流路径：3.3 V → GPIO → 220 Ω → LED → GND。GPIO 输出 HIGH 时回路导通，LED 点亮。</p></div>`,
    wave: simPanel('GPIO 逻辑电平 / LED 导通电流', '<canvas class="wave" id="gWave"></canvas>' +
      legend([['CH1 引脚电平 (0 / 3.3 V)', '#0d7c72'], ['CH2 LED 导通（归一化）', '#d97706']]), 'gLive'),
    readout: readout([['频率', 'gF', '', '1.00 Hz'], ['高电平时间', 'gHigh', 'blue', '500 ms'], ['LED 电流', 'gI', 'amber', '5.9 mA'], ['累计翻转', 'gCount', '', '0']]),
    code: codeBlock('codeGpio', 'blink.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termGpio'),
    questions: [
      '把占空比从 50% 改成 20%，LED 的<b>视觉亮度</b>和<b>平均电流</b>分别怎么变？这与实验 3 的 PWM 调光有什么联系？',
      '若改用灌电流接法（LED 接 3.3 V，GPIO 接阴极），要点亮 LED 应输出 HIGH 还是 LOW？代码需要改哪几行？',
      '为什么选 GPIO2 做实验时，烧录程序偶尔会失败？（提示：回顾第 1 章的 Strapping 引脚。）',
      '把周期缩短到 100 ms 以下，人眼会看到什么？这个频率界限大约是多少，它与 PWM 实验有何关系？'
    ]
  }),
  mount(root) {
    const s = { pin: 2, period: 1000, duty: 50, r: 220, mode: 'delay' };
    const term = new Terminal($('#termGpio', root));
    const glow = $('#ledGlow', root), dot = $('#wireDot', root), dot2 = $('#wireDot2', root);
    let flips = 0, lastLevel = 0, lastLog = 0, forced = null, forceUntil = 0;

    function current() {
      if (s.r === 0) return { txt: '⚠ 过流', warn: true };
      return { txt: ((3.3 - 2.0) / s.r * 1000).toFixed(1) + ' mA', warn: ((3.3 - 2.0) / s.r * 1000) > 12 };
    }
    function code() {
      const hi = Math.round(s.period * s.duty / 100), lo = s.period - hi;
      return s.mode === 'delay'
        ? `// 实验 1 · 阻塞式 Blink\nconst int LED_PIN = ${s.pin};\nconst int T_HIGH = ${hi};   // ms\nconst int T_LOW  = ${lo};   // ms\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n  Serial.begin(115200);\n  Serial.println("Blink start, pin=" + String(LED_PIN));\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(T_HIGH);            // 阻塞：CPU 在此空转\n  digitalWrite(LED_PIN, LOW);\n  delay(T_LOW);\n}`
        : `// 实验 1 · 非阻塞 Blink（millis 状态机）\nconst int LED_PIN = ${s.pin};\nconst unsigned long T_HIGH = ${hi};\nconst unsigned long T_LOW  = ${lo};\n\nunsigned long last = 0;\nbool level = false;\nunsigned long hold = T_LOW;\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  if (millis() - last >= hold) {\n    last = millis();\n    level = !level;\n    digitalWrite(LED_PIN, level ? HIGH : LOW);\n    hold = level ? T_HIGH : T_LOW;\n  }\n  // 此处可以同时处理按键、传感器、网络，不会被 delay 卡住\n}`;
    }
    function refresh() {
      setCode('codeGpio', code());
      $('#pinLabel', root).textContent = 'GPIO' + s.pin;
      $('#resLabel', root).textContent = s.r === 0 ? '无电阻' : s.r + ' Ω';
      const c = current();
      $('#gCircuitNote', root).innerHTML = c.warn
        ? '<b style="color:var(--red)">⚠ 危险：未接限流电阻或阻值过小</b>，电流将只受芯片内阻限制，可能永久损坏 GPIO。请恢复 220 Ω 以上。'
        : `电流路径：3.3 V → GPIO${s.pin} → ${s.r} Ω → LED → GND，导通电流约 <b>${c.txt}</b>。`;
      setRead(root, 'gF', (1000 / s.period).toFixed(2) + ' Hz');
      setRead(root, 'gHigh', Math.round(s.period * s.duty / 100) + ' ms');
      setRead(root, 'gI', c.txt);
    }
    const ctrls = {
      gPin: v => { s.pin = v; term.log('引脚切换 → GPIO' + v, 'info'); refresh(); },
      gPeriod: v => { s.period = v; refresh(); },
      gDuty: v => { s.duty = v; refresh(); },
      gR: v => { s.r = v; refresh(); if (v === 0) term.log('警告：无限流电阻，GPIO 可能过流！', 'err'); },
      gMode: v => { s.mode = v; term.log('切换为' + (v === 'delay' ? '阻塞式 delay()' : '非阻塞 millis()'), 'info'); refresh(); }
    };
    Object.keys(ctrls).forEach(k => onCtrl(root, k, ctrls[k]));
    const run = toggleRun(root, 'gRun', 'gLive');
    $('#gStep', root).onclick = () => { forced = lastLevel ? 0 : 1; forceUntil = Clock.t + Math.max(120, s.period / 4); term.log('手动翻转：' + (forced ? 'HIGH' : 'LOW'), 'info'); };
    bindTermClear(root);
    term.log('ESP32 复位 · boot:0x13 (SPI_FAST_FLASH_BOOT)', 'info');
    term.log('Blink start, pin=' + s.pin + ', period=' + s.period + 'ms');
    term.log('限流电阻 ' + s.r + ' Ω → I ≈ ' + current().txt, 'ok');
    refresh();

    const levelAt = t => (t < 0) ? 0 : ((t % s.period) / s.period < s.duty / 100 ? 1 : 0);
    function waveOpts(now) {
      const win = clamp(s.period * 4, 800, 4000);
      return {
        now, window: win, cols: 8, nowUnit: 'ms',
        channels: [
          { label: 'GPIO', color: '#0d7c72', type: 'step', fn: levelAt },
          { label: 'LED', color: '#d97706', type: 'step', fn: t => levelAt(t) }
        ]
      };
    }
    startScope(root, 'gWave', waveOpts, 30);

    Clock.add('gpio-main', t => {
      if (!run.isRunning()) return;
      let lv = forced !== null && t < forceUntil ? forced : levelAt(t);
      if (t >= forceUntil) forced = null;
      if (lv !== lastLevel) {
        lastLevel = lv; flips++;
        setRead(root, 'gCount', String(flips));
        if (t - lastLog > 420) { term.log(lv ? 'GPIO → HIGH · LED ON' : 'GPIO → LOW  · LED OFF', lv ? 'ok' : ''); lastLog = t; }
      }
      if (glow) glow.setAttribute('opacity', lv ? '0.95' : '0');
      const ph = (t % 260) / 260;
      [dot, dot2].forEach((d, i) => {
        if (!d) return;
        d.setAttribute('opacity', lv ? '0.9' : '0');
        d.setAttribute('cx', String(260 + ph * 175 - (i ? 0 : 0)));
      });
    });
  }
});

/* ================================================================
   实验 2 · 按键输入与中断消抖
   ================================================================ */
registerLab('lab-button', {
  meta: {
    eyebrow: 'LAB 02 · 数字输入与中断',
    title: '按键、上拉电阻与中断消抖',
    lead: '按住下面的按键，观察机械触点在几毫秒内疯狂抖动；改变消抖时间，看"一次按下被误判成多次"如何被消除。',
    chips: ['INPUT_PULLUP', '边沿触发', '机械抖动', 'ISR 设计原则'],
    time: '25 min'
  },
  html: () => labFrame({
    theory: `
      <p>机械按键的金属触点在闭合/断开瞬间会发生弹跳，产生持续 <b>1–20 ms</b> 的高低电平毛刺。如果直接用边沿中断计数，一次按下可能被记录成 5–10 次。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">为什么用上拉 + 按键接地</h3>
          <p>若引脚悬空，它像一根天线，读数随机漂移。ESP32 内部约 45 kΩ 的上拉把空闲电平固定在 3.3 V；按下时按键把引脚短接到 GND，形成明确低电平，且只在按下时有微安级电流。</p>
          <div class="formula">空闲：3.3 V ─[45 kΩ 内部上拉]─ GPIO → HIGH<br>按下：GPIO ─[按键]─ GND          → LOW</div>
          <p class="small muted">因此上拉接法用 <code class="inline">FALLING</code> 触发；若改成外部下拉（按下接 3.3 V），则应改用 <code class="inline">RISING</code>。</p>
        </div>
        <div>
          <h3 class="under">两种消抖策略</h3>
          <p><b>软件延时消抖：</b>检测到电平变化后，等待 10–20 ms 再复核，若电平仍稳定才确认事件。<b>时间窗口法（推荐）：</b>记录最近一次变化时刻 <code class="inline">lastChange</code>，只有 <code class="inline">millis() - lastChange &gt; DEBOUNCE</code> 且状态与上次不同才提交事件。</p>
          <div class="formula">if (millis() - lastChange &gt; DEBOUNCE_MS) {<br>&nbsp;&nbsp;if (raw != stable) commit(raw);<br>}</div>
          <p class="small muted">硬件方案是 RC 低通 + 施密特触发器，软件方案零成本且参数可调，工程上更常用。</p>
        </div>
      </div>
      <div class="callout danger"><div class="ci">!</div><p><b>ISR 铁律：</b>中断服务函数里只做三件事——置 <code class="inline">volatile</code> 标志、记录时间戳、向队列投递事件。禁止 <code class="inline">delay()</code>、<code class="inline">Serial.print()</code>、动态内存分配与任何可能加锁的 API，否则会触发看门狗复位或死锁。ESP32 上 IRAM_ATTR 还可避免 Flash 访问带来的中断延迟。</p></div>`,
    controls:
      selectCtrl('bPull', '输入接法', [['pullup', '内部上拉（按下→GND）'], ['pulldown', '外部下拉（按下→3.3V）'], ['float', '浮空（不做上拉）']], 'pullup') +
      selectCtrl('bBounce', '机械抖动强度', [[0, '理想触点（无抖动）'], [1, '轻微（4 次弹跳 / 8 ms）'], [2, '严重（9 次弹跳 / 18 ms）']], 1, true) +
      slider('bDeb', '软件消抖时间', 0, 40, 1, 15, ' ms') +
      selectCtrl('bEdge', '中断触发边沿', [['falling', 'FALLING 下降沿'], ['rising', 'RISING 上升沿'], ['change', 'CHANGE 双边沿']], 'falling') +
      selectCtrl('bMethod', '检测方式', [['isr', '外部中断 attachInterrupt'], ['poll', '主循环轮询 digitalRead']], 'isr'),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="bPress" style="min-width:180px">👇 按住按键（或按空格）</button><button class="btn" id="bReset">重置计数</button></div>
      <div class="callout warn" style="margin-top:14px"><div class="ci">!</div><p>建议先设 <b>消抖 = 0 ms + 严重抖动</b>，按住几次看 ISR 被误触发多少次；再逐步增大消抖时间到 20 ms 对比。</p></div>`,
    stage: `<div class="circuit-stage">${buttonCircuit()}</div>
      <p class="mini-note">提示：浮空模式下，即使不按键，引脚也会因电磁噪声随机翻转——这就是"忘记上拉"的典型故障现象。</p>`,
    wave: simPanel('原始电平 / 消抖后状态 / 中断触发', '<canvas class="wave" id="bWave"></canvas>' +
      legend([['CH1 引脚原始电平（含毛刺）', '#d64545'], ['CH2 消抖后确认状态', '#0d7c72'], ['CH3 ISR 触发脉冲', '#2563eb']]), 'bLive'),
    readout: readout([['ISR / 事件次数', 'bIsr', 'blue', '0'], ['原始边沿数', 'bEdges', 'amber', '0'], ['实际按键次数', 'bPresses', '', '0'], ['误触发', 'bFalse', 'blue', '0']]),
    code: codeBlock('codeButton', 'debounce.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termButton'),
    questions: [
      '把消抖时间设为 0 ms，一次"严重抖动"的按下会触发几次中断？把消抖设为 20 ms 后呢？解释临界值如何确定。',
      '消抖时间设为 200 ms 会带来什么副作用？如果做一款需要快速连击的游戏手柄，该怎么折中？',
      '为什么 ISR 里不能调用 <code class="inline">Serial.println()</code>？在 ESP32 双核 + FreeRTOS 环境下可能引发什么后果？',
      '切换到"浮空"接法，不按按键时波形如何变化？请从输入阻抗与电磁耦合角度解释。'
    ]
  }),
  mount(root) {
    const idleOf = () => s.pull === 'pulldown' ? 0 : 1;
    const pressedOf = () => s.pull === 'pulldown' ? 1 : 0;
    const s = { pull: 'pullup', bounce: 1, deb: 15, edge: 'falling', method: 'isr' };
    const term = new Terminal($('#termButton', root));
    let rawEv = [{ t: 0, v: 1 }], stableEv = [{ t: 0, v: 1 }], isrEv = [];
    let rawEdges = 0, presses = 0, isrCount = 0, stable = 1, lastRaw = 1, lastChangeT = 0;
    let held = false, noiseAt = 0, logGate = 0, lastTransT = -1000;

    const at = (arr, t) => { let v = arr[0].v; for (const e of arr) { if (e.t > t) break; v = e.v; } return v; };
    function pushRaw(t, v) {
      const old = at(rawEv, t);
      if (old !== v) {
        let k = rawEv.length;                       // 保持事件时间严格递增
        while (k > 0 && rawEv[k - 1].t > t) k--;
        rawEv.splice(k, 0, { t, v });
        rawEdges++;
      }
      if (rawEv.length > 500) rawEv = rawEv.slice(-300);
    }
    function transition(target) {
      const now = Math.max(Clock.t, lastTransT + 30);  // 两次动作不重叠
      lastTransT = now;
      presses++;
      const spec = s.bounce === 0 ? { n: 0, dur: 0 } : s.bounce === 1 ? { n: 4, dur: 8 } : { n: 9, dur: 18 };
      const start = at(rawEv, now);
      if (spec.n === 0) { pushRaw(now + .5, target); return; }
      let v = start;
      for (let i = 0; i < spec.n; i++) {
        v = i % 2 === 0 ? target : start;
        pushRaw(now + (i + 1) * spec.dur / (spec.n + 1) + Math.random() * 1.5, v);
      }
      pushRaw(now + spec.dur + 2, target);
      term.log('按键' + (target === pressedOf() ? '按下' : '松开') + ' · 触点抖动 ' + spec.n + ' 次', 'warn');
    }
    function code() {
      const pin = 4, m = s.method;
      const pull = s.pull === 'float' ? 'INPUT' : (s.pull === 'pullup' ? 'INPUT_PULLUP' : 'INPUT_PULLDOWN');
      return m === 'isr'
        ? `// 实验 2 · 外部中断 + 时间窗口消抖\nconst int BTN_PIN = ${pin};\nconst unsigned long DEBOUNCE_MS = ${s.deb};\n\nvolatile unsigned long lastChange = 0;\nvolatile bool eventPending = false;\n\nvoid IRAM_ATTR onButton() {\n  // ISR 只做最轻量的两件事\n  lastChange = millis();\n  eventPending = true;\n}\n\nvoid setup() {\n  pinMode(BTN_PIN, ${pull});\n  Serial.begin(115200);\n  attachInterrupt(digitalPinToInterrupt(BTN_PIN), onButton, ${s.edge.toUpperCase()});\n}\n\nvoid loop() {\n  if (eventPending && millis() - lastChange > DEBOUNCE_MS) {\n    eventPending = false;\n    int level = digitalRead(BTN_PIN);\n    if (level == ${s.pull === 'pulldown' ? 'HIGH' : 'LOW'}) {\n      Serial.println("确认：按键已按下");\n    }\n  }\n}`
        : `// 实验 2 · 主循环轮询 + 状态机消抖\nconst int BTN_PIN = ${pin};\nconst unsigned long DEBOUNCE_MS = ${s.deb};\n\nint lastReading = ${s.pull === 'pulldown' ? 'LOW' : 'HIGH'};\nint stableState = lastReading;\nunsigned long lastChange = 0;\n\nvoid setup() {\n  pinMode(BTN_PIN, ${pull});\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  int reading = digitalRead(BTN_PIN);\n  if (reading != lastReading) {\n    lastReading = reading;\n    lastChange = millis();\n  }\n  if (millis() - lastChange > DEBOUNCE_MS && reading != stableState) {\n    stableState = reading;\n    Serial.printf("state=%d\\n", stableState);\n  }\n  // 无 delay，循环可继续处理其它任务\n}`;
    }
    function refresh() {
      setCode('codeButton', code());
      $('#pullLabel', root).textContent = s.pull === 'pullup' ? '内部上拉 45 kΩ → 3.3 V' : s.pull === 'pulldown' ? '外部下拉 10 kΩ → GND' : '⚠ 引脚浮空（无偏置）';
      const c = $('#btnContact', root);
      if (c) c.setAttribute('d', held ? 'M212 112 L248 112' : 'M212 112 L248 132');
      const txt = $('#btnStateText', root), chip = $('#btnStateChip', root);
      if (txt) txt.textContent = held ? (s.pull === 'pulldown' ? '按下 · HIGH' : '按下 · LOW') : (s.pull === 'pulldown' ? '松开 · LOW' : '松开 · HIGH');
      if (chip) chip.setAttribute('fill', held ? '#fdf1dc' : '#e2f4ec');
      setRead(root, 'bEdges', String(rawEdges));
      setRead(root, 'bPresses', String(presses));
      setRead(root, 'bIsr', String(isrCount));
      setRead(root, 'bFalse', String(Math.max(0, isrCount - presses)));
    }
    const map = {
      bPull: v => { s.pull = v; const idle = idleOf(); rawEv = [{ t: Clock.t, v: idle }]; stableEv = [{ t: Clock.t, v: idle }]; stable = idle; lastRaw = idle; term.log('输入接法 → ' + v, 'info'); refresh(); },
      bBounce: v => { s.bounce = v; refresh(); },
      bDeb: v => { s.deb = v; refresh(); },
      bEdge: v => { s.edge = v; refresh(); },
      bMethod: v => { s.method = v; term.log('检测方式 → ' + (v === 'isr' ? '外部中断' : '主循环轮询'), 'info'); refresh(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const pressBtn = $('#bPress', root);
    const setHeld = v => { if (held === v) return; held = v; transition(v ? pressedOf() : idleOf()); refresh(); };
    const ptrUp = () => setHeld(false);
    pressBtn.addEventListener('pointerdown', e => { e.preventDefault(); setHeld(true); });
    window.addEventListener('pointerup', ptrUp);
    const keyHandler = e => {
      if (e.code === 'Space' && $('#bPress', document)) { e.preventDefault(); if (!e.repeat) setHeld(true); }
    };
    const keyUp = e => { if (e.code === 'Space' && $('#bPress', document)) { e.preventDefault(); setHeld(false); } };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyUp);
    window.__espCleanup = () => {
      window.removeEventListener('pointerup', ptrUp);
      window.removeEventListener('keydown', keyHandler);
      window.removeEventListener('keyup', keyUp);
    };
    $('#bReset', root).onclick = () => {
      rawEv = [{ t: Clock.t, v: idleOf() }]; stableEv = [{ t: Clock.t, v: idleOf() }]; isrEv = [];
      rawEdges = presses = isrCount = 0; stable = idleOf(); lastRaw = stable;
      term.log('计数已重置', 'info'); refresh();
    };
    bindTermClear(root);
    term.log('ESP32 就绪 · 等待按键事件', 'info');
    term.log('attachInterrupt(GPIO4, FALLING) 已注册', 'ok');
    refresh();

    function waveOpts(now) {
      return {
        now, window: 1200, cols: 6,
        channels: [
          { label: 'RAW', color: '#d64545', type: 'step', fn: t => at(rawEv, t) },
          { label: 'CLEAN', color: '#0d7c72', type: 'step', fn: t => at(stableEv, t) },
          { label: 'ISR', color: '#2563eb', type: 'step', fn: t => isrEv.some(e => t >= e && t < e + 14) ? 1 : 0 }
        ]
      };
    }
    startScope(root, 'bWave', waveOpts, 30);
    Clock.add('button-main', t => {
      // 浮空噪声
      if (s.pull === 'float' && t > noiseAt) {
        noiseAt = t + 25 + Math.random() * 45;
        pushRaw(t, Math.random() > .5 ? 1 : 0);
      }
      const raw = at(rawEv, t);
      if (raw !== lastRaw) { lastRaw = raw; lastChangeT = t; }
      if (t - lastChangeT >= s.deb && raw !== stable) {
        const prev = stable;
        stable = raw;
        stableEv.push({ t, v: stable });
        const rising = prev === 0 && stable === 1, falling = prev === 1 && stable === 0;
        const fire = s.edge === 'change' || (s.edge === 'falling' && falling) || (s.edge === 'rising' && rising);
        if (fire) {
          isrCount++; isrEv.push(t);
          if (isrEv.length > 100) isrEv = isrEv.slice(-60);
          if (t - logGate > 60) { term.log((s.method === 'isr' ? 'ISR 触发' : '轮询确认事件') + ' #' + isrCount + ' · ' + (rising ? 'RISING' : 'FALLING'), isrCount > presses + 1 ? 'err' : 'ok'); logGate = t; }
        }
        refresh();
      }
    });
  },
  cleanup() {
    if (window.__espCleanup) { window.__espCleanup(); window.__espCleanup = null; }
  }
});

/* ================================================================
   实验 3 · PWM / LEDC / 舵机
   ================================================================ */
registerLab('lab-pwm', {
  meta: {
    eyebrow: 'LAB 03 · 定时器与 PWM',
    title: 'PWM 调光与舵机控制',
    lead: '用占空比"伪造"一个连续的模拟量：观察方波、平均电压与 LED 亮度之间的关系，再切换到 50 Hz 舵机模式看脉宽如何编码角度。',
    chips: ['LEDC 16 通道', '频率 × 分辨率约束', '平均电压', '50 Hz 舵机'],
    time: '30 min'
  },
  html: () => labFrame({
    theory: `
      <p>PWM（脉冲宽度调制）用数字开关的高速通断，让负载"看到"一个平均电压。ESP32 的 <b>LEDC</b> 外设提供 16 路硬件 PWM，配置好后由硬件自动翻转引脚，CPU 完全无需干预。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">频率与分辨率的跷跷板</h3>
          <p>LEDC 从 80 MHz APB 时钟分频，计数器每个周期从 0 数到 <code class="inline">2^bits − 1</code>，因此存在硬约束：</p>
          <div class="formula">f<sub>PWM</sub> × 2<sup>bits</sup> ≤ 80 MHz<br>bits<sub>max</sub> = ⌊log₂(80 MHz / f<sub>PWM</sub>)⌋<br>例：5 kHz → 13 bit；20 kHz → 11 bit；50 Hz → 16 bit（上限）</div>
          <p class="small muted">调光一般取 1–5 kHz 以上避免可见闪烁；驱动舵机必须 <b>50 Hz</b>；驱动直流电机常取 20 kHz 以上以避开人耳听觉范围。</p>
        </div>
        <div>
          <h3 class="under">平均电压与视觉亮度</h3>
          <div class="formula">V<sub>avg</sub> = D × V<sub>CC</sub> = (t<sub>on</sub> / T) × 3.3 V<br>50% → 1.65 V；25% → 0.83 V</div>
          <p>LED 的<b>光通量</b>大致与平均电流成正比，但人眼对亮度的感知近似对数（γ ≈ 2.2），所以 50% 占空比看起来远不止"一半亮"。专业调光会做 <b>gamma 校正</b>：<code class="inline">duty = (brightness)^2.2</code>。</p>
          <p class="small muted">舵机则完全不同：它不读平均电压，而是测量<b>高电平脉宽</b>。50 Hz（20 ms）下，0.5 ms → 0°，1.5 ms → 90°，2.5 ms → 180°。</p>
        </div>
      </div>
      <div class="callout note"><div class="ci">i</div><p>Arduino-ESP32 2.x 用 <code class="inline">ledcSetup/ledcAttachPin/ledcWrite</code>；3.x 起改为 <code class="inline">ledcAttach(pin, freq, resolution)</code> + <code class="inline">ledcWrite(pin, duty)</code>。本课程按 2.x API 讲解，移植时注意 API 差异。</p></div>`,
    controls: segCtrl('pMode', { label: '工作模式', items: [['led', 'LED 调光'], ['servo', '舵机角度']] }, 'led') +
      `<div data-group="led">` +
      slider('pFreq', 'PWM 频率', 100, 20000, 100, 1000, ' Hz') +
      slider('pDuty', '占空比', 0, 100, 1, 40, ' %') +
      switchCtrl('pBreathe', '自动呼吸扫描') +
      slider('pBperiod', '呼吸周期', 500, 8000, 100, 3000, ' ms') +
      `</div>` +
      `<div data-group="servo" style="display:none">` +
      slider('pAngle', '目标角度', 0, 180, 1, 90, ' °') +
      `<div class="callout tip" style="grid-column:1/-1;margin:0"><div class="ci">✓</div><p>舵机模式固定 50 Hz，拖动角度观察脉宽从 0.5 ms 变化到 2.5 ms，占空比始终只在 2.5%–12.5% 之间。</p></div>` +
      `</div>`,
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="pRun">⏸ 暂停仿真</button></div>`,
    stage: `<div data-stage="led"><div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center;padding:10px 0">
        <div style="position:relative;width:130px;height:130px;display:grid;place-items:center">
          <div id="pLedHalo" style="position:absolute;inset:0;border-radius:50%;background:#ffd34d;filter:blur(22px);opacity:.15"></div>
          <div id="pLedCore" style="position:relative;width:76px;height:76px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8d8,#f5c542 55%,#b8801f);box-shadow:inset 0 -6px 12px rgba(0,0,0,.2),0 4px 14px rgba(0,0,0,.15)"></div>
        </div>
        <div style="flex:1;min-width:180px">
          <p class="small muted" style="margin-bottom:6px">等效亮度（人眼感知 γ≈2.2）</p>
          <div style="height:16px;border-radius:8px;background:var(--surface-3);overflow:hidden"><div id="pBright" style="height:100%;width:40%;background:linear-gradient(90deg,#f5c542,#ff9d3a);transition:width .1s"></div></div>
          <p class="small muted" style="margin-top:14px;margin-bottom:6px">直流平均电压</p>
          <div style="height:16px;border-radius:8px;background:var(--surface-3);overflow:hidden"><div id="pVolt" style="height:100%;width:40%;background:linear-gradient(90deg,#0d7c72,#38b8a5);transition:width .1s"></div></div>
        </div></div></div>
      <div data-stage="servo" style="display:none"><div class="circuit-stage" style="min-height:210px">
        <svg viewBox="0 0 240 200" class="raw" xmlns="http://www.w3.org/2000/svg">
          <circle cx="120" cy="105" r="82" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
          <path d="M38 105 A82 82 0 0 1 202 105" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 5"/>
          <text x="120" y="28" font-size="10" fill="#8697a9" text-anchor="middle" font-family="monospace">90°</text>
          <text x="34" y="112" font-size="10" fill="#8697a9" text-anchor="middle" font-family="monospace">0°</text>
          <text x="208" y="112" font-size="10" fill="#8697a9" text-anchor="middle" font-family="monospace">180°</text>
          <g id="pServoArm"><rect x="116" y="33" width="8" height="72" rx="4" fill="#0d7c72"/><circle cx="120" cy="40" r="6" fill="#d97706"/></g>
          <circle cx="120" cy="105" r="13" fill="#455c70"/><circle cx="120" cy="105" r="5" fill="#e8eef5"/>
        </svg></div></div>
      <p class="mini-note" id="pStageNote">硬件 PWM 由 LEDC 外设自动生成，CPU 只在需要改变占空比时写一次寄存器。</p>`,
    wave: simPanel('PWM 输出波形（展开约 6 个周期）', '<canvas class="wave" id="pWave"></canvas>' +
      legend([['数字输出（HIGH / LOW）', '#0d7c72'], ['平均电平（虚线示意）', '#d97706']]), 'pLive'),
    readout: readout([['频率', 'pF', '', '1000 Hz'], ['周期', 'pT', 'blue', '1000 µs'], ['占空比 / 脉宽', 'pD', 'amber', '40.0%'], ['最大分辨率', 'pBits', '', '16 bit'], ['ledcWrite 值', 'pVal', 'blue', '—'], ['平均电压', 'pV', '', '1.32 V']]),
    code: codeBlock('codePwm', 'pwm.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termPwm'),
    questions: [
      '频率从 1 kHz 提高到 20 kHz，最大可用分辨率从多少位降到多少位？为什么高频会损失调光精度？',
      '占空比 50% 时平均电压是 1.65 V，用万用表直流档测 GPIO 会得到什么读数？用示波器又会看到什么？',
      '舵机在 90° 时占空比约 7.5%，为什么不能简单地"用 7.5% 平均电压"驱动它？',
      '若把 LED 调光频率降到 20 Hz，人眼会看到什么？若要同时驱动 4 路 LED 且互不影响，LEDC 通道该怎么分配？'
    ]
  }),
  mount(root) {
    const s = { mode: 'led', freq: 1000, duty: 40, breathe: false, bp: 3000, angle: 90 };
    const term = new Terminal($('#termPwm', root));
    const bitsOf = f => clamp(Math.floor(Math.log2(80000000 / f)), 1, 16);
    const dutyAt = (t, now) => s.mode === 'servo'
      ? (0.5 + s.angle / 90) / 20
      : (s.breathe ? (0.5 + 0.5 * Math.sin(2 * Math.PI * t / s.bp - Math.PI / 2)) : s.duty / 100);
    function code() {
      const f = s.mode === 'servo' ? 50 : s.freq, bits = bitsOf(f);
      const max = Math.pow(2, bits) - 1;
      const d = s.mode === 'servo' ? (0.5 + s.angle / 90) / 20 : s.duty / 100;
      return s.mode === 'led'
        ? `// 实验 3 · LEDC 硬件 PWM 调光 (Arduino-ESP32 2.x)\nconst int LED_PIN = 25;\nconst int CHANNEL = 0;\nconst int FREQ = ${f};           // Hz\nconst int RES = ${bits};        // bit（受 80 MHz 时钟约束）\n\nvoid setup() {\n  Serial.begin(115200);\n  ledcSetup(CHANNEL, FREQ, RES);\n  ledcAttachPin(LED_PIN, CHANNEL);\n}\n\nvoid loop() {\n  const int maxDuty = (1 << RES) - 1;   // ${max}\n${s.breathe ? `  // 呼吸灯：正弦改变占空比，周期 ${s.bp} ms\n  float phase = 2.0 * PI * millis() / ${s.bp}.0;\n  float d = 0.5 + 0.5 * sin(phase - PI / 2.0);\n  ledcWrite(CHANNEL, (int)(d * maxDuty));\n  delay(10);` : `  ledcWrite(CHANNEL, (int)(${d.toFixed(3)} * maxDuty));  // ${Math.round(d * max)}\n  // 硬件自动输出，CPU 可以继续做其它事\n  delay(1000);`}\n}`
        : `// 实验 3 · 50 Hz 舵机，脉宽编码角度\nconst int SERVO_PIN = 13;\nconst int CHANNEL = 2;\nconst int FREQ = 50;            // 20 ms 周期\nconst int RES = ${bits};\n\nint angleToDuty(int deg) {\n  float pulseMs = 0.5 + deg / 90.0;    // 0.5 .. 2.5 ms\n  return (int)(pulseMs / 20.0 * ((1 << RES) - 1));\n}\n\nvoid setup() {\n  ledcSetup(CHANNEL, FREQ, RES);\n  ledcAttachPin(SERVO_PIN, CHANNEL);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  ledcWrite(CHANNEL, angleToDuty(${s.angle}));  // ${s.angle}° → ${(0.5 + s.angle / 90).toFixed(2)} ms\n  delay(1000);\n}`;
    }
    function refresh() {
      setCode('codePwm', code());
      $$('[data-group]', root).forEach(g => g.style.display = g.dataset.group === s.mode ? '' : 'none');
      $$('[data-stage]', root).forEach(g => g.style.display = g.dataset.stage === s.mode ? '' : 'none');
      const f = s.mode === 'servo' ? 50 : s.freq, bits = bitsOf(f), max = Math.pow(2, bits) - 1;
      setRead(root, 'pF', f + ' Hz');
      setRead(root, 'pT', f >= 1000 ? (1000000 / f).toFixed(0) + ' µs' : (1000 / f).toFixed(1) + ' ms');
      setRead(root, 'pBits', bits + ' bit');
      $('#pStageNote', root).textContent = s.mode === 'servo'
        ? '舵机内部电路测量高电平持续时间，与平均电压无关；脉宽误差需控制在几十微秒内。'
        : '硬件 PWM 由 LEDC 外设自动生成，CPU 只在需要改变占空比时写一次寄存器。';
    }
    onSeg(root, 'pMode', v => {
      s.mode = v;
      term.log('工作模式 → ' + (v === 'led' ? 'LED 调光' : '50 Hz 舵机'), 'info');
      refresh();
    });
    const map = {
      pFreq: v => { s.freq = v; refresh(); },
      pDuty: v => { s.duty = v; refresh(); },
      pBreathe: v => { s.breathe = v; refresh(); },
      pBperiod: v => { s.bp = v; refresh(); },
      pAngle: v => { s.angle = v; refresh(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const run = toggleRun(root, 'pRun', 'pLive');
    bindTermClear(root);
    term.log('LEDC 初始化完成 · 16 通道可用', 'ok');
    term.log('提示：频率与分辨率满足 f × 2^bits ≤ 80 MHz', 'info');
    refresh();

    let lastLogged = -1;
    function waveOpts(now) {
      const f = s.mode === 'servo' ? 50 : s.freq;
      const win = 6 / f * 1000;
      const t0 = now - win;
      const dAvg = dutyAt(now, now);
      return {
        now, window: win, cols: 6,
        timeFmt: tv => win >= 2 ? (tv / 1000).toFixed(1) + 'ms' : Math.round(tv * 1000) + 'µs',
        channels: [
          { label: 'PWM', color: '#0d7c72', type: 'step', fn: t => t < 0 ? 0 : pwmLevel(t, f, dutyAt(t, now)) },
          { label: 'AVG', color: '#d97706', type: 'line', fn: () => dAvg }
        ]
      };
    }
    startScope(root, 'pWave', waveOpts, 30);
    Clock.add('pwm-main', t => {
      if (!run.isRunning()) return;
      const d = dutyAt(t, t), f = s.mode === 'servo' ? 50 : s.freq;
      const bits = bitsOf(f), max = Math.pow(2, bits) - 1;
      setRead(root, 'pD', (d * 100).toFixed(1) + '% / ' + (d * 1000 / f).toFixed(2) + ' ms');
      setRead(root, 'pVal', String(Math.round(d * max)));
      setRead(root, 'pV', (d * 3.3).toFixed(2) + ' V');
      const halo = $('#pLedHalo', root), core = $('#pLedCore', root), bar = $('#pBright', root), vbar = $('#pVolt', root);
      const perceived = Math.pow(d, 1 / 2.2);
      if (halo) { halo.style.opacity = String(0.05 + d * .95); halo.style.transform = 'scale(' + (0.8 + d * .35) + ')'; }
      if (core) core.style.filter = 'brightness(' + (0.55 + d * .85) + ')';
      if (bar) bar.style.width = (perceived * 100).toFixed(1) + '%';
      if (vbar) vbar.style.width = (d * 100).toFixed(1) + '%';
      const arm = $('#pServoArm', root);
      if (arm) arm.setAttribute('transform', 'rotate(' + (s.angle - 90) + ' 120 105)');
      const bucket = Math.round(d * 100);
      if (s.mode === 'servo' && bucket !== lastLogged) { lastLogged = bucket; term.log('舵机目标 ' + s.angle + '° → 脉宽 ' + (0.5 + s.angle / 90).toFixed(2) + ' ms', 'info'); }
    });
  }
});

/* ================================================================
   实验 4 · ADC 采样与量化
   ================================================================ */
registerLab('lab-adc', {
  meta: {
    eyebrow: 'LAB 04 · 模拟输入',
    title: 'ADC 采样、量化与误差',
    lead: '把连续的模拟电压变成一串整数：调节分辨率、采样率与噪声，观察零阶保持、量化台阶和码值分布直方图。',
    chips: ['12 位 SAR ADC', '衰减与量程', '采样定理', '量化噪声'],
    time: '30 min'
  },
  html: () => labFrame({
    theory: `
      <p>ESP32 内置两个 <b>12 位逐次逼近型（SAR）ADC</b>，共 18 个通道。所谓 12 位，就是把参考电压区间切成 <code class="inline">2¹² = 4096</code> 个台阶，每个台阶（LSB）约为 <code class="inline">3.3 V / 4095 ≈ 0.8 mV</code>。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">采样 → 保持 → 量化 → 编码</h3>
          <p>采样开关每隔 <code class="inline">Ts = 1/fs</code> 闭合一次，电容上的电压被保持到下一次采样（零阶保持），随后 ADC 用二分搜索逐位比较，输出整数码值：</p>
          <div class="formula">code = round( V<sub>in</sub> / V<sub>ref</sub> × (2<sup>N</sup> − 1) )<br>V<sub>quant</sub> = code × V<sub>ref</sub> / (2<sup>N</sup> − 1)<br>e<sub>q</sub> = V<sub>quant</sub> − V<sub>in</sub>，|e<sub>q</sub>| ≤ ½ LSB</div>
          <p class="small muted">理想 ADC 的量化噪声近似白噪声，理论 SNR ≈ <code class="inline">6.02N + 1.76 dB</code>（12 位约 74 dB）。片内 ADC 因参考电压与非线性，实际有效位数常只有 9–10 位。</p>
        </div>
        <div>
          <h3 class="under">三个必须知道的"坑"</h3>
          <div class="table-wrap"><table class="tbl">
            <tr><th>坑</th><th>说明与对策</th></tr>
            <tr><td>量程与衰减</td><td>0 dB 时线性区约 0–1.1 V；设 <code class="inline">ADC_11db</code> 可测到约 3.3 V。超过量程会饱和到满码</td></tr>
            <tr><td>ADC2 与 WiFi</td><td>ADC2 控制器被 WiFi 驱动占用，联网后只能用 ADC1（GPIO32–36、39）</td></tr>
            <tr><td>非线性与噪声</td><td>多点标定 + 滑动平均/中值滤波；高阻信号源前加电压跟随器或 0.1 µF 电容</td></tr>
          </table></div>
          <div class="callout note" style="margin-top:12px"><div class="ci">i</div><p>采样定理要求 <code class="inline">fs ≥ 2·f<sub>signal</sub></code>。试着把信号频率调高、采样率调低，观察波形出现"混叠"（Aliasing）——这是所有数据采集系统的基础约束。</p></div>
        </div>
      </div>`,
    controls:
      selectCtrl('aWave', '输入信号', [['dc', '直流电平'], ['sine', '正弦波'], ['tri', '三角波']], 'dc') +
      slider('aVin', '信号幅值 / 直流电平', 0, 3.3, 0.05, 1.65, ' V', '1.65 V') +
      slider('aSigF', '信号频率', 0.2, 8, 0.2, 1, ' Hz', '1.0 Hz') +
      selectCtrl('aAtten', '衰减档位 / 有效量程', [['11', '11 dB → 约 3.3 V'], ['6', '6 dB → 约 2.2 V'], ['2.5', '2.5 dB → 约 1.5 V'], ['0', '0 dB → 约 1.1 V']], '11') +
      selectCtrl('aBits', 'ADC 分辨率', [[12, '12 bit（4096 级）'], [11, '11 bit（2048 级）'], [10, '10 bit（1024 级）'], [9, '9 bit（512 级）']], 12, true) +
      slider('aFs', '采样率', 5, 500, 5, 100, ' Hz') +
      switchCtrl('aNoise', '叠加随机噪声', true) +
      slider('aNoiseAmp', '噪声幅值', 0, 0.4, 0.01, 0.08, ' V', '0.08 V'),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="aRun">⏸ 暂停仿真</button></div>
      <div class="callout tip" style="margin-top:14px"><div class="ci">✓</div><p>推荐对照实验：① 分辨率从 12 bit 降到 9 bit，看量化台阶如何变粗；② 衰减设为 0 dB、输入 1.65 V，观察饱和；③ 信号 5 Hz + 采样率 10 Hz，观察临界混叠。</p></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">量化过程示意（当前采样点）</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:170px"><p class="small muted" style="margin:0 0 5px">模拟输入 V<sub>in</sub></p><div id="aBarIn" style="height:20px;border-radius:6px;background:linear-gradient(90deg,#2563eb,#7aa7ff);width:50%"></div></div>
        <div style="font-size:20px;color:var(--text-3)">→</div>
        <div style="flex:1;min-width:170px"><p class="small muted" style="margin:0 0 5px">量化输出 V<sub>quant</sub></p><div id="aBarOut" style="height:20px;border-radius:6px;background:linear-gradient(90deg,#0d7c72,#38b8a5);width:50%"></div></div>
      </div>
      <div id="aSat" style="margin-top:12px"></div></div>
      <div class="sim-panel" style="margin-top:14px"><div class="sim-title">码值分布直方图（最近 400 次采样）</div><canvas class="wave" id="aHist" style="height:130px"></canvas></div>`,
    wave: simPanel('模拟输入 / 采样保持与量化 / 量化误差', '<canvas class="wave" id="aWaveCv" style="height:210px"></canvas>' +
      legend([['CH1 模拟输入（蓝色）', '#2563eb'], ['CH2 量化输出（青色）', '#0d7c72'], ['CH3 量化误差（橙色）', '#d97706']]), 'aLive'),
    readout: readout([['当前码值', 'aCode', 'blue', '—'], ['量化电压', 'aVq', '', '—'], ['LSB 台阶', 'aLsb', 'amber', '—'], ['量化误差', 'aErr', '', '—'], ['满量程', 'aFs0', '', '3.30 V'], ['奈奎斯特上限', 'aNyq', 'blue', '50 Hz']]),
    code: codeBlock('codeAdc', 'adc.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termAdc'),
    questions: [
      '分辨率从 12 bit 降到 9 bit，LSB 从多少 mV 变成多少 mV？在直流 + 噪声条件下直方图会从几根柱子变成什么样？',
      '衰减设为 0 dB（量程 1.1 V）而输入 1.65 V，读数为何停在满码？实际项目中如何设计分压电路测量 12 V 电池？',
      '把信号频率设为 5 Hz、采样率降到 10 Hz，波形出现什么现象？若采样率只有 8 Hz 呢？',
      '开启 WiFi 后把传感器接到 GPIO25（ADC2_CH8）会怎样？应该改到哪个引脚？'
    ]
  }),
  mount(root) {
    const s = { wave: 'dc', vin: 1.65, sigF: 1, atten: '11', bits: 12, fs: 100, noise: true, amp: .08 };
    const term = new Terminal($('#termAdc', root));
    const VREF = { '0': 1.1, '2.5': 1.5, '6': 2.2, '11': 3.3 };
    const hist = [];
    let lastSat = false;
    const pseudo = t => { const x = Math.sin(t * 1.271 + 0.31) * 43758.5453; return ((x - Math.floor(x)) * 2 - 1); };
    const vref = () => VREF[s.atten];
    const maxCode = () => Math.pow(2, s.bits) - 1;
    function signal(t) {
      const p = s.sigF * Math.max(0, t) / 1000;
      if (s.wave === 'sine') return s.vin / 2 + s.vin / 2 * Math.sin(2 * Math.PI * p);
      if (s.wave === 'tri') return s.vin * Math.abs(((p % 1) + 1) % 1 * 2 - 1);
      return s.vin;
    }
    const analog = t => clamp(signal(t) + (s.noise ? pseudo(t) * s.amp : 0), 0, 3.3);
    const codeAt = t => clamp(Math.round(analog(t) / vref() * maxCode()), 0, maxCode());
    const sampledCode = t => { const Ts = 1000 / s.fs; return codeAt(Math.floor(Math.max(0, t) / Ts) * Ts); };
    function code() {
      const attenName = { '0': 'ADC_0db', '2.5': 'ADC_2_5db', '6': 'ADC_6db', '11': 'ADC_11db' }[s.atten];
      return `// 实验 4 · ADC 采样 + 滑动平均滤波\nconst int ADC_PIN = 34;      // ADC1_CH6，避开 ADC2/WiFi 冲突\nconst int N = ${s.bits};               // 分辨率\nconst int SAMPLES = 16;\n\nvoid setup() {\n  Serial.begin(115200);\n  analogReadResolution(N);            // 9 .. 12 bit\n  analogSetAttenuation(${attenName}); // 满量程约 ${vref().toFixed(1)} V\n  pinMode(ADC_PIN, INPUT);\n}\n\nint filterRead() {\n  long sum = 0;\n  for (int i = 0; i < SAMPLES; i++) {\n    sum += analogRead(ADC_PIN);\n    delayMicroseconds(${Math.max(1, Math.round(1000 / s.fs) * 1000 / 16)});\n  }\n  return sum / SAMPLES;\n}\n\nvoid loop() {\n  int code = filterRead();\n  float volts = code * ${vref().toFixed(2)} / ${maxCode()}.0;\n  Serial.printf("code=%4d  V=%.3f  LSB=%.2f mV\\n",\n                code, volts, ${vref().toFixed(2)} * 1000.0 / ${maxCode()});\n  delay(${Math.max(1, Math.round(1000 / s.fs))});   // ≈ ${s.fs} Hz 采样\n}`;
    }
    function refresh() {
      setCode('codeAdc', code());
      setRead(root, 'aFs0', vref().toFixed(2) + ' V');
      setRead(root, 'aLsb', (vref() * 1000 / maxCode()).toFixed(2) + ' mV');
      setRead(root, 'aNyq', (s.fs / 2).toFixed(0) + ' Hz');
      const sat = s.vin > vref();
      $('#aSat', root).innerHTML = sat
        ? '<div class="callout danger" style="margin:0"><div class="ci">!</div><p><b>已超量程：</b>输入幅值超过当前衰减档的线性范围，ADC 输出会削顶到满码 ' + maxCode() + '。请提高衰减档位或在外部加分压电路。</p></div>'
        : '<div class="callout tip" style="margin:0"><div class="ci">✓</div><p>当前输入落在 ' + vref().toFixed(2) + ' V 量程内，量化误差理论上不超过 ±½ LSB。</p></div>';
      if (sat !== lastSat) { lastSat = sat; term.log(sat ? '警告：输入超量程，读数削顶' : '输入回到量程内', sat ? 'err' : 'ok'); }
    }
    const map = {
      aWave: v => { s.wave = v; refresh(); },
      aVin: v => { s.vin = v; refresh(); },
      aSigF: v => { s.sigF = v; refresh(); },
      aAtten: v => { s.atten = v; term.log('衰减 ' + v + ' dB → 量程约 ' + vref().toFixed(1) + ' V', 'info'); hist.length = 0; refresh(); },
      aBits: v => { s.bits = v; term.log('分辨率切换为 ' + v + ' bit', 'info'); hist.length = 0; refresh(); },
      aFs: v => { s.fs = v; refresh(); },
      aNoise: v => { s.noise = v; hist.length = 0; refresh(); },
      aNoiseAmp: v => { s.amp = v; refresh(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const run = toggleRun(root, 'aRun', 'aLive');
    bindTermClear(root);
    term.log('ADC1 初始化 · GPIO34 · ' + s.bits + ' bit', 'ok');
    term.log('提示：ADC2 通道在 WiFi 开启时不可用', 'warn');
    refresh();

    function waveOpts(now) {
      const Ts = 1000 / s.fs, qerr = t => {
        const a = analog(t), c = sampledCode(t);
        return 0.5 + (c / maxCode() * vref() - a) / (2 * vref() / maxCode());
      };
      return {
        now, window: 1600, cols: 8,
        channels: [
          { label: 'VIN', color: '#2563eb', type: 'line', fn: t => clamp(analog(t) / vref(), 0, 1) },
          { label: 'CODE', color: '#0d7c72', type: 'step', fn: t => sampledCode(t) / maxCode() },
          { label: 'ERR', color: '#d97706', type: 'line', fn: t => clamp(qerr(t), 0, 1) }
        ]
      };
    }
    startScope(root, 'aWaveCv', waveOpts, 30);
    let acc = 0, lastCollect = 0;
    Clock.add('adc-main', (t, dt) => {
      if (!run.isRunning()) return;
      const c = sampledCode(t), a = analog(t);
      const vq = c / maxCode() * vref(), lsb = vref() / maxCode();
      setRead(root, 'aCode', String(c));
      setRead(root, 'aVq', vq.toFixed(3) + ' V');
      setRead(root, 'aErr', ((vq - a) * 1000).toFixed(2) + ' mV');
      const bin = $('#aBarIn', root), bout = $('#aBarOut', root);
      if (bin) bin.style.width = (clamp(a / 3.3, 0, 1) * 100).toFixed(1) + '%';
      if (bout) bout.style.width = (clamp(vq / 3.3, 0, 1) * 100).toFixed(1) + '%';
      // 按采样率收集码值
      if (t - lastCollect >= 1000 / s.fs) {
        lastCollect = t;
        hist.push(c); if (hist.length > 400) hist.shift();
      }
      acc += dt;
      if (acc >= 60) {
        acc = 0;
        histogram($('#aHist', root), hist, { bins: 32, max: maxCode(), color: '#2563eb', title: '码值分布 · 0 … ' + maxCode() });
      }
      void lsb;
    });
    histogram($('#aHist', root), [], { bins: 32, max: maxCode() });
  }
});

/* ================================================================
   实验 5 · UART / I²C / SPI 时序
   ================================================================ */
registerLab('lab-bus', {
  meta: {
    eyebrow: 'LAB 05 · 串行通信',
    title: 'UART / I²C / SPI 逐位时序',
    lead: '把一帧数据拆开到"位"的粒度：看 START/ACK/STOP 如何界定 I²C 帧、CPOL/CPHA 如何决定 SPI 采样边沿、起始位与停止位如何包装 UART 字节。',
    chips: ['7 位地址 + ACK', 'SPI 4 种模式', '波特率与位时间', '逐位动画'],
    time: '30 min'
  },
  html: () => labFrame({
    theory: `
      <p>三种总线的本质区别不在"快慢"，而在<b>如何界定一帧数据、如何共享线路</b>。下面的时序图把同一字节 <code class="inline">0x5A</code> 分别用三种协议发出，观察各自多花了多少开销。</p>
      <div class="table-wrap"><table class="tbl">
        <tr><th>特性</th><th>UART</th><th>I²C</th><th>SPI</th></tr>
        <tr><td>信号线</td><td>TX / RX / GND（2 线，点对点）</td><td>SDA / SCL（2 线，多从机）</td><td>MOSI / MISO / SCLK / CS（3+N 线）</td></tr>
        <tr><td>时钟</td><td>无，靠双方约定波特率</td><td>主机 SCL，同步</td><td>主机 SCLK，同步</td></tr>
        <tr><td>寻址</td><td>无</td><td>7 / 10 位地址 + R/W 位</td><td>硬件片选 CS</td></tr>
        <tr><td>帧同步</td><td>起始位 + 停止位</td><td>START / STOP + 每字节 ACK</td><td>CS 拉低到拉高</td></tr>
        <tr><td>典型速率</td><td>9600 – 921600 baud</td><td>100 kHz / 400 kHz / 1 MHz</td><td>1 – 40 MHz（默认引脚更快）</td></tr>
        <tr><td>输出结构</td><td>推挽</td><td><b>开漏 + 上拉</b></td><td>推挽</td></tr>
      </table></div>
      <div class="grid-2" style="margin-top:16px">
        <div class="callout note"><div class="ci">i</div><p><b>I²C 为什么必须上拉：</b>器件只能把总线拉低，高电平由 4.7 kΩ 上拉电阻产生。总线越长、挂的设备越多，分布电容越大，上升沿越慢，此时需减小上拉阻值或降低速率。</p></div>
        <div class="callout warn"><div class="ci">!</div><p><b>SPI 模式别配错：</b>CPOL 决定时钟空闲电平，CPHA 决定在第一个还是第二个边沿采样。主从机模式不一致时会读到整体移位的数据，是调试中最常见的"能通信但数据全错"。</p></div>
      </div>`,
    controls: segCtrl('uProto', { label: '协议', items: [['i2c', 'I²C'], ['spi', 'SPI'], ['uart', 'UART']] }, 'i2c') +
      `<div data-group="i2c">` +
      slider('uByte', '发送数据（十进制）', 0, 255, 1, 90, '', '90 = 0x5A') +
      slider('uAddr', '从机地址（7 位）', 0, 127, 1, 60, '', '60 = 0x3C') +
      selectCtrl('uSpeed', 'SCL 时钟', [[100, '100 kHz 标准模式'], [400, '400 kHz 快速模式'], [1000, '1 MHz 高速']], 100, true) +
      `</div>` +
      `<div data-group="spi" style="display:none">` +
      slider('uByte2', 'MOSI 数据（十进制）', 0, 255, 1, 165, '', '165 = 0xA5') +
      selectCtrl('uSpiMode', 'SPI 模式', [[0, '模式 0 · CPOL=0 CPHA=0'], [1, '模式 1 · CPOL=0 CPHA=1'], [2, '模式 2 · CPOL=1 CPHA=0'], [3, '模式 3 · CPOL=1 CPHA=1']], 0, true) +
      selectCtrl('uSpiClk', 'SCLK 频率', [[1, '1 MHz'], [8, '8 MHz'], [20, '20 MHz'], [40, '40 MHz']], 8, true) +
      `</div>` +
      `<div data-group="uart" style="display:none">` +
      slider('uByte3', '发送字节（十进制）', 0, 255, 1, 65, '', '65 = 0x41 "A"') +
      selectCtrl('uBaud', '波特率', [[9600, '9600 baud'], [19200, '19200 baud'], [115200, '115200 baud']], 115200, true) +
      selectCtrl('uParity', '校验位', [['none', '无校验 8N1'], ['even', '偶校验'], ['odd', '奇校验']], 'none') +
      `</div>`,
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="uPlay">⏸ 暂停播放</button><button class="btn" id="uStep">单步前进一位</button><button class="btn" id="uReplay">↺ 重播</button></div>
      <div class="callout tip" style="margin-top:14px"><div class="ci">✓</div><p>切换协议后观察：发送同样 1 字节，UART 需要 10 位、I²C 需要 20 位时段（含地址与 ACK）、SPI 需要 8 个时钟。<b>协议开销</b>是选型的重要依据。</p></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">帧结构解析</div><div id="busExplain"></div></div>
      <div class="sim-panel" style="margin-top:14px"><div class="sim-title">协议要点</div><div id="busNote" class="small muted"></div></div>`,
    wave: simPanel('总线时序（动画游标自左向右扫描）', '<canvas class="wave" id="uWave" style="height:250px"></canvas>' +
      legend([['SCL / SCLK / TX', '#0d7c72'], ['SDA / MOSI / 数据位', '#2563eb'], ['CS / MISO / 控制', '#d97706']]), 'uLive'),
    readout: readout([['协议', 'uP', '', 'I²C'], ['时钟 / 波特率', 'uClk', 'blue', '100 kHz'], ['帧内位数', 'uBits', 'amber', '20'], ['帧时长', 'uTime', '', '—'], ['有效数据率', 'uRate', '', '—']]),
    code: codeBlock('codeBus', 'bus.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termBus'),
    questions: [
      'I²C 发送 1 字节数据实际用了多少个 SCL 脉冲？多出来的时钟消耗在哪？若从机未应答（NACK），主机应如何处理？',
      'UART 在 115200 baud、8N1 下发送 1 字节需要多少微秒？纯数据吞吐效率是多少？为什么 UART 不需要时钟线却对波特率误差敏感？',
      'SPI 模式 0 与模式 3 的采样边沿分别在哪里？主从机配置不一致时读到的字节会呈现什么规律？',
      '若 I²C 总线上挂了 5 个传感器、走线 30 cm，SCL 上升沿变圆可能带来什么问题？有哪两种工程解决办法？'
    ]
  }),
  mount(root) {
    const s = { proto: 'i2c', byte: 90, addr: 60, speed: 100, byte2: 165, spimode: 0, spiclk: 8, byte3: 65, baud: 115200, parity: 'none' };
    const term = new Terminal($('#termBus', root));
    let playing = true, elapsed = 0, stepMode = false, stepProgress = 0;
    const CYCLE = 6000;
    const hex = n => '0x' + n.toString(16).toUpperCase().padStart(2, '0');
    const bin8 = n => n.toString(2).padStart(8, '0');

    function frame() {
      if (s.proto === 'i2c') {
        const addrByte = (s.addr << 1) | 0, byte = s.byte;
        const scl = [{ t0: 0, t1: 1, v: 1 }], sda = [{ t0: 0, t1: .5, v: 1 }, { t0: .5, t1: 1, v: 0 }];
        for (let i = 1; i <= 18; i++) { scl.push({ t0: i, t1: i + .5, v: 0 }, { t0: i + .5, t1: i + 1, v: 1 }); }
        scl.push({ t0: 19, t1: 20, v: 1 });
        for (let i = 0; i < 8; i++) sda.push({ t0: 1 + i, t1: 2 + i, v: (addrByte >> (7 - i)) & 1, text: String((addrByte >> (7 - i)) & 1) });
        sda.push({ t0: 9, t1: 10, v: 0, text: 'ACK' });
        for (let i = 0; i < 8; i++) sda.push({ t0: 10 + i, t1: 11 + i, v: (byte >> (7 - i)) & 1, text: String((byte >> (7 - i)) & 1) });
        sda.push({ t0: 18, t1: 19, v: 0, text: 'ACK' });
        sda.push({ t0: 19, t1: 19.5, v: 0 }, { t0: 19.5, t1: 20, v: 1, text: 'STOP' });
        const bitTimeUs = 1000 / s.speed;  // 100kHz → 10 µs
        return {
          total: 20, channels: [{ name: 'SCL', color: '#0d7c72', bits: scl }, { name: 'SDA', color: '#2563eb', bits: sda }],
          marks: [{ t: 0, label: 'START' }, { t: 1, label: '地址+R/W' }, { t: 9, label: 'ACK' }, { t: 10, label: '数据' }, { t: 18, label: 'ACK' }, { t: 19, label: 'STOP' }],
          meta: { clk: s.speed + ' kHz', bits: 20, frameUs: 20 * bitTimeUs * 1000 / 1000 * 1000, bitUs: bitTimeUs * 1000 },
          explain: `<div class="table-wrap"><table class="tbl">
            <tr><th>时段</th><th>内容</th><th>值</th><th>说明</th></tr>
            <tr><td>START</td><td>SCL 高时 SDA 下降沿</td><td>—</td><td>主机发起传输，所有从机开始监听</td></tr>
            <tr><td>地址字节</td><td>7 位地址 + R/W(0=写)</td><td>${bin8(addrByte)} = ${hex(addrByte)}</td><td>地址 ${hex(s.addr)} 的从机拉低 SDA 应答</td></tr>
            <tr><td>ACK</td><td>第 9 个时钟</td><td>0</td><td>从机把 SDA 拉低表示收到</td></tr>
            <tr><td>数据字节</td><td>8 位，MSB 先发</td><td>${bin8(byte)} = ${hex(byte)}</td><td>SCL 低电平时允许 SDA 变化，高电平时采样</td></tr>
            <tr><td>ACK / STOP</td><td>应答 + SCL 高时 SDA 上升沿</td><td>—</td><td>主机释放总线，帧结束</td></tr>
          </table></div>`,
          note: `SCL ${s.speed} kHz → 每位 ${(1000 / s.speed).toFixed(2)} µs，本帧 20 位共约 ${(20 * 1000 / s.speed).toFixed(1)} µs。有效数据仅 8 位，<b>协议效率 40%</b>。`
        };
      }
      if (s.proto === 'spi') {
        const byte = s.byte2, miso = 0x3A, cpol = s.spimode >= 2 ? 1 : 0, cpha = s.spimode % 2;
        const cs = [{ t0: 0, t1: .5, v: 1 }, { t0: .5, t1: 9.5, v: 0 }, { t0: 9.5, t1: 10, v: 1 }];
        const sclk = [{ t0: 0, t1: 1, v: cpol }], mosi = [{ t0: 0, t1: 1, v: 0 }], MISOch = [{ t0: 0, t1: 1, v: 0 }];
        for (let i = 1; i <= 8; i++) {
          sclk.push({ t0: i, t1: i + .5, v: cpol }, { t0: i + .5, t1: i + 1, v: 1 - cpol });
          mosi.push({ t0: i, t1: i + 1, v: (byte >> (8 - i)) & 1, text: String((byte >> (8 - i)) & 1) });
          MISOch.push({ t0: i, t1: i + 1, v: (miso >> (8 - i)) & 1 });
        }
        mosi.push({ t0: 9, t1: 10, v: 0 }); MISOch.push({ t0: 9, t1: 10, v: 0 }); sclk.push({ t0: 9, t1: 10, v: cpol });
        const sampleEdge = cpha === 0 ? '第 1 个边沿（本帧 i+0.5 处）' : '第 2 个边沿（本帧 i+1 处）';
        return {
          total: 10, channels: [
            { name: 'CS', color: '#d97706', bits: cs }, { name: 'SCLK', color: '#0d7c72', bits: sclk },
            { name: 'MOSI', color: '#2563eb', bits: mosi }, { name: 'MISO', color: '#7c4dd6', bits: MISOch }],
          marks: [{ t: .5, label: 'CS↓' }, { t: 1, label: 'bit7' }, { t: 5, label: 'bit3' }, { t: 9, label: 'bit0' }, { t: 9.5, label: 'CS↑' }],
          meta: { clk: s.spiclk + ' MHz', bits: 8, bitUs: 1000 / s.spiclk },
          explain: `<div class="table-wrap"><table class="tbl">
            <tr><th>项目</th><th>值 / 说明</th></tr>
            <tr><td>MOSI 主机发送</td><td>${bin8(byte)} = ${hex(byte)}，MSB 先发</td></tr>
            <tr><td>MISO 从机返回</td><td>${bin8(miso)} = ${hex(miso)}，全双工同时收发</td></tr>
            <tr><td>SPI 模式 ${s.spimode}</td><td>CPOL=${cpol}（空闲${cpol ? '高' : '低'}），CPHA=${cpha} → ${sampleEdge}采样</td></tr>
            <tr><td>片选 CS</td><td>拉低选中从机，帧结束拉高；多从机各需一根 CS</td></tr>
          </table></div>`,
          note: `SCLK ${s.spiclk} MHz → 每位 ${(1000 / s.spiclk).toFixed(1)} ns，8 位共 ${(8000 / s.spiclk).toFixed(0)} ns。SPI <b>无地址、无 ACK、全双工</b>，效率接近 100%，代价是每多一个从机多一根 CS。`
        };
      }
      // UART
      const byte = s.byte3;
      const ones = bin8(byte).split('').filter(c => c === '1').length;
      const parityBit = s.parity === 'none' ? null : (s.parity === 'even' ? (ones % 2) : (1 - ones % 2));
      const seq = [{ name: '起始位', v: 0, text: 'START' }];
      for (let i = 0; i < 8; i++) seq.push({ name: 'D' + i, v: (byte >> i) & 1, text: String((byte >> i) & 1) });
      if (parityBit !== null) seq.push({ name: '校验位', v: parityBit, text: 'P' + parityBit });
      seq.push({ name: '停止位', v: 1, text: 'STOP' });
      seq.push({ name: '空闲', v: 1, text: 'IDLE' });
      const tx = seq.map((b, i) => ({ t0: i, t1: i + 1, v: b.v, text: b.text }));
      const bitUs = 1e6 / s.baud;
      return {
        total: seq.length, channels: [{ name: 'TX', color: '#0d7c72', bits: tx }],
        marks: [{ t: 0, label: 'START↓' }, { t: 1, label: 'D0 (LSB)' }, { t: 8, label: 'D7' }, { t: seq.length - 2, label: 'STOP' }],
        meta: { clk: s.baud + ' baud', bits: seq.length, bitUs },
        explain: `<div class="table-wrap"><table class="tbl">
          <tr><th>位序</th><th>含义</th><th>电平</th><th>时长</th></tr>
          ${seq.map((b, i) => `<tr><td>${i}</td><td>${b.name}</td><td>${b.v}</td><td>${bitUs.toFixed(2)} µs</td></tr>`).join('')}
        </table></div>`,
        note: `${s.baud} baud → 每位 ${bitUs.toFixed(2)} µs；${seq.length} 位一帧约 ${(seq.length * bitUs).toFixed(1)} µs，其中有效数据 8 位，<b>效率 ${(800 / seq.length).toFixed(0)}%</b>。UART 无时钟线，收发双方波特率误差一般需小于 ±2%，否则会在帧末尾采样错位。`
      };
    }
    function code() {
      if (s.proto === 'i2c') return `// 实验 5 · I²C 向 OLED (0x${s.addr.toString(16).toUpperCase()}) 写一字节\n#include <Wire.h>\n\nvoid setup() {\n  Wire.begin(21, 22, ${s.speed * 1000});  // SDA, SCL, 频率\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  Wire.beginTransmission(0x${s.addr.toString(16).toUpperCase().padStart(2, '0')});\n  Wire.write(${hex(s.byte)});            // 数据 ${bin8(s.byte)}\n  uint8_t err = Wire.endTransmission();  // 0 = 收到 ACK\n  Serial.printf("endTransmission = %d\\n", err);\n  delay(1000);\n}`;
      if (s.proto === 'spi') return `// 实验 5 · SPI 模式 ${s.spimode} 全双工传输\n#include <SPI.h>\n\nSPISettings cfg(${s.spiclk} * 1000000, MSBFIRST, SPI_MODE${s.spimode});\nconst int CS_PIN = 5;\n\nvoid setup() {\n  pinMode(CS_PIN, OUTPUT);\n  digitalWrite(CS_PIN, HIGH);\n  SPI.begin(18, 19, 23, CS_PIN);   // SCLK, MISO, MOSI, SS\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  SPI.beginTransaction(cfg);\n  digitalWrite(CS_PIN, LOW);\n  uint8_t rx = SPI.transfer(${hex(s.byte2)});  // 同时收一字节\n  digitalWrite(CS_PIN, HIGH);\n  SPI.endTransaction();\n  Serial.printf("MOSI=${hex(s.byte2)}  MISO=0x%02X\\n", rx);\n  delay(1000);\n}`;
      const parityCfg = s.parity === 'none' ? 'SERIAL_8N1' : s.parity === 'even' ? 'SERIAL_8E1' : 'SERIAL_8O1';
      return `// 实验 5 · UART 发送 ${hex(s.byte3)}\nvoid setup() {\n  Serial.begin(${s.baud});              // UART0，日志\n  Serial2.begin(${s.baud}, ${parityCfg}, 16, 17); // RX=16, TX=17\n}\n\nvoid loop() {\n  Serial2.write(${hex(s.byte3)});       // 起始位 + 8 数据位 + 停止位\n  Serial.printf("sent ${hex(s.byte3)} @ ${s.baud} baud\\n");\n  delay(1000);\n}`;
    }
    function refresh(quiet) {
      setCode('codeBus', code());
      $$('[data-group]', root).forEach(g => g.style.display = g.dataset.group === s.proto ? '' : 'none');
      const f = frame();
      $('#busExplain', root).innerHTML = f.explain;
      $('#busNote', root).innerHTML = f.note;
      setRead(root, 'uP', s.proto === 'i2c' ? 'I²C' : s.proto.toUpperCase());
      setRead(root, 'uClk', f.meta.clk);
      setRead(root, 'uBits', String(f.meta.bits));
      if (s.proto === 'uart') {
        setRead(root, 'uTime', (f.meta.bits * f.meta.bitUs).toFixed(1) + ' µs');
        setRead(root, 'uRate', (s.baud * 8 / f.meta.bits / 8 / 1024).toFixed(2) + ' KB/s');
      } else if (s.proto === 'i2c') {
        setRead(root, 'uTime', (20 * 1000 / s.speed).toFixed(1) + ' µs');
        setRead(root, 'uRate', (s.speed * 8 / 20 / 8).toFixed(1) + ' KB/s');
      } else {
        setRead(root, 'uTime', (8 * 1000 / s.spiclk).toFixed(0) + ' ns');
        setRead(root, 'uRate', (s.spiclk / 8).toFixed(2) + ' MB/s');
      }
      if (!quiet) term.log('帧已重构 · ' + s.proto.toUpperCase() + ' · ' + f.meta.bits + ' 位', 'info');
    }
    onSeg(root, 'uProto', v => { s.proto = v; elapsed = 0; stepProgress = 0; stepMode = false; term.log('切换协议 → ' + v.toUpperCase(), 'ok'); refresh(true); });
    const q = () => refresh(true);
    const map = {
      uByte: v => { s.byte = v; q(); }, uAddr: v => { s.addr = v; q(); }, uSpeed: v => { s.speed = v; q(); },
      uByte2: v => { s.byte2 = v; q(); }, uSpiMode: v => { s.spimode = v; q(); }, uSpiClk: v => { s.spiclk = v; q(); },
      uByte3: v => { s.byte3 = v; q(); }, uBaud: v => { s.baud = v; q(); }, uParity: v => { s.parity = v; q(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k], v => {
      if (k === 'uByte' || k === 'uByte2' || k === 'uByte3') return v + ' = ' + hex(v);
      if (k === 'uAddr') return v + ' = ' + hex(v);
      return undefined;
    }));
    // 滑块显示修正
    ['uByte', 'uByte2', 'uByte3', 'uAddr'].forEach(k => {
      const out = $('[data-out="' + k + '"]', root), el = $('[data-ctrl="' + k + '"]', root);
      if (out && el) out.textContent = el.value + ' = ' + hex(Number(el.value));
    });
    $('#uPlay', root).onclick = e => {
      playing = !playing; e.target.textContent = playing ? '⏸ 暂停播放' : '▶ 继续播放';
      e.target.classList.toggle('primary', !playing);
      const live = $('#uLive', root); if (live) { live.classList.toggle('running', playing); live.textContent = playing ? 'RUNNING' : 'PAUSED'; }
    };
    $('#uStep', root).onclick = () => { playing = false; stepMode = true; const f = frame(); stepProgress = clamp(stepProgress + 1 / f.total, 0, 1); $('#uPlay', root).textContent = '▶ 继续播放'; $('#uPlay', root).classList.add('primary'); };
    $('#uReplay', root).onclick = () => { elapsed = 0; stepProgress = 0; stepMode = false; playing = true; $('#uPlay', root).textContent = '⏸ 暂停播放'; $('#uPlay', root).classList.remove('primary'); };
    bindTermClear(root);
    term.log('逻辑分析仪就绪 · 采样率设为时钟的 10 倍', 'ok');
    term.log('提示：切换协议观察帧开销差异', 'info');
    refresh();

    let lastCycle = 0;
    Clock.add('bus-main', (t, dt) => {
      if (playing && !stepMode) { elapsed += dt; if (elapsed > CYCLE) { elapsed -= CYCLE; const f = frame(); term.log('帧发送完成 · ' + f.meta.bits + ' 位 / ' + f.meta.clk, 'ok'); } }
      const f = frame();
      const p = stepMode ? stepProgress : clamp(elapsed / CYCLE, 0, 1);
      timing($('#uWave', root), { channels: f.channels, marks: f.marks, total: f.total, progress: p });
    });
  }
});
