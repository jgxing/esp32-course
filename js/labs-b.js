/* ============================================================
   labs-b.js · 实验 6–9 + 综合项目
   WiFi/MQTT / 传感器 / FreeRTOS / 低功耗 / 环境监测站
   ============================================================ */

/* ================================================================
   实验 6 · WiFi 与 MQTT
   ================================================================ */
registerLab('lab-wifi', {
  meta: {
    eyebrow: 'LAB 06 · 无线联网',
    title: 'WiFi 接入与 MQTT 数据上报',
    lead: '点一次"连接"，走完扫描 → 关联 → DHCP → MQTT 握手的完整状态机；再发布一条消息，看数据包如何穿过 AP、Broker 到达订阅者。',
    chips: ['STA / AP 模式', '连接状态机', '发布 / 订阅', '指数退避重连'],
    time: '25 min'
  },
  html: () => labFrame({
    theory: `
      <p>ESP32 内置 2.4 GHz WiFi 基带与射频，协议栈运行在 <b>PRO_CPU</b> 上。STA 模式下它是无线终端；AP 模式下它自己成为热点；也可双角色共存。联网从来不是"一次调用就成功"，而是一系列需要显式管理的状态。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">连接过程发生了什么</h3>
          <div class="flow"><span class="node">扫描信道</span><span class="arrow">→</span><span class="node">认证 / 关联</span><span class="arrow">→</span><span class="node">DHCP 获取 IP</span><span class="arrow">→</span><span class="node hl">TCP → MQTT CONNECT</span></div>
          <div class="formula">WiFi.begin(ssid, pass);<br>while (WiFi.status() != WL_CONNECTED) delay(500);<br>client.setServer(broker, 1883);<br>client.connect("esp32-lab");</div>
          <p class="small muted">生产代码必须有<b>超时与重试</b>：无限 <code class="inline">while</code> 会让设备在断网时永远卡死，也无法进入低功耗模式。</p>
        </div>
        <div>
          <h3 class="under">MQTT：发布 / 订阅模型</h3>
          <p>设备与手机不直接通信，而是把消息发给 <b>Broker</b>，由 Broker 按 <b>topic</b> 分发给所有订阅者。这解耦了设备数量与网络拓扑。</p>
          <div class="formula">topic:   lab/esp32/temp<br>payload: {"t":25.6,"h":58,"rssi":-52}<br>QoS 0 至多一次 / QoS 1 至少一次 / QoS 2 恰好一次</div>
          <p class="small muted"><b>遗嘱消息（LWT）</b>可让 Broker 在设备异常掉线时通知订阅者；<b>保留消息</b>让新订阅者立刻拿到最近一次状态；<b>KeepAlive</b> 用于检测半开连接。</p>
        </div>
      </div>
      <div class="callout warn"><div class="ci">!</div><p>开启 WiFi 后 <b>ADC2 不可用</b>（内部 ADC 控制器被 WiFi 驱动占用），模拟传感器请接 ADC1 引脚。同时 WiFi 发射瞬间峰值电流可达 <b>400 mA 以上</b>，USB 口供电不足时会出现莫名其妙的重启。</p></div>`,
    controls:
      segCtrl('wMode', { label: 'WiFi 工作模式', items: [['sta', 'STA 站点（连路由器）'], ['ap', 'AP 热点（自己组网）']] }, 'sta') +
      `<div class="field"><label>SSID</label><input type="text" data-ctrl="wSsid" value="ZJGSU-IoT-Lab"></div>` +
      `<div class="field"><label>MQTT Topic</label><input type="text" data-ctrl="wTopic" value="lab/esp32/env"></div>` +
      slider('wInterval', '自动上报间隔', 1, 20, 1, 5, ' s') +
      slider('wRssi', '信号强度 RSSI', -90, -30, 1, -52, ' dBm') +
      switchCtrl('wWeak', '模拟弱网随机掉线', false),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="wConnect">▶ 开始连接</button><button class="btn" id="wPublish">📤 发布一条</button><button class="btn" id="wDrop">⚡ 模拟断线</button></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">设备状态</div>
      <div class="readout" style="margin-top:0">
        <div class="ro"><span>WiFi 状态</span><b data-read="wState" style="font-size:13px">IDLE</b></div>
        <div class="ro"><span>本机 IP</span><b data-read="wIp" class="blue" style="font-size:13px">—</b></div>
        <div class="ro"><span>RSSI</span><b data-read="wRssiV" class="amber">-52 dBm</b></div>
      </div>
      <div id="wSteps" style="margin-top:14px"></div></div>
      <div class="callout note" style="margin-bottom:0"><div class="ci">i</div><p id="wHint">点击"开始连接"观察状态机逐阶段推进。连接成功后可手动发布或开启自动上报。</p></div>`,
    waveTitle: '网络拓扑与数据通路', waveSub: 'PUBLISH → Broker → SUBSCRIBE',
    wave: `<div class="circuit-stage" style="min-height:210px">${boardTopology()}</div>
      <div class="readout" style="margin-top:14px">
        <div class="ro"><span>已发布消息</span><b data-read="wMsgs">0</b></div>
        <div class="ro"><span>重连次数</span><b data-read="wRetry" class="amber">0</b></div>
        <div class="ro"><span>平均流量</span><b data-read="wRate" class="blue">—</b></div>
        <div class="ro"><span>连接时长</span><b data-read="wUptime">—</b></div>
      </div>`,
    code: codeBlock('codeWifi', 'mqtt.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termWifi'),
    questions: [
      '为什么生产代码不能写 <code class="inline">while (WiFi.status() != WL_CONNECTED) delay(500);</code>？请给出一个带超时、退避与降级的状态机设计。',
      'QoS 0 / 1 / 2 在报文交互次数与可靠性上如何取舍？电池供电的环境监测节点应选哪个？',
      '设备突然断电时，监控看板如何立刻知道？MQTT 的哪个机制可以解决这个问题？',
      '开启 WiFi 后为什么 ADC2 读数失效？若项目里既要联网又要测两路模拟量，硬件上怎么规划？'
    ]
  }),
  mount(root) {
    const s = { mode: 'sta', ssid: 'ZJGSU-IoT-Lab', topic: 'lab/esp32/env', interval: 5, rssi: -52, weak: false };
    const term = new Terminal($('#termWifi', root));
    const STEPS = ['扫描信道', '认证 / 关联', 'DHCP 获取 IP', 'WiFi 已连接', 'MQTT 已连接'];
    let phase = -1, phaseT = 0, msgs = 0, retries = 0, connAt = 0, pkt = -1, pktAt = 0, autoAt = 0, dropAt = 0, backoff = 1;
    const stepHtml = () => '<div class="flow" style="margin:0;gap:6px">' + STEPS.map((st, i) =>
      `<span class="node ${i === phase ? 'hl' : ''}" style="font-size:11px;padding:6px 9px;${i < phase ? 'opacity:.55' : ''}">${i < phase ? '✓ ' : ''}${st}</span>${i < STEPS.length - 1 ? '<span class="arrow" style="font-size:12px">→</span>' : ''}`
    ).join('') + '</div>';
    function code() {
      return `// 实验 6 · WiFi 状态机 + MQTT 发布（含指数退避）\n#include <WiFi.h>\n#include <PubSubClient.h>\n\nconst char* SSID   = "${s.ssid}";\nconst char* PASS   = "********";\nconst char* BROKER = "broker.emqx.io";\nconst char* TOPIC  = "${s.topic}";\n\nWiFiClient espClient;\nPubSubClient mqtt(espClient);\nunsigned long lastPub = 0;\nuint16_t backoff = 1000;\n\nvoid reconnect() {\n  while (!mqtt.connected()) {\n    if (mqtt.connect("esp32-lab", nullptr, nullptr,\n                     "${s.topic}/status", 0, true, "offline")) {\n      Serial.println("MQTT CONNACK · connected");\n      mqtt.publish("${s.topic}/status", "online", true);\n      backoff = 1000;\n    } else {\n      Serial.printf("retry in %u ms\\n", backoff);\n      delay(backoff);\n      backoff = min(backoff * 2, (uint16_t)30000);  // 指数退避\n    }\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  ${s.mode === 'sta' ? `WiFi.mode(WIFI_STA);\n  WiFi.begin(SSID, PASS);` : `WiFi.mode(WIFI_AP);\n  WiFi.softAP("${s.ssid}", "12345678");`}\n  mqtt.setServer(BROKER, 1883);\n  mqtt.setKeepAlive(60);\n}\n\nvoid loop() {\n  if (WiFi.status() != WL_CONNECTED) { delay(500); return; }\n  if (!mqtt.connected()) reconnect();\n  mqtt.loop();                       // 维持 KeepAlive、处理下行\n  if (millis() - lastPub > ${s.interval * 1000}UL) {\n    lastPub = millis();\n    char payload[96];\n    snprintf(payload, sizeof(payload),\n             "{\\"t\\":25.6,\\"h\\":58,\\"rssi\\":%d}", WiFi.RSSI());\n    mqtt.publish(TOPIC, payload);\n  }\n}`;
    }
    function refresh() {
      setCode('codeWifi', code());
      setRead(root, 'wRssiV', s.rssi + ' dBm');
      setRead(root, 'wMsgs', String(msgs));
      setRead(root, 'wRetry', String(retries));
      setRead(root, 'wRate', phase >= 4 ? (96 * 8 * 1000 / (s.interval * 1000) / 1024).toFixed(2) + ' kbps' : '—');
      $('#wSteps', root).innerHTML = stepHtml();
      const st = phase < 0 ? 'IDLE' : phase < 3 ? 'CONNECTING' : phase < 4 ? 'WL_CONNECTED' : 'MQTT OK';
      setRead(root, 'wState', st);
      setRead(root, 'wIp', phase >= 3 ? (s.mode === 'ap' ? '192.168.4.1' : '192.168.1.107') : '—');
      $('#topoStatus', root).textContent = phase >= 4 ? `${s.topic} · PUBLISH → SUBSCRIBE` : phase >= 0 ? '正在建立连接…' : '未连接';
    }
    function connect() {
      if (phase >= 0 && phase < 5) return;
      phase = 0; phaseT = Clock.t;
      term.log('WiFi.mode(' + (s.mode === 'sta' ? 'WIFI_STA' : 'WIFI_AP') + ')', 'info');
      term.log('扫描 2.4 GHz 信道…', 'info');
      refresh();
    }
    function drop(reason) {
      if (phase < 0) return;
      phase = -1; retries++; dropAt = Clock.t; backoff = 1;
      term.log((reason || '连接中断') + ' · WIFI_EVENT_STA_DISCONNECTED', 'err');
      $('#wHint', root).innerHTML = '检测到断线，采用 <b>指数退避（1s → 2s → 4s → 8s，上限 30s）</b> 重连，避免网络恢复瞬间所有设备同时冲击 Broker（惊群效应）。';
      refresh();
    }
    function publish() {
      if (phase < 4) { term.log('发布失败：MQTT 尚未连接', 'err'); return; }
      msgs++;
      const payload = '{"t":25.6,"h":58,"rssi":' + s.rssi + ',"seq":' + msgs + '}';
      term.log('PUBLISH ' + s.topic + ' → ' + payload, 'ok');
      term.log('Broker 转发给 2 个订阅者 · QoS 0', 'info');
      pkt = 0; pktAt = Clock.t;
      refresh();
    }
    const map = {
      wSsid: v => { s.ssid = v; refresh(); }, wTopic: v => { s.topic = v; refresh(); },
      wInterval: v => { s.interval = v; refresh(); }, wRssi: v => { s.rssi = v; refresh(); },
      wWeak: v => { s.weak = v; term.log('弱网模拟 ' + (v ? '已开启' : '关闭'), 'info'); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    onSeg(root, 'wMode', v => { s.mode = v; term.log('切换为 ' + v.toUpperCase() + ' 模式', 'info'); refresh(); });
    $('#wConnect', root).onclick = connect;
    $('#wPublish', root).onclick = publish;
    $('#wDrop', root).onclick = () => drop('手动模拟断线');
    bindTermClear(root);
    term.log('ESP32 上电 · WiFi 驱动初始化完成', 'info');
    term.log('提示：点击「开始连接」启动状态机', 'warn');
    refresh();

    Clock.add('wifi-main', (t) => {
      // 连接状态机
      if (phase >= 0 && phase < 4 && t - phaseT > 850) {
        phaseT = t; phase++;
        const logs = [
          '发现 AP ' + s.ssid + ' · ch 6 · RSSI ' + s.rssi + ' dBm',
          'WPA2 四次握手完成 · 关联成功',
          'DHCP OFFER → IP 192.168.1.107 / 网关 192.168.1.1',
          'TCP 连接 broker:1883 · MQTT CONNECT → CONNACK'
        ];
        term.log(logs[phase - 1], phase === 4 ? 'ok' : 'info');
        if (phase === 4) {
          connAt = t; autoAt = t - (s.interval - 1) * 1000;  // 上线后尽快发出第一条数据
          term.log('订阅完成 · 状态 online 已发布（retain）', 'ok');
          $('#wHint', root).innerHTML = '连接已建立。可手动发布，或等待自动上报；开启"弱网随机掉线"观察重连策略。';
        }
        refresh();
      }
      if (phase === 4) {
        setRead(root, 'wUptime', ((t - connAt) / 1000).toFixed(1) + ' s');
        if (t - autoAt > s.interval * 1000) { autoAt = t; publish(); }
        if (s.weak && Math.random() < .0016) drop('信号衰落导致掉线');
      }
      // 自动退避重连
      if (phase < 0 && dropAt > 0 && t - dropAt > backoff * 1000) {
        term.log('重连尝试（退避 ' + backoff + ' s）…', 'warn');
        backoff = Math.min(backoff * 2, 16);
        dropAt = t;
        connect();
      }
      // 数据包动画
      const pkts = [$('#pkt1', root), $('#pkt2', root), $('#pkt3', root)];
      const segs = [[108, 156], [248, 296], [388, 436]];
      if (pkt >= 0) {
        const d = (t - pktAt) / 900;
        const idx = clamp(Math.floor(d * 3), 0, 2);
        const local = clamp(d * 3 - idx, 0, 1);
        pkts.forEach((c, i) => {
          if (!c) return;
          const on = i === idx;
          c.setAttribute('opacity', on ? '1' : '0');
          if (on) c.setAttribute('cx', String(lerp(segs[i][0], segs[i][1], local)));
        });
        if (d >= 1) { pkt = -1; pkts.forEach(c => { if (c) c.setAttribute('opacity', '0'); }); }
      }
    });
  }
});

/* ================================================================
   实验 7 · 传感器数据采集与可视化
   ================================================================ */
registerLab('lab-sensor', {
  meta: {
    eyebrow: 'LAB 07 · 数据采集',
    title: '传感器采集、滤波与阈值告警',
    lead: '模拟一台长期运行的环境监测节点：温湿度缓慢变化、叠加测量噪声，对比四种滤波策略的效果，并在越限时触发告警。',
    chips: ['单总线 DHT22', '滑动平均 / 中值 / 低通', '实时曲线', 'JSON 上报'],
    time: '30 min'
  },
  html: () => labFrame({
    theory: `
      <p>DHT22 是典型的<b>单总线</b>数字传感器：主机拉低总线至少 1 ms 发起起始信号，随后从机连续输出 40 位数据（湿度整数/小数、温度整数/小数、校验和），每位以 50 µs 低电平开头，靠高电平持续时间区分 0（26–28 µs）与 1（70 µs）。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">为什么一定要滤波</h3>
          <p>传感器读数同时包含<b>真实缓变信号</b>、<b>高频随机噪声</b>与偶发的<b>脉冲尖峰</b>。直接用瞬时值判断阈值会在临界点反复抖动（告警震荡），所以要在"响应速度"和"平滑度"之间折中。</p>
          <div class="table-wrap"><table class="tbl">
            <tr><th>方法</th><th>特点</th><th>适用</th></tr>
            <tr><td>N 点滑动平均</td><td>简单，对高斯噪声效果好，但有 N 个周期的滞后</td><td>温度、光照</td></tr>
            <tr><td>中值滤波</td><td>对孤立尖峰免疫，保留边沿</td><td>开关量、异常毛刺</td></tr>
            <tr><td>一阶低通 IIR</td><td>y[n] = α·x[n] + (1−α)·y[n−1]，只需存一个变量</td><td>内存受限的 MCU</td></tr>
          </table></div>
        </div>
        <div>
          <h3 class="under">告警的滞回设计</h3>
          <p>如果只用单一阈值 <code class="inline">T &gt; 30 °C</code>，测量噪声会让告警在阈值附近疯狂开关。工程上引入<b>滞回（Schmitt Trigger）</b>或连续 N 次确认：</p>
          <div class="formula">告警开启：T &gt; T<sub>high</sub> (30 °C)<br>告警解除：T &lt; T<sub>low</sub> (28.5 °C)<br>或：连续 3 次超阈值才置位</div>
          <p class="small muted">同理，数据上报应使用 <code class="inline">millis()</code> 定时而非 <code class="inline">delay()</code>，否则采样、显示与网络任务会互相阻塞——这正是实验 8 要解决的问题。</p>
        </div>
      </div>
      <div class="callout note"><div class="ci">i</div><p>DHT22 两次采样间隔不得小于 2 s（传感器内部转换需要时间）；本实验的采样周期滑块允许更短，是为了观察曲线变化，实际接线时请遵守器件手册。</p></div>`,
    controls:
      slider('dPeriod', '采样周期', 0.5, 5, 0.5, 1, ' s', '1.0 s') +
      slider('dNoise', '测量噪声强度', 0, 3, 0.1, 0.8, ' °C', '0.8 °C') +
      slider('dDrift', '环境变化幅度', 0, 8, 0.5, 4, ' °C', '4.0 °C') +
      selectCtrl('dFilter', '滤波算法', [['none', '不滤波（原始值）'], ['avg', '5 点滑动平均'], ['median', '5 点中值'], ['lpf', '一阶低通 α=0.25']], 'avg') +
      slider('dTh', '温度告警阈值', 20, 38, 0.5, 30, ' °C', '30.0 °C') +
      switchCtrl('dHyst', '启用滞回（解除阈值 −1.5 °C）', true),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="dRun">⏸ 暂停仿真</button><button class="btn" id="dSpike">注入一个尖峰</button></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">节点状态</div>
      <div class="readout" style="margin-top:0">
        <div class="ro"><span>温度（滤波后）</span><b data-read="dT">—</b></div>
        <div class="ro"><span>湿度（滤波后）</span><b data-read="dH" class="blue">—</b></div>
        <div class="ro"><span>采样点数</span><b data-read="dN" class="amber">0</b></div>
      </div>
      <div id="dAlarm" style="margin-top:14px;padding:12px;border-radius:9px;background:var(--green-soft);color:var(--green);font-weight:650;font-size:13px">● 状态正常 · 所有指标在阈值内</div>
      <div class="readout" style="margin-top:12px">
        <div class="ro"><span>原始值标准差</span><b data-read="dStd0" style="font-size:14px">—</b></div>
        <div class="ro"><span>滤波后标准差</span><b data-read="dStd1" class="blue" style="font-size:14px">—</b></div>
        <div class="ro"><span>告警次数</span><b data-read="dAl" class="amber" style="font-size:14px">0</b></div>
      </div></div>`,
    waveTitle: '实时数据曲线', waveSub: '虚线 = 原始采样 · 实线 = 滤波后 · 红线 = 告警阈值',
    wave: `<div class="sim-panel"><div class="sim-title">温度 °C</div><canvas class="chart" id="dTemp" style="height:175px"></canvas></div>
      <div class="sim-panel" style="margin-top:12px"><div class="sim-title">相对湿度 %RH</div><canvas class="chart" id="dHum" style="height:160px"></canvas></div>`,
    readout: readout([['平均温度', 'dAvg', '', '—'], ['最高 / 最低', 'dMax', 'blue', '—'], ['上报周期', 'dRate', 'amber', '1.0 s'], ['滤波算法', 'dF', '', '5 点平均']]),
    code: codeBlock('codeSensor', 'sensor.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termSensor'),
    questions: [
      '把噪声调到 3 °C，对比"不滤波"与"5 点滑动平均"的标准差，大约能降低多少？为什么理论上约降为 1/√N？',
      '注入一个孤立尖峰，哪种滤波算法几乎不受影响？为什么？',
      '关闭滞回并把阈值调到当前温度附近，观察告警状态如何抖动；用连续 N 次确认替代滞回该如何实现？',
      '采样周期设为 0.5 s 时 DHT22 实际能否正常读取？如果项目需要 10 Hz 采样，应改用什么传感器？'
    ]
  }),
  mount(root) {
    const s = { period: 1, noise: .8, drift: 4, filter: 'avg', th: 30, hyst: true };
    const term = new Terminal($('#termSensor', root));
    const rawT = [], rawH = [], filT = [], filH = [];
    let n = 0, alarm = false, alarms = 0, lastSample = 0, spikeUntil = 0, lpfT = 24, lpfH = 55, injected = false;
    const WINDOW = 60000;
    const median = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
    const std = a => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    function filt(arrT, arrH) {
      const f = s.filter;
      if (f === 'none') return [arrT[arrT.length - 1], arrH[arrH.length - 1]];
      const wT = arrT.slice(-5), wH = arrH.slice(-5);
      if (f === 'median') return [median(wT), median(wH)];
      if (f === 'avg') return [wT.reduce((a, b) => a + b, 0) / wT.length, wH.reduce((a, b) => a + b, 0) / wH.length];
      return [lpfT, lpfH];
    }
    function truth(t) {
      const p = t / 1000;
      return {
        t: 24 + s.drift * Math.sin(2 * Math.PI * p / 95) + 1.2 * Math.sin(2 * Math.PI * p / 37),
        h: 55 + 13 * Math.sin(2 * Math.PI * p / 130 + 1.1)
      };
    }
    function sample(t) {
      const tr = truth(t);
      const spike = t < spikeUntil ? 12 : 0;
      const tRaw = tr.t + gauss() * s.noise + spike;
      const hRaw = clamp(tr.h + gauss() * s.noise * 1.6, 10, 95);
      rawT.push({ x: t, y: tRaw }); rawH.push({ x: t, y: hRaw });
      lpfT = .25 * tRaw + .75 * lpfT; lpfH = .25 * hRaw + .75 * lpfH;
      const [ft, fh] = filt(rawT.map(p => p.y), rawH.map(p => p.y));
      filT.push({ x: t, y: ft }); filH.push({ x: t, y: fh });
      [rawT, rawH, filT, filH].forEach(a => { while (a.length && a[0].x < t - WINDOW) a.shift(); });
      n++;
      const high = s.th, low = s.hyst ? s.th - 1.5 : s.th;
      const shouldAlarm = alarm ? ft > low : ft > high;
      if (shouldAlarm !== alarm) {
        alarm = shouldAlarm;
        if (alarm) { alarms++; term.log('⚠ 告警：温度 ' + ft.toFixed(1) + ' °C 超过 ' + high + ' °C · 推送事件', 'err'); }
        else term.log('告警解除：温度回落至 ' + ft.toFixed(1) + ' °C', 'ok');
      }
      if (n % 4 === 0 || injected) {
        term.log('PUBLISH {"t":' + ft.toFixed(1) + ',"h":' + fh.toFixed(0) + ',"alarm":' + (alarm ? 'true' : 'false') + '}', 'info');
        injected = false;
      }
      return [ft, fh];
    }
    function code() {
      const filterCode = {
        none: '  return x;',
        avg: '  buf[idx] = x;\n  idx = (idx + 1) % N;\n  float sum = 0;\n  for (int i = 0; i < N; i++) sum += buf[i];\n  return sum / N;',
        median: '  buf[idx] = x; idx = (idx + 1) % N;\n  float tmp[N]; memcpy(tmp, buf, sizeof(tmp));\n  // 冒泡排序后取中值\n  for (int i = 0; i < N - 1; i++)\n    for (int j = 0; j < N - 1 - i; j++)\n      if (tmp[j] > tmp[j+1]) swap(tmp[j], tmp[j+1]);\n  return tmp[N / 2];',
        lpf: '  static float y = 0;\n  y = 0.25f * x + 0.75f * y;   // α = 0.25\n  return y;'
      }[s.filter];
      return `// 实验 7 · DHT22 采集 + ${({ none: '原始值', avg: '滑动平均', median: '中值', lpf: '一阶低通' })[s.filter]}滤波 + 滞回告警\n#include <DHT.h>\n\n#define DHTPIN 4\n#define DHTTYPE DHT22\nDHT dht(DHTPIN, DHTTYPE);\n\nconst unsigned long PERIOD = ${s.period * 1000}UL;\nconst float T_HIGH = ${s.th.toFixed(1)};\nconst float T_LOW  = ${(s.hyst ? s.th - 1.5 : s.th).toFixed(1)};\nconst int N = 5;\nfloat buf[N] = {0};\nint idx = 0;\nunsigned long last = 0;\nbool alarm = false;\n\nfloat filter(float x) {\n${filterCode}\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  dht.begin();\n}\n\nvoid loop() {\n  if (millis() - last < PERIOD) return;   // 非阻塞定时\n  last = millis();\n  float t = filter(dht.readTemperature());\n  float h = dht.readHumidity();\n  if (isnan(t) || isnan(h)) { Serial.println("DHT read failed"); return; }\n\n  // 滞回：开启用 T_HIGH，解除用 T_LOW，避免临界抖动\n  if (!alarm && t > T_HIGH) { alarm = true;  Serial.println("ALARM ON"); }\n  if ( alarm && t < T_LOW)  { alarm = false; Serial.println("ALARM OFF"); }\n\n  char payload[96];\n  snprintf(payload, sizeof(payload),\n           "{\\"t\\":%.1f,\\"h\\":%.0f,\\"alarm\\":%s}", t, h, alarm ? "true" : "false");\n  Serial.println(payload);   // 实际项目里交给 MQTT 任务发布\n}`;
    }
    function refresh() {
      setCode('codeSensor', code());
      setRead(root, 'dRate', s.period.toFixed(1) + ' s');
      setRead(root, 'dF', ({ none: '原始值', avg: '5 点平均', median: '5 点中值', lpf: '低通 α=.25' })[s.filter]);
    }
    const map = {
      dPeriod: v => { s.period = v; refresh(); }, dNoise: v => { s.noise = v; refresh(); },
      dDrift: v => { s.drift = v; refresh(); }, dFilter: v => { s.filter = v; term.log('滤波算法 → ' + v, 'info'); refresh(); },
      dTh: v => { s.th = v; refresh(); }, dHyst: v => { s.hyst = v; refresh(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const run = toggleRun(root, 'dRun', 'dLive');
    $('#dSpike', root).onclick = () => { spikeUntil = Clock.t + s.period * 1000 + 1; injected = true; term.log('注入 +12 °C 孤立尖峰', 'warn'); };
    bindTermClear(root);
    term.log('DHT22 就绪 · GPIO4 · 采样周期 ' + s.period + ' s', 'ok');
    term.log('提示：注入尖峰后对比中值滤波与滑动平均', 'info');
    refresh();
    lpfT = truth(0).t; lpfH = truth(0).h;

    function draw(t) {
      const xMax = Math.max(WINDOW / 3, t + 200), xMin = Math.max(0, xMax - WINDOW);
      lineChart($('#dTemp', root), {
        xMin, xMax, yMin: 15, yMax: 42, rows: 4, cols: 6,
        xFmt: v => (v / 1000).toFixed(0) + 's', yFmt: v => v.toFixed(0) + '°',
        threshold: s.th, thresholdLabel: '告警 ' + s.th.toFixed(1) + '°',
        series: [
          { data: rawT, color: '#8697a9', dash: [4, 3], width: 1.2 },
          { data: filT, color: '#0d7c72', width: 2.4, fill: true }
        ]
      });
      lineChart($('#dHum', root), {
        xMin, xMax, yMin: 20, yMax: 90, rows: 3, cols: 6,
        xFmt: v => (v / 1000).toFixed(0) + 's', yFmt: v => v.toFixed(0) + '%',
        series: [
          { data: rawH, color: '#8697a9', dash: [4, 3], width: 1.2 },
          { data: filH, color: '#2563eb', width: 2.4, fill: true }
        ]
      });
    }
    draw(0);
    let acc = 0, redraw = 0;
    Clock.add('sensor-main', (t, dt) => {
      if (!run.isRunning()) return;
      if (t - lastSample >= s.period * 1000) { lastSample = t; sample(t); }
      const ft = filT.length ? filT[filT.length - 1].y : 24, fh = filH.length ? filH[filH.length - 1].y : 55;
      setRead(root, 'dT', ft.toFixed(1) + ' °C');
      setRead(root, 'dH', fh.toFixed(0) + ' %');
      setRead(root, 'dN', String(n));
      setRead(root, 'dAl', String(alarms));
      const recentRaw = rawT.slice(-30).map(p => p.y), recentFil = filT.slice(-30).map(p => p.y);
      setRead(root, 'dStd0', std(recentRaw).toFixed(2));
      setRead(root, 'dStd1', std(recentFil).toFixed(2));
      const vals = filT.map(p => p.y);
      if (vals.length) {
        setRead(root, 'dAvg', (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + ' °C');
        setRead(root, 'dMax', Math.max(...vals).toFixed(1) + ' / ' + Math.min(...vals).toFixed(1));
      }
      const box = $('#dAlarm', root);
      if (box) {
        box.style.background = alarm ? 'var(--red-soft)' : 'var(--green-soft)';
        box.style.color = alarm ? 'var(--red)' : 'var(--green)';
        box.textContent = alarm ? '⚠ 温度越限 · 告警已置位 · 等待回落至 ' + (s.hyst ? (s.th - 1.5).toFixed(1) : s.th.toFixed(1)) + ' °C 解除'
          : '● 状态正常 · 所有指标在阈值内';
      }
      redraw += dt;
      if (redraw > 90) { redraw = 0; draw(t); }
      void acc;
    });
  }
});

/* ================================================================
   实验 8 · FreeRTOS 任务调度
   ================================================================ */
registerLab('lab-rtos', {
  meta: {
    eyebrow: 'LAB 08 · 实时操作系统',
    title: 'FreeRTOS 多任务调度与抢占',
    lead: '把 CPU 时间切成一格一格：甘特图实时展示三个任务是何时运行、何时阻塞、被谁抢占的。关掉抢占，看看低优先级任务如何被饿死。',
    chips: ['优先级抢占', 'vTaskDelay 阻塞', '上下文切换', '看门狗与双核'],
    time: '30 min'
  },
  html: () => labFrame({
    theory: `
      <p>Arduino-ESP32 本身就是一个 FreeRTOS 应用：<code class="inline">loop()</code> 运行在 APP_CPU 上一个优先级为 1 的任务里，WiFi/BT 协议栈在 PRO_CPU 上。当程序要同时做采集、联网、显示，就必须理解调度器如何分配 CPU。</p>
      <div class="grid-2">
        <div>
          <h3 class="under">任务的四种状态</h3>
          <div class="flow"><span class="node">运行 Running</span><span class="arrow">⇄</span><span class="node">就绪 Ready</span><span class="arrow">→</span><span class="node">阻塞 Blocked</span></div>
          <ul class="clean">
            <li><b>vTaskDelay()</b>：让任务进入阻塞态，CPU 立刻交给别人；<code class="inline">delay()</code> 在 Arduino 里最终也是它。</li>
            <li><b>忙等 while(1)</b>：任务始终就绪，会饿死所有低优先级任务并触发<b>任务看门狗（TWDT）</b>复位。</li>
            <li><b>抢占</b>：更高优先级任务一就绪，立即打断当前任务；同优先级按时间片轮转。</li>
            <li><b>队列 / 信号量</b>：任务间传递数据的正确方式，避免全局变量的竞态。</li>
          </ul>
        </div>
        <div>
          <h3 class="under">ESP32 特有议题</h3>
          <div class="table-wrap"><table class="tbl">
            <tr><th>议题</th><th>要点</th></tr>
            <tr><td>双核亲和性</td><td><code class="inline">xTaskCreatePinnedToCore(..., 0/1)</code>；PRO_CPU(0) 跑协议栈，用户任务固定到 APP_CPU(1) 更稳定</td></tr>
            <tr><td>优先级反转</td><td>低优先级任务持锁时阻塞高优先级任务；用<b>互斥量</b>（带优先级继承）而非二值信号量</td></tr>
            <tr><td>栈空间</td><td>以<b>字</b>为单位分配，<code class="inline">uxTaskGetStackHighWaterMark()</code> 检查余量，溢出会神秘重启</td></tr>
            <tr><td>看门狗</td><td>IDLE 任务负责喂狗；高优先级任务不让出 CPU → IDLE 饿死 → 复位</td></tr>
          </table></div>
          <div class="callout note" style="margin-top:12px"><div class="ci">i</div><p>下面甘特图中，<b>实心块 = 运行</b>，<b>浅色块 = 就绪等待</b>，<b>灰色块 = 阻塞（vTaskDelay）</b>。红色竖线是当前时刻。</p></div>
        </div>
      </div>`,
    controls:
      slider('rRun0', 'SensorTask 执行时长', 2, 60, 2, 14, ' ms') +
      slider('rRun1', 'NetTask 执行时长', 2, 80, 2, 28, ' ms') +
      slider('rRun2', 'UITask 执行时长', 2, 60, 2, 20, ' ms') +
      selectCtrl('rPrio1', 'NetTask 优先级', [[1, '1（低）'], [2, '2（中）'], [3, '3（高）'], [4, '4（最高）']], 3, true) +
      switchCtrl('rPreempt', '允许优先级抢占', true) +
      selectCtrl('rSpeed', '仿真速度', [[0.5, '0.5×'], [1, '1×'], [2, '2×']], 1, true),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="rRun">⏸ 暂停调度</button><button class="btn" id="rReset">重置调度器</button></div>
      <div class="callout warn" style="margin-top:14px"><div class="ci">!</div><p>关闭"允许优先级抢占"后观察：NetTask 就绪却要等当前任务主动让出 CPU，高优先级失去意义——这正是实时系统必须可抢占的原因。</p></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">任务状态快照</div><div id="rTaskList"></div>
      <div class="legend-dots" style="margin-top:12px">
        <span><i style="background:var(--primary)"></i>运行 Running</span>
        <span><i style="background:var(--amber)"></i>就绪 Ready</span>
        <span><i style="background:var(--border-strong)"></i>阻塞 Blocked</span>
      </div></div>
      <div class="sim-panel" style="margin-top:14px"><div class="sim-title">调度统计</div>
        <div class="readout" style="margin-top:0">
          <div class="ro"><span>CPU 利用率</span><b data-read="rCpu">—</b></div>
          <div class="ro"><span>上下文切换</span><b data-read="rSw" class="blue">0</b></div>
          <div class="ro"><span>IDLE 占比</span><b data-read="rIdle" class="amber">—</b></div>
        </div></div>`,
    waveTitle: '任务执行甘特图', waveSub: '滚动窗口 2 s · 红色竖线为当前时刻',
    wave: '<canvas class="wave" id="rGantt" style="height:220px"></canvas>',
    code: codeBlock('codeRtos', 'rtos.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termRtos'),
    questions: [
      '把 NetTask 优先级从 1 调到 4，SensorTask 的响应延迟如何变化？如果 NetTask 执行时长超过它的周期，会发生什么？',
      '关闭抢占后甘特图有什么变化？为什么"协作式调度"无法保证实时性？',
      '任务里写 <code class="inline">while(1) { /* 忙等 */ }</code> 为什么会导致看门狗复位？如何正确让出 CPU？',
      '如果 SensorTask 与 NetTask 共享一个全局 JSON 缓冲区，可能出现什么问题？用队列或互斥量分别怎么解决？'
    ]
  }),
  mount(root) {
    const s = { run: [14, 28, 20], prio1: 3, preempt: true, speed: 1 };
    const term = new Terminal($('#termRtos', root));
    const COLORS = ['#0d7c72', '#2563eb', '#d97706', '#8697a9'];
    const NAMES = ['SensorTask', 'NetTask', 'UITask', 'IDLE'];
    const PERIOD = [120, 300, 200, 0];
    const WINDOW = 2000;
    let tasks = [], simT = 0, running = -1, segs = [], lastState = [], switches = 0, lastLog = 0, acc = 0;
    function init() {
      tasks = [0, 1, 2, 3].map(i => ({
        i, name: NAMES[i], prio: i === 1 ? s.prio1 : (i === 0 ? 2 : i === 2 ? 1 : 0),
        period: PERIOD[i], run: s.run[i] !== undefined ? s.run[i] : 0,
        state: 'ready', remaining: s.run[i] || 9999, wakeAt: 0
      }));
      simT = 0; running = -1; segs = []; lastState = [null, null, null, null]; switches = 0; acc = 0;
    }
    function closeSeg(i, t1) {
      for (let k = segs.length - 1; k >= 0; k--) {
        if (segs[k].i === i && segs[k].t1 === null) { segs[k].t1 = t1; return; }
      }
    }
    function openSeg(i, t0, state) { segs.push({ i, t0, t1: null, state }); }
    function record() {
      tasks.forEach((t, i) => {
        const st = i === running ? 'run' : (t.state === 'ready' ? 'ready' : 'blocked');
        if (st !== lastState[i]) {
          if (lastState[i] !== null) closeSeg(i, simT);
          openSeg(i, simT, st); lastState[i] = st;
        }
      });
    }
    function step() {
      simT += 1;
      tasks.forEach(t => { if (t.state === 'blocked' && simT >= t.wakeAt) t.state = 'ready'; });
      let cand = -1;
      tasks.forEach((t, i) => {
        if (t.state === 'ready' || t.state === 'running') {
          if (cand < 0 || t.prio > tasks[cand].prio) cand = i;
        }
      });
      const canSwitch = s.preempt || running < 0 || tasks[running].state !== 'running';
      if (canSwitch && cand >= 0 && cand !== running) {
        if (running >= 0) {
          tasks[running].state = tasks[running].state === 'blocked' ? 'blocked' : 'ready';
          switches++;
          if (simT - lastLog > 240 && running !== 3 && cand !== 3) {
            term.log('切换 ' + tasks[running].name + ' → ' + tasks[cand].name + ' (prio ' + tasks[cand].prio + ')', 'info');
            lastLog = simT;
          }
        }
        running = cand; tasks[running].state = 'running';
        if (tasks[running].remaining <= 0 || tasks[running].period === 0) tasks[running].remaining = tasks[running].period === 0 ? 9999 : tasks[running].run;
      }
      if (running >= 0) {
        const t = tasks[running];
        if (t.period === 0) {
          // IDLE：无抢占模式下周期性主动 yield，模拟 vTaskDelay(1)
          t.remaining--;
          if (!s.preempt && t.remaining <= 0) { t.remaining = 20; t.state = 'ready'; running = -1; }
        } else {
          t.remaining--;
          if (t.remaining <= 0) { t.state = 'blocked'; t.wakeAt = simT + t.period; running = -1; }
        }
      }
      record();
    }
    function code() {
      return `// 实验 8 · FreeRTOS 多任务 + 队列（固定到 APP_CPU）\n// 注：readTemperature() / mqttPublish() / oledRefresh() 为业务函数占位\n#include <Arduino.h>\n\nstruct Sample { float t, h; uint32_t ts; };\nQueueHandle_t q;\nTaskHandle_t hSensor, hNet, hUI;\n\nvoid sensorTask(void* pv) {\n  TickType_t last = xTaskGetTickCount();\n  for (;;) {\n    Sample s = { readTemperature(), readHumidity(), millis() };\n    xQueueSend(q, &s, 0);                 // 非阻塞投递\n    vTaskDelayUntil(&last, pdMS_TO_TICKS(${PERIOD[0]}));\n  }\n}\n\nvoid netTask(void* pv) {\n  Sample s;\n  for (;;) {\n    if (xQueueReceive(q, &s, portMAX_DELAY)) {\n      mqttPublish(s);                    // 阻塞等待，天然让出 CPU\n    }\n  }\n}\n\nvoid uiTask(void* pv) {\n  for (;;) {\n    oledRefresh();\n    vTaskDelay(pdMS_TO_TICKS(${PERIOD[2]}));\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  q = xQueueCreate(8, sizeof(Sample));\n  xTaskCreatePinnedToCore(sensorTask, "Sensor", 4096, nullptr, 2, &hSensor, 1);\n  xTaskCreatePinnedToCore(netTask,    "Net",    8192, nullptr, ${s.prio1}, &hNet,    1);\n  xTaskCreatePinnedToCore(uiTask,     "UI",     4096, nullptr, 1, &hUI,     1);\n  // 空闲任务负责喂看门狗，切勿让高优先级任务忙等\n  esp_task_wdt_init(30, true);          // 30 s 无喂狗则复位\n}\n\nvoid loop() { vTaskDelay(portMAX_DELAY); }  // 让出 Arduino 默认任务`;
    }
    function refresh() {
      setCode('codeRtos', code());
      tasks.forEach((t, i) => { t.prio = i === 1 ? s.prio1 : (i === 0 ? 2 : i === 2 ? 1 : 0); t.run = s.run[i] || 0; });
      setRead(root, 'rSw', String(switches));
    }
    const map = {
      rRun0: v => { s.run[0] = v; refresh(); }, rRun1: v => { s.run[1] = v; refresh(); },
      rRun2: v => { s.run[2] = v; refresh(); },
      rPrio1: v => { s.prio1 = v; term.log('NetTask 优先级 → ' + v, 'info'); refresh(); },
      rPreempt: v => { s.preempt = v; term.log('优先级抢占 ' + (v ? '开启' : '关闭（协作式调度）'), v ? 'ok' : 'warn'); },
      rSpeed: v => { s.speed = v; }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const runBtn = toggleRun(root, 'rRun', 'rLive');
    $('#rReset', root).onclick = () => { init(); term.log('调度器已重置', 'info'); };
    bindTermClear(root);
    init();
    term.log('FreeRTOS 启动 · 4 个任务 · APP_CPU(1)', 'ok');
    term.log('提示：调高 NetTask 优先级观察抢占', 'info');
    refresh();

    function draw() {
      const start = Math.max(0, simT - WINDOW);
      const ganttTasks = NAMES.map((name, i) => ({
        name: name + ' (P' + tasks[i].prio + ')', color: COLORS[i],
        segments: segs.filter(sg => sg.i === i && (sg.t1 === null || sg.t1 >= start))
          .map(sg => ({ t0: Math.max(start, sg.t0) - start, t1: (sg.t1 === null ? simT : sg.t1) - start, state: sg.state }))
      }));
      gantt($('#rGantt', root), { tasks: ganttTasks, total: WINDOW, now: WINDOW });
      // 统计最近窗口
      let busy = 0, idle = 0;
      segs.filter(sg => sg.state === 'run' && (sg.t1 === null || sg.t1 >= start)).forEach(sg => {
        const a = Math.max(start, sg.t0), b = sg.t1 === null ? simT : sg.t1;
        if (sg.i === 3) idle += b - a; else busy += b - a;
      });
      const total = Math.max(1, simT - start);
      setRead(root, 'rCpu', (busy / total * 100).toFixed(0) + '%');
      setRead(root, 'rIdle', (idle / total * 100).toFixed(0) + '%');
      $('#rTaskList', root).innerHTML = tasks.map((t, i) => {
        const st = i === running ? '运行' : t.state === 'ready' ? '就绪' : '阻塞';
        const col = i === running ? 'var(--green)' : t.state === 'ready' ? 'var(--amber)' : 'var(--text-3)';
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">
          <i style="width:9px;height:9px;border-radius:50%;background:${COLORS[i]};flex:0 0 auto"></i>
          <span style="flex:1">${t.name}</span><span class="muted">P${t.prio}</span>
          <span class="tag ${i === running ? 'g' : t.state === 'ready' ? 'a' : ''}" style="color:${col};background:transparent">${st}</span></div>`;
      }).join('');
      void idle;
    }
    draw();
    Clock.add('rtos-main', (t, dt) => {
      if (!runBtn.isRunning()) return;
      acc += dt * s.speed;
      let steps = 0;
      while (acc >= 1 && steps < 200) { acc -= 1; step(); steps++; }
      // 丢弃过期段
      const cut = simT - WINDOW - 50;
      if (segs.length > 300) segs = segs.filter(sg => sg.t1 === null || sg.t1 >= cut);
      if (Math.floor(t / 70) !== Math.floor((t - dt) / 70)) { draw(); setRead(root, 'rSw', String(switches)); }
    });
  }
});

/* ================================================================
   实验 9 · 低功耗与续航
   ================================================================ */
registerLab('lab-power', {
  meta: {
    eyebrow: 'LAB 09 · 电源管理',
    title: '睡眠模式、唤醒源与电池续航',
    lead: '同一个监测节点，改一个睡眠模式就能从"两天没电"变成"撑一年"。调节工作占空比与电池容量，看平均电流如何决定续航。',
    chips: ['Active / Modem / Light / Deep', 'RTC 唤醒', '平均电流计算', 'ULP 协处理器'],
    time: '25 min'
  },
  html: () => labFrame({
    theory: `
      <p>电池供电的 IoT 节点，99% 的时间都在"等下一次采集"。ESP32 提供分级睡眠，越深的睡眠关掉的电源域越多、唤醒越慢、能保留的状态越少。</p>
      <div class="table-wrap"><table class="tbl">
        <tr><th>模式</th><th>典型电流</th><th>保持内容</th><th>唤醒代价</th><th>适用</th></tr>
        <tr><td>Active（WiFi TX）</td><td>80 – 260 mA</td><td>全部</td><td>—</td><td>数据上报瞬间</td></tr>
        <tr><td>Modem Sleep</td><td>约 20 mA</td><td>CPU / RAM / WiFi 寄存器</td><td>≈ 3 ms</td><td>需维持 WiFi 连接</td></tr>
        <tr><td>Light Sleep</td><td>约 0.8 mA</td><td>RAM / CPU 上下文</td><td>≈ 1 ms，从断点继续</td><td>周期性短唤醒</td></tr>
        <tr><td>Deep Sleep</td><td>约 10 µA（裸模组）</td><td>仅 RTC 域 + RTC 内存</td><td>≈ 100 ms，<b>相当于复位</b></td><td>分钟级以上采集间隔</td></tr>
      </table></div>
      <div class="grid-2" style="margin-top:16px">
        <div>
          <h3 class="under">平均电流决定一切</h3>
          <div class="formula">I<sub>avg</sub> = (I<sub>work</sub> × t<sub>work</sub> + I<sub>sleep</sub> × t<sub>sleep</sub>) / T<br>续航(h) ≈ 电池容量(mAh) × η / I<sub>avg</sub></div>
          <p class="small muted">η 取 0.8–0.9 以计入 LDO 效率、电池自放电与低温容量衰减。开发板上的 USB 转串口芯片与电源指示灯往往额外消耗 <b>5–10 mA</b>，实测续航会明显短于裸模组估算——这是学生项目最常见的"理论与实测对不上"。</p>
        </div>
        <div>
          <h3 class="under">唤醒源与状态保存</h3>
          <p>Deep Sleep 下可用：RTC 定时器、外部引脚（ext0/ext1）、触摸感应、ULP 协处理器。醒来后 <code class="inline">setup()</code> 会重新执行，需要跨睡眠保存的变量必须放在 <code class="inline">RTC_DATA_ATTR</code> 修饰的 RTC 慢速内存中。</p>
          <div class="formula">RTC_DATA_ATTR int bootCount = 0;<br>esp_sleep_enable_timer_wakeup(10 * 1000000ULL);<br>esp_deep_sleep_start();</div>
          <p class="small muted"><code class="inline">esp_sleep_get_wakeup_cause()</code> 可判断是被定时器还是按键唤醒，从而走不同的处理分支。</p>
        </div>
      </div>
      <div class="callout warn"><div class="ci">!</div><p>Deep Sleep 期间 <b>WiFi 连接会断开</b>。若上报间隔只有几秒，反复重连的能耗可能反而超过 Light/Modem Sleep。选型要结合连接建立时间一起算，不能只看睡眠电流。</p></div>`,
    controls:
      selectCtrl('pwMode', '电源模式', [['active', 'Active（持续工作）'], ['modem', 'Modem Sleep'], ['light', 'Light Sleep'], ['deep', 'Deep Sleep']], 'deep') +
      slider('pwWake', '唤醒周期', 1, 60, 1, 10, ' min') +
      slider('pwWork', '每次唤醒工作时长', 1, 60, 1, 5, ' s') +
      slider('pwCap', '电池容量', 500, 10000, 100, 2000, ' mAh') +
      switchCtrl('pwTimer', 'RTC 定时器唤醒', true) +
      switchCtrl('pwExt', '外部引脚唤醒 (ext0)', false) +
      switchCtrl('pwTouch', '电容触摸唤醒', false),
    controlNote: `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="pwRun">⏸ 暂停仿真</button></div>
      <div class="callout tip" style="margin-top:14px"><div class="ci">✓</div><p>把模式从 Active 逐档切到 Deep Sleep，观察"平均电流"与"续航"数量级的变化；再把工作时长拉到 60 s，看 WiFi 重连开销如何吞噬收益。</p></div>`,
    stage: `<div class="sim-panel"><div class="sim-title">四种模式睡眠电流对比（对数刻度示意）</div><div id="pwBars"></div></div>
      <div class="sim-panel" style="margin-top:14px"><div class="sim-title">续航估算</div>
        <div style="text-align:center;padding:8px 0"><b data-read="pwDays" style="font-family:var(--mono);font-size:34px;color:var(--primary)">—</b><div class="small muted">预计续航（天）</div></div>
        <div class="readout" style="margin-top:6px">
          <div class="ro"><span>平均电流</span><b data-read="pwIavg" class="blue">—</b></div>
          <div class="ro"><span>单次唤醒耗电</span><b data-read="pwQ" class="amber">—</b></div>
          <div class="ro"><span>睡眠占空比</span><b data-read="pwDuty">—</b></div>
        </div></div>`,
    waveTitle: '一个唤醒周期内的电流波形', waveSub: '高 = 工作（WiFi 上报）· 低 = 睡眠',
    wave: '<canvas class="wave" id="pwWave"></canvas>' + legend([['工作电流 ≈ 180 mA', '#d64545'], ['睡眠电流（随模式变化）', '#0d7c72']]),
    code: codeBlock('codePower', 'deep_sleep.ino', 'ARDUINO C++', ''),
    terminal: terminalBox('termPower'),
    questions: [
      '把唤醒周期从 1 min 拉到 60 min，续航如何变化？为什么不是严格的 60 倍关系？',
      'Deep Sleep 醒来后 <code class="inline">setup()</code> 会重新执行，若需要累计"第 N 次唤醒"，变量应放在哪里？',
      '若上报间隔只有 2 s，选 Deep Sleep 反而更费电，原因是什么？此时更合适的是哪种模式？',
      '用普通 DevKit 开发板实测的续航往往只有估算值的 1/5，列举至少三个额外耗电来源。'
    ]
  }),
  mount(root) {
    const s = { mode: 'deep', wake: 10, work: 5, cap: 2000, timer: true, ext: false, touch: false };
    const term = new Terminal($('#termPower', root));
    const I_SLEEP = { active: 180, modem: 20, light: .8, deep: .01 };
    const NAMES = { active: 'Active', modem: 'Modem Sleep', light: 'Light Sleep', deep: 'Deep Sleep' };
    const I_WORK = 180;
    const calc = () => {
      const T = s.wake * 60, work = Math.min(s.work, T), sleep = T - work;
      const is = I_SLEEP[s.mode];
      const iavg = (I_WORK * work + is * sleep) / T;
      const hours = s.cap * .85 / iavg;
      return { T, work, sleep, is, iavg, hours, days: hours / 24, q: (I_WORK * work + is * sleep) / 3600 };
    };
    function code() {
      const src = [];
      if (s.timer) src.push(`  esp_sleep_enable_timer_wakeup(${s.wake * 60}ULL * 1000000ULL);  // ${s.wake} min`);
      if (s.ext) src.push(`  esp_sleep_enable_ext0_wakeup(GPIO_NUM_4, 0);                 // 按键拉低唤醒`);
      if (s.touch) src.push(`  touchAttachInterrupt(T3, wakeCallback, 40);\n  esp_sleep_enable_touchpad_wakeup();`);
      if (!src.length) src.push('  // 未配置任何唤醒源：将一直睡眠直到外部复位！');
      return `// 实验 9 · ${NAMES[s.mode]} · 每 ${s.wake} min 唤醒\n// 注：SSID / PASS、readSensor()、mqttPublish() 需按实际项目补全\n#include <esp_sleep.h>\n\nRTC_DATA_ATTR int bootCount = 0;   // 存放在 RTC 内存，跨 Deep Sleep 保留\nconst int LED_PIN = 2;\n\nvoid printWakeupReason() {\n  esp_sleep_wakeup_cause_t c = esp_sleep_get_wakeup_cause();\n  switch (c) {\n    case ESP_SLEEP_WAKEUP_TIMER: Serial.println("唤醒：RTC 定时器"); break;\n    case ESP_SLEEP_WAKEUP_EXT0:  Serial.println("唤醒：外部引脚"); break;\n    case ESP_SLEEP_WAKEUP_TOUCHPAD: Serial.println("唤醒：触摸"); break;\n    default: Serial.println("冷启动 / 复位"); break;\n  }\n}\n\nvoid setup() {\n  Serial.begin(115200);\n  ++bootCount;\n  Serial.printf("第 %d 次唤醒\\n", bootCount);\n  printWakeupReason();\n\n  // —— 一次性完成采集 + 上报，尽量缩短高电流时间 ——\n  WiFi.begin(SSID, PASS);\n  while (WiFi.status() != WL_CONNECTED) delay(100);  // 实际应加超时\n  mqttPublish(readSensor());\n  WiFi.disconnect(true);       // 关闭射频，避免睡眠时继续耗电\n\n${src.join('\n')}\n  Serial.println("进入${NAMES[s.mode]} …");\n  delay(100);                  // 等待串口缓冲排空\n${s.mode === 'deep' ? '  esp_deep_sleep_start();' : s.mode === 'light' ? '  esp_light_sleep_start();' : s.mode === 'modem' ? '  esp_wifi_set_ps(WIFI_PS_MIN_MODEM);  // 由 WiFi 驱动自动进入' : '  // Active：不进入任何睡眠模式'}\n}\n\nvoid loop() {}`;
    }
    function refresh() {
      setCode('codePower', code());
      const c = calc();
      setRead(root, 'pwDays', c.days >= 365 ? (c.days / 365).toFixed(1) + ' 年' : c.days >= 1 ? c.days.toFixed(1) + ' 天' : (c.hours).toFixed(1) + ' 时');
      setRead(root, 'pwIavg', c.iavg < 1 ? c.iavg.toFixed(3) + ' mA' : c.iavg.toFixed(2) + ' mA');
      setRead(root, 'pwQ', c.q.toFixed(3) + ' mAh');
      setRead(root, 'pwDuty', (c.sleep / c.T * 100).toFixed(1) + '%');
      const bars = ['active', 'modem', 'light', 'deep'];
      $('#pwBars', root).innerHTML = bars.map(m => {
        const v = I_SLEEP[m], w = clamp((Math.log10(v + .01) + 2) / (Math.log10(180 + .01) + 2) * 100, 4, 100);
        const on = m === s.mode;
        return `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>${NAMES[m]}</span><b style="font-family:var(--mono);color:${on ? 'var(--primary)' : 'var(--text-3)'}">${v >= 1 ? v + ' mA' : (v * 1000).toFixed(0) + ' µA'}</b></div>
          <div style="height:9px;border-radius:5px;background:var(--surface-3);overflow:hidden"><div style="height:100%;width:${w}%;border-radius:5px;background:${on ? 'var(--primary)' : 'var(--border-strong)'}"></div></div></div>`;
      }).join('');
    }
    const map = {
      pwMode: v => { s.mode = v; term.log('电源模式 → ' + NAMES[v] + ' · 睡眠电流 ' + (I_SLEEP[v] >= 1 ? I_SLEEP[v] + ' mA' : I_SLEEP[v] * 1000 + ' µA'), 'info'); refresh(); },
      pwWake: v => { s.wake = v; refresh(); }, pwWork: v => { s.work = v; refresh(); }, pwCap: v => { s.cap = v; refresh(); },
      pwTimer: v => { s.timer = v; term.log('RTC 定时器唤醒 ' + (v ? '启用' : '关闭'), 'info'); refresh(); },
      pwExt: v => { s.ext = v; term.log('ext0 外部唤醒 ' + (v ? '启用' : '关闭'), 'info'); refresh(); },
      pwTouch: v => { s.touch = v; term.log('触摸唤醒 ' + (v ? '启用' : '关闭'), 'info'); refresh(); }
    };
    Object.keys(map).forEach(k => onCtrl(root, k, map[k]));
    const run = toggleRun(root, 'pwRun', 'pwLive');
    bindTermClear(root);
    term.log('RTC 域初始化 · 8 KB RTC FAST / 8 KB RTC SLOW', 'ok');
    term.log('提示：Deep Sleep 唤醒后相当于复位', 'warn');
    refresh();
    let lastWakeCycle = 0;
    function waveOpts(now) {
      const c = calc(), win = 2000, ratio = clamp(c.work / c.T, .002, 1);
      return {
        now, window: win, cols: 8,
        timeFmt: (tv, i, cols) => (i / cols * s.wake).toFixed(1) + ' min',
        channels: [{ label: 'I', color: c.iavg > 10 ? '#d64545' : '#0d7c72', type: 'step', fn: t => (((t % win) + win) % win) < win * ratio ? 1 : 0.08 }]
      };
    }
    startScope(root, 'pwWave', waveOpts, 25);
    Clock.add('power-main', t => {
      if (!run.isRunning()) return;
      const cyc = Math.floor(t / 3000);
      if (cyc !== lastWakeCycle) {
        lastWakeCycle = cyc;
        const c = calc();
        term.log('RTC 唤醒 #' + cyc + ' · 采集+上报 ' + c.work + ' s · 平均电流 ' + c.iavg.toFixed(2) + ' mA', 'ok');
        if (s.mode === 'deep') term.log('  → CPU 与 RAM 断电，bootCount 从 RTC 内存恢复', 'info');
      }
    });
  }
});

/* ================================================================
   综合项目 · 智能环境监测站
   ================================================================ */
registerLab('project', {
  meta: {
    eyebrow: 'CAPSTONE · 综合项目',
    title: '智能环境监测站',
    lead: '把 9 个实验串成一台能长期运行的设备：采集 → 显示 → 联网上报 → 越限告警 → 定时深睡。完成需求拆解、架构设计、状态机与整机联调。',
    chips: ['需求 → 架构 → 状态机', '9 个实验的综合运用', '完整代码框架', '45 min'],
    time: '45 min'
  },
  html: () => `
<div class="grid-2">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>项目需求 R1–R7</h2><span class="sub">点击勾选，跟踪完成度</span></div><div class="card-body">
    ${PROJECT.requirements.map((r, i) => `<label class="switch-row" style="padding:8px 4px;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" data-req="${i}" style="display:none"><span class="switch" data-req-sw="${i}"></span>
      <span><b style="font-family:var(--mono);color:var(--primary);margin-right:6px">${r[0]}</b>${r[1]}</span></label>`).join('')}
    <div style="margin-top:14px" class="progress-track"><div class="progress-fill" id="projFill" style="width:0%"></div></div>
    <p class="small muted" style="margin-top:8px">已完成 <b id="projCount">0</b> / ${PROJECT.requirements.length} 项需求</p>
  </div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>分层架构</h2><span class="sub">每个模块都能对应回一个实验</span></div><div class="card-body">
    <div id="projArch"></div>
    <div class="table-wrap" style="margin-top:16px"><table class="tbl">
      <tr><th>层</th><th>对应实验</th><th>引脚 / 资源</th></tr>
      ${PROJECT.modules.map(m => `<tr><td>${m.name}</td><td>${m.use}</td><td>${m.pins}</td></tr>`).join('')}
    </table></div>
    <div class="callout note" style="margin-bottom:0"><div class="ci">i</div><p><b>设计原则：</b>采集任务只管把数据放进队列，网络任务只管从队列取数据上报，两者不共享可变全局状态；显示与告警由独立低优先级任务处理。这样任何一层阻塞都不会拖垮其它层。</p></div>
  </div></div>
</div>

<h2 class="section-title">系统状态机 <small>点击状态查看进入条件与退出动作</small></h2>
<div class="card"><div class="card-body">
  <div class="seg" id="projStates" style="margin-bottom:16px">
    ${['BOOT', 'CONNECTING', 'SAMPLING', 'PUBLISHING', 'ALARM', 'DEEP_SLEEP'].map((x, i) => `<button type="button" data-v="${i}" class="${i === 2 ? 'on' : ''}">${x}</button>`).join('')}
  </div>
  <div id="projStateDetail" class="sim-panel"></div>
</div></div>

<h2 class="section-title">完整代码框架 <small>四段式骨架，可复制后填充业务逻辑</small></h2>
<div class="card"><div class="card-body">
  <div class="seg" id="projCodeSeg" style="margin-bottom:14px">
    <button type="button" data-v="0" class="on">全局与 setup</button><button type="button" data-v="1">采集任务</button>
    <button type="button" data-v="2">网络任务</button><button type="button" data-v="3">告警 / 显示 / 睡眠</button>
  </div>
  ${codeBlock('codeProject', 'env_station.ino', 'ARDUINO C++', '')}
  <p class="mini-note">说明：这是<b>教学骨架</b>，<code class="inline">oledInit()</code>、<code class="inline">appendToLittleFS()</code>、配网常量与 <code class="inline">offline</code> / <code class="inline">lastSample</code> / <code class="inline">page</code> 等状态变量需按实际硬件与你选用的库补全。建议按联调顺序分模块填充，不要一次写完再调试。</p>
</div></div>

<h2 class="section-title">引脚分配与联调顺序</h2>
<div class="grid-2">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>引脚分配表</h2></div><div class="card-body">
    <div class="table-wrap"><table class="tbl">
      <tr><th>器件</th><th>ESP32 引脚</th><th>接口 / 注意</th></tr>
      <tr><td>DHT22 温湿度</td><td>GPIO4</td><td>单总线，需 10 kΩ 上拉，采样间隔 ≥ 2 s</td></tr>
      <tr><td>光敏电阻分压</td><td>GPIO34 (ADC1)</td><td>仅输入；避开 ADC2 以兼容 WiFi</td></tr>
      <tr><td>OLED SSD1306</td><td>GPIO21 / 22</td><td>I²C SDA / SCL，地址 0x3C</td></tr>
      <tr><td>按键</td><td>GPIO5</td><td>INPUT_PULLUP + FALLING 中断，ISR 只置标志</td></tr>
      <tr><td>告警 LED</td><td>GPIO2</td><td>220 Ω 限流；Strapping 引脚，注意上电电平</td></tr>
      <tr><td>电池电压</td><td>GPIO35 (ADC1)</td><td>100 kΩ / 33 kΩ 分压，量程 0–12 V</td></tr>
    </table></div>
    <div class="callout danger" style="margin-bottom:0"><div class="ci">!</div><p>禁止占用 GPIO1/3（UART0 日志与烧录）、GPIO6–11（Flash）、GPIO12/0/15（Strapping 关键电平）。</p></div>
  </div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>推荐联调顺序</h2></div><div class="card-body">
    <ol class="clean">
      <li><b>先电源后信号：</b>只用 USB 供电点亮 OLED，确认 3.3 V 与共地。</li>
      <li><b>逐个模块验证：</b>DHT22 → ADC → 按键 → LED，每个模块单独跑通并打印日志。</li>
      <li><b>再加网络：</b>先本地 MQTT Broker（如 Mosquitto），成功后再上云；观察 ADC2 是否受 WiFi 影响。</li>
      <li><b>多任务整合：</b>引入队列与优先级，检查栈高水位与看门狗。</li>
      <li><b>异常注入：</b>拔网线、断电重启、塞入非法 JSON，验证重连与降级缓存。</li>
      <li><b>功耗实测：</b>串入万用表或电流记录仪，对比理论 I<sub>avg</sub>，解释偏差。</li>
      <li><b>交付：</b>演示视频 + 波形截图 + 代码仓库 + 实验报告。</li>
    </ol>
  </div></div>
</div>
<div class="card" style="margin-top:18px"><div class="card-head"><span class="dot"></span><h2>验收自查与扩展方向</h2></div><div class="card-body">
  <div class="grid-2">
    <div><h4>验收自查</h4><ul class="clean">
      <li>断电重启后能否自动重连并恢复上报？</li>
      <li>连续运行 24 h 有无内存泄漏或看门狗复位？</li>
      <li>阈值附近告警是否抖动？滞回是否生效？</li>
      <li>断网期间数据是否丢失？降级缓存容量多少？</li>
      <li>代码里是否还有阻塞式 <code class="inline">delay()</code>？</li></ul></div>
    <div><h4>扩展方向</h4><ul class="clean">
      <li>OTA 远程升级 + 双分区回滚</li>
      <li>NVS 保存 WiFi 配网与校准参数</li>
      <li>BLE 配网 / Web 配网页面</li>
      <li>本地 SD 卡 / LittleFS 数据缓存</li>
      <li>接入 Home Assistant / Grafana 可视化</li></ul></div>
  </div>
</div></div>`,
  mount(root) {
    // 需求勾选
    $$('[data-req]', root).forEach(cb => {
      cb.onchange = () => {
        const i = cb.dataset.req;
        $('[data-req-sw="' + i + '"]', root).classList.toggle('on', cb.checked);
        const done = $$('[data-req]:checked', root).length;
        $('#projCount', root).textContent = String(done);
        $('#projFill', root).style.width = (done / PROJECT.requirements.length * 100) + '%';
        if (done === PROJECT.requirements.length) toast('全部需求已勾选，可以开始整机联调了');
      };
    });
    // 架构图
    $('#projArch', root).innerHTML = `
      <div class="flow"><span class="node hl">传感器层<br><small>DHT22 / 光敏 / 电池</small></span><span class="arrow">→</span><span class="node">采集任务 P2<br><small>队列 × 8</small></span></div>
      <div class="flow"><span class="node">网络任务 P3<br><small>WiFi + MQTT</small></span><span class="arrow">→</span><span class="node hl">Broker / 云看板</span></div>
      <div class="flow"><span class="node">显示 / 告警 P1<br><small>OLED + LED</small></span><span class="arrow">←</span><span class="node">状态机<br><small>BOOT…DEEP_SLEEP</small></span><span class="arrow">→</span><span class="node">电源管理<br><small>RTC 唤醒</small></span></div>`;
    // 状态机
    const STATES = [
      ['BOOT', '上电 / Deep Sleep 唤醒', '初始化串口、NVS、I²C；读取 bootCount 与唤醒原因；若冷启动则加载配网参数。', '→ CONNECTING'],
      ['CONNECTING', 'BOOT 完成', '启动 WiFi STA，超时 10 s；MQTT CONNECT 带 LWT 遗嘱；失败则指数退避重试，连续 5 次进入 OFFLINE 降级缓存。', '→ SAMPLING'],
      ['SAMPLING', '定时 5 s 到 / 队列有空间', '读取 DHT22、ADC 光照与电池电压；5 点滑动平均；把 Sample 结构投递到队列（非阻塞）。', '→ PUBLISHING / ALARM'],
      ['PUBLISHING', '队列收到数据', '序列化 JSON，publish 到 lab/esp32/env；等待 PUBACK（QoS 1）；失败则写入 LittleFS 离线队列。', '→ SAMPLING / DEEP_SLEEP'],
      ['ALARM', '温度 > 30 °C 或湿度 > 80 %（连续 3 次）', '点亮 GPIO2、OLED 显示红色告警、发布高优先级事件 topic；温度回落至 28.5 °C 才解除（滞回）。', '→ SAMPLING'],
      ['DEEP_SLEEP', '完成一次上报且配置为电池模式', '断开 WiFi、保存 bootCount 到 RTC 内存、配置 10 min RTC 定时器 + ext0 按键唤醒、进入 Deep Sleep。', '→ BOOT（唤醒后相当于复位）']
    ];
    function showState(i) {
      const st = STATES[Number(i)];
      $('#projStateDetail', root).innerHTML = `<div style="font-size:15px;font-weight:700;color:var(--primary);margin-bottom:8px">${st[0]}</div>
        <div class="grid-2"><div><p class="small muted" style="margin:0 0 4px">进入条件</p><p style="margin:0">${st[1]}</p></div>
        <div><p class="small muted" style="margin:0 0 4px">退出 / 转移</p><p style="margin:0">${st[3]}</p></div></div>
        <p class="small muted" style="margin:12px 0 4px">状态内动作</p><p style="margin:0">${st[2]}</p>`;
    }
    $$('#projStates button', root).forEach(b => b.onclick = () => {
      $$('#projStates button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); showState(b.dataset.v);
    });
    showState(2);
    // 代码框架
    const CODE = [
      `// ========== 综合项目：智能环境监测站 ==========\n// ① 全局定义与 setup()\n#include <WiFi.h>\n#include <PubSubClient.h>\n#include <DHT.h>\n#include <Wire.h>\n#include <ArduinoJson.h>\n#include <esp_sleep.h>\n\n#define DHT_PIN   4\n#define LDR_PIN  34      // ADC1_CH6，兼容 WiFi\n#define VBAT_PIN 35      // ADC1_CH7，100k/33k 分压\n#define BTN_PIN   5\n#define LED_PIN   2\n\nstruct Sample {\n  float temp, hum, lux, vbat;\n  uint32_t ts;\n};\n\nQueueHandle_t sampleQ;\nRTC_DATA_ATTR int bootCount = 0;\nvolatile bool buttonEvent = false;\nvolatile bool alarm = false;\n\nWiFiClient net;\nPubSubClient mqtt(net);\nDHT dht(DHT_PIN, DHT22);\n\nvoid IRAM_ATTR onButton() { buttonEvent = true; }  // ISR 只置标志\n\nvoid setup() {\n  Serial.begin(115200);\n  ++bootCount;\n  Serial.printf("boot #%d, wake cause=%d\\n",\n                bootCount, esp_sleep_get_wakeup_cause());\n\n  pinMode(LED_PIN, OUTPUT);\n  pinMode(BTN_PIN, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(BTN_PIN), onButton, FALLING);\n  analogReadResolution(12);\n  analogSetAttenuation(ADC_11db);\n  Wire.begin(21, 22);\n  oledInit();\n  dht.begin();\n\n  sampleQ = xQueueCreate(8, sizeof(Sample));\n  mqtt.setServer("broker.emqx.io", 1883);\n  mqtt.setKeepAlive(60);\n\n  // 三个任务全部固定在 APP_CPU(1)\n  xTaskCreatePinnedToCore(sensorTask, "Sensor", 4096, nullptr, 2, nullptr, 1);\n  xTaskCreatePinnedToCore(netTask,    "Net",    8192, nullptr, 3, nullptr, 1);\n  xTaskCreatePinnedToCore(uiTask,     "UI",     4096, nullptr, 1, nullptr, 1);\n  esp_task_wdt_init(30, true);   // 30 s 看门狗\n}`,
      `// ② 采集任务 P2：只负责采样与投递，不碰网络\nfloat movingAvg(float x) {\n  static float buf[5] = {0};\n  static int idx = 0;\n  buf[idx] = x; idx = (idx + 1) % 5;\n  float s = 0; for (float v : buf) s += v;\n  return s / 5;\n}\n\nvoid sensorTask(void* pv) {\n  TickType_t last = xTaskGetTickCount();\n  for (;;) {\n    Sample s;\n    s.temp = movingAvg(dht.readTemperature());\n    s.hum  = movingAvg(dht.readHumidity());\n    if (isnan(s.temp)) { vTaskDelay(pdMS_TO_TICKS(2000)); continue; }\n    int adcLux = analogRead(LDR_PIN);\n    int adcBat = analogRead(VBAT_PIN);\n    s.lux  = adcLux / 4095.0 * 100.0;          // 归一化照度\n    s.vbat = adcBat / 4095.0 * 3.3 * 133 / 33; // 分压还原\n    s.ts   = millis();\n\n    // 滞回告警：开启 30 °C，解除 28.5 °C\n    if (!alarm && s.temp > 30.0) alarm = true;\n    else if (alarm && s.temp < 28.5) alarm = false;\n\n    xQueueSend(sampleQ, &s, 0);   // 队列满则丢弃，绝不阻塞采集\n    vTaskDelayUntil(&last, pdMS_TO_TICKS(5000));\n  }\n}`,
      `// ③ 网络任务 P3：队列驱动 + 断线重连 + 降级缓存\nvoid connectAll() {\n  WiFi.mode(WIFI_STA);\n  WiFi.begin(SSID, PASS);\n  uint32_t t0 = millis();\n  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000)\n    vTaskDelay(pdMS_TO_TICKS(200));   // 有超时，且让出 CPU\n\n  if (WiFi.status() != WL_CONNECTED) { offline = true; return; }\n  mqtt.connect("esp32-env", USER, TOKEN,\n               "lab/esp32/status", 0, true, "offline");\n  mqtt.publish("lab/esp32/status", "online", true);\n  offline = false;\n}\n\nvoid netTask(void* pv) {\n  Sample s;\n  for (;;) {\n    if (xQueueReceive(sampleQ, &s, portMAX_DELAY)) {\n      if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) connectAll();\n      StaticJsonDocument<192> doc;\n      doc["t"] = s.temp; doc["h"] = s.hum;\n      doc["lux"] = s.lux; doc["vbat"] = s.vbat;\n      doc["alarm"] = alarm; doc["boot"] = bootCount;\n      char buf[192]; serializeJson(doc, buf);\n\n      if (!offline) mqtt.publish("lab/esp32/env", buf);\n      else appendToLittleFS(buf);      // 降级：离线缓存\n      mqtt.loop();\n    }\n  }\n}`,
      `// ④ 显示 / 告警 / 电源管理\nvoid uiTask(void* pv) {\n  for (;;) {\n    if (buttonEvent) {                 // 主循环里消抖，不在 ISR 里做\n      buttonEvent = false; page = (page + 1) % 3;\n    }\n    oledShowPage(page, lastSample, alarm, offline);\n    digitalWrite(LED_PIN, alarm ? HIGH : LOW);\n    vTaskDelay(pdMS_TO_TICKS(200));\n  }\n}\n\nvoid enterDeepSleep() {\n  WiFi.disconnect(true);             // 关闭射频，避免睡眠漏电\n  mqtt.disconnect();\n  esp_sleep_enable_timer_wakeup(10ULL * 60 * 1000000ULL);\n  esp_sleep_enable_ext0_wakeup(GPIO_NUM_5, 0);\n  Serial.println("Deep Sleep 10 min …");\n  delay(100);                        // 等串口排空\n  esp_deep_sleep_start();            // 唤醒后重新从 setup() 执行\n}\n\nvoid loop() {\n  // Arduino 默认任务让出 CPU，全部逻辑在自建任务中\n  vTaskDelay(portMAX_DELAY);\n}`
    ];
    setCode('codeProject', CODE[0]);
    $$('#projCodeSeg button', root).forEach(b => b.onclick = () => {
      $$('#projCodeSeg button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); setCode('codeProject', CODE[Number(b.dataset.v)]);
    });
  }
});

