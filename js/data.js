/* ============================================================
   data.js · 课程结构、知识内容、引脚数据、题库
   纯静态数据，无外部依赖
   ============================================================ */

const COURSE = {
  title: 'ESP32 嵌入式系统',
  subtitle: '交互式学习课程',
  weeks: 16,
  theoryHours: 32,
  labHours: 32,
  credits: 3,
  audience: '电子信息 / 计算机 / 自动化 本科二、三年级',
  prerequisite: 'C 语言程序设计、数字电路、单片机原理（或等效基础）',
  goals: [
    { t: '硬件认知', d: '读懂 ESP32 最小系统、引脚复用与电气约束，能独立完成电路连接与排查。' },
    { t: '外设编程', d: '掌握 GPIO、外部中断、PWM、ADC、定时器等片上外设的寄存器级与库级使用。' },
    { t: '通信协议', d: '理解 UART / I²C / SPI 的帧结构与时序，能驱动常见传感器并完成总线调试。' },
    { t: '联网与系统', d: '掌握 WiFi 接入、MQTT 数据上报、FreeRTOS 多任务与低功耗设计方法。' },
    { t: '工程实践', d: '具备从需求分析、模块划分到整机联调、测试与文档撰写的项目能力。' }
  ],
  syllabus: [
    ['第 1–2 周', '嵌入式系统导论 · ESP32 架构与最小系统', '认识硬件、引脚地图、电源与启动流程', '硬件认知实验'],
    ['第 3 周', '开发环境与程序构建流程', '工具链、编译—烧录—运行、串口日志', 'Blink 上板'],
    ['第 4 周', 'GPIO 输出与数字电路接口', '灌/拉电流、限流电阻、电平标准', '实验 1 LED'],
    ['第 5 周', '输入、上拉与中断消抖', '机械抖动、边沿触发、ISR 设计原则', '实验 2 按键'],
    ['第 6 周', '定时器与 PWM', 'LEDC 频率/分辨率、舵机与调光', '实验 3 PWM'],
    ['第 7 周', '模拟量采集与量化误差', 'SAR ADC、衰减、采样率、滤波', '实验 4 ADC'],
    ['第 8 周', '串行总线：UART / I²C / SPI', '帧格式、时序、上拉、模式', '实验 5 时序'],
    ['第 9–10 周', 'WiFi 接入与物联网协议', 'STA/AP、TCP/IP、MQTT 发布订阅', '实验 6 / 7'],
    ['第 11–12 周', '实时操作系统 FreeRTOS', '任务、优先级、信号量、队列、看门狗', '实验 8'],
    ['第 13 周', '电源管理与低功耗', '睡眠模式、唤醒源、续航估算', '实验 9'],
    ['第 14–15 周', '综合项目：智能环境监测站', '多模块集成、状态机、异常处理', '综合项目'],
    ['第 16 周', '课程复盘与验收', '作品演示、报告答辩、自测', '自测题库']
  ],
  assessment: [
    ['实验过程与现场验收', '40%', '每个实验的接线、代码、现象与思考题'],
    ['综合项目', '30%', '功能完整性、稳定性、代码规范、演示'],
    ['实验报告', '20%', '原理、数据记录、波形截图、结果分析'],
    ['课堂参与与自测', '10%', '在线自测成绩与讨论参与']
  ]
};

/* ---------------- 导航结构 ---------------- */
const SECTIONS = [
  { group: '开始学习', items: [
    { id: 'overview', title: '课程概览', short: '目标 · 大纲 · 学习路径', kind: 'overview', time: '5 min' },
    { id: 'hardware', title: '认识 ESP32 硬件', short: '架构 · 引脚地图 · 电气约束', kind: 'page', time: '20 min' },
    { id: 'toolchain', title: '开发环境与程序生命周期', short: '工具链 · 编译烧录 · 启动流程', kind: 'page', time: '15 min' }
  ]},
  { group: '基础实验', items: [
    { id: 'lab-gpio', title: '实验 1 · GPIO 与 LED 闪烁', short: '数字输出 / 限流电阻 / 逻辑波形', kind: 'lab', time: '25 min' },
    { id: 'lab-button', title: '实验 2 · 按键与中断消抖', short: '上拉输入 / 机械抖动 / ISR', kind: 'lab', time: '25 min' },
    { id: 'lab-pwm', title: '实验 3 · PWM 与舵机', short: 'LEDC / 占空比 / 频率与分辨率', kind: 'lab', time: '30 min' },
    { id: 'lab-adc', title: '实验 4 · ADC 采样与量化', short: 'SAR ADC / 采样定理 / 量化误差', kind: 'lab', time: '30 min' }
  ]},
  { group: '通信与联网', items: [
    { id: 'lab-bus', title: '实验 5 · 串行总线时序', short: 'UART / I²C / SPI 逐位可视化', kind: 'lab', time: '30 min' },
    { id: 'lab-wifi', title: '实验 6 · WiFi 与 MQTT', short: 'STA/AP / 连接状态机 / 发布订阅', kind: 'lab', time: '25 min' },
    { id: 'lab-sensor', title: '实验 7 · 传感器数据采集', short: '单总线 / 实时曲线 / 滤波与告警', kind: 'lab', time: '30 min' }
  ]},
  { group: '系统与工程', items: [
    { id: 'lab-rtos', title: '实验 8 · FreeRTOS 任务调度', short: '抢占 / 阻塞 / 甘特图 / 看门狗', kind: 'lab', time: '30 min' },
    { id: 'lab-power', title: '实验 9 · 低功耗与续航', short: '睡眠模式 / 唤醒源 / 电池寿命', kind: 'lab', time: '25 min' },
    { id: 'project', title: '综合项目 · 环境监测站', short: '架构设计 / 状态机 / 完整代码框架', kind: 'project', time: '45 min' }
  ]},
  { group: '评估与文档', items: [
    { id: 'quiz', title: '课程自测题库', short: '14 道题 · 即时判分与解析', kind: 'quiz', time: '20 min' },
    { id: 'report', title: '实验报告规范', short: '模板 · 评分标准 · 常见扣分点', kind: 'page', time: '10 min' }
  ]}
];

/* ---------------- ESP32 引脚数据（30 针 DevKit 教学示意） ----------------
   功能描述依据 ESP32 技术参考手册；不同厂商板卡丝印排列可能略有差异。 */
const PINS_LEFT = [
  { n: '3V3', gpio: null, type: 'power', cat: '电源', funcs: ['3.3 V 输出'], desc: '板载 LDO 输出的 3.3 V，可为传感器供电。注意与普通 5 V 模块连接时需要电平转换。', warn: '最大输出电流受 USB 与 LDO 限制，典型 500 mA 左右。' },
  { n: 'EN', gpio: null, type: 'ctrl', cat: '控制', funcs: ['复位 / 使能'], desc: '拉低复位芯片，板上通常已有 RC 上电复位电路，也接到自动下载电路。', warn: 'EN 与 GPIO0 的组合决定进入下载模式。' },
  { n: 'GPIO36', gpio: 36, type: 'input', cat: '仅输入', funcs: ['ADC1_CH0', 'SENSOR_VP', 'RTC_GPIO0'], desc: '仅输入引脚，常用于模拟量采集或霍尔传感器，属于 ADC1（可与 WiFi 共存）。', warn: '仅输入：无内部上拉/下拉，不能配置为输出。' },
  { n: 'GPIO39', gpio: 39, type: 'input', cat: '仅输入', funcs: ['ADC1_CH3', 'SENSOR_VN', 'RTC_GPIO3'], desc: '仅输入引脚，ADC1 通道 3。', warn: '仅输入：无内部上拉/下拉。' },
  { n: 'GPIO34', gpio: 34, type: 'input', cat: '仅输入', funcs: ['ADC1_CH6', 'RTC_GPIO4'], desc: '仅输入引脚，适合接按键（需外接上拉）或模拟信号。', warn: '仅输入：INPUT_PULLUP 对它无效。' },
  { n: 'GPIO35', gpio: 35, type: 'input', cat: '仅输入', funcs: ['ADC1_CH7', 'RTC_GPIO5'], desc: '仅输入引脚，ADC1 通道 7。', warn: '仅输入。' },
  { n: 'GPIO32', gpio: 32, type: 'io', cat: '通用 IO', funcs: ['ADC1_CH4', 'TOUCH9', 'DAC 外部', 'RTC_GPIO9'], desc: '通用 IO，可作 ADC、电容触摸输入，也可输出 PWM。', warn: '' },
  { n: 'GPIO33', gpio: 33, type: 'io', cat: '通用 IO', funcs: ['ADC1_CH5', 'TOUCH8', 'RTC_GPIO8'], desc: '通用 IO，支持 ADC1 与触摸感应。', warn: '' },
  { n: 'GPIO25', gpio: 25, type: 'io', cat: 'DAC', funcs: ['DAC1', 'ADC2_CH8'], desc: '8 位 DAC 通道 1，可输出模拟电压（约 0–3.3 V），常用于音频或波形发生。', warn: 'ADC2 通道在 WiFi 开启时读数不可靠。' },
  { n: 'GPIO26', gpio: 26, type: 'io', cat: 'DAC', funcs: ['DAC2', 'ADC2_CH9'], desc: '8 位 DAC 通道 2。', warn: 'ADC2 与 WiFi 共用内部资源。' },
  { n: 'GPIO27', gpio: 27, type: 'io', cat: '通用 IO', funcs: ['ADC2_CH7', 'TOUCH7'], desc: '常用通用 IO，连接 I²C 或显示屏时经常复用为数据线。', warn: '' },
  { n: 'GPIO14', gpio: 14, type: 'io', cat: 'SPI', funcs: ['ADC2_CH6', 'TOUCH6', 'HSPI_CLK'], desc: '可作为 HSPI 时钟线，也是常用 PWM 输出脚。', warn: '上电时会有 PWM/时钟抖动，驱动继电器需留意。' },
  { n: 'GPIO12', gpio: 12, type: 'io', cat: 'Strapping', funcs: ['ADC2_CH5', 'TOUCH5', 'HSPI_MISO', 'MTDI'], desc: 'Strapping 引脚（MTDI），复位时电平决定内部 Flash 工作电压。', warn: '上电时被拉高可能导致 Flash 启动失败；建议避免接上拉外设。' },
  { n: 'GND', gpio: null, type: 'power', cat: '电源', funcs: ['地'], desc: '系统地。所有传感器、电源与串口设备必须共地。', warn: '忘记共地是串口与 I²C 调试失败的最常见原因。' },
  { n: 'GPIO13', gpio: 13, type: 'io', cat: 'SPI', funcs: ['ADC2_CH4', 'TOUCH4', 'HSPI_MOSI'], desc: 'HSPI MOSI，也常用于板上 LED 或 PWM。', warn: '' }
];
const PINS_RIGHT = [
  { n: 'VIN', gpio: null, type: 'power', cat: '电源', funcs: ['5 V 输入'], desc: 'USB 5 V（经二极管）输入，可给板子供电；板上 LDO 将其降至 3.3 V。', warn: 'VIN 是 5 V，绝不能直接接到任何 GPIO。' },
  { n: 'GND', gpio: null, type: 'power', cat: '电源', funcs: ['地'], desc: '系统地。', warn: '' },
  { n: 'GPIO23', gpio: 23, type: 'io', cat: 'SPI', funcs: ['VSPI_MOSI', 'HSPI 复用'], desc: '默认 VSPI 的 MOSI（主机输出），驱动 TFT、SD 卡常用。', warn: '' },
  { n: 'GPIO22', gpio: 22, type: 'io', cat: 'I²C', funcs: ['I²C SCL（默认）'], desc: 'Arduino Wire 库默认时钟线 SCL。', warn: 'I²C 总线必须外接上拉电阻（多数模块已内置 4.7 kΩ）。' },
  { n: 'GPIO21', gpio: 21, type: 'io', cat: 'I²C', funcs: ['I²C SDA（默认）'], desc: 'Arduino Wire 库默认数据线 SDA。', warn: '与 SCL 成对使用。' },
  { n: 'GPIO19', gpio: 19, type: 'io', cat: 'SPI', funcs: ['VSPI_MISO'], desc: '默认 VSPI 的 MISO（主机输入）。', warn: '' },
  { n: 'GPIO18', gpio: 18, type: 'io', cat: 'SPI', funcs: ['VSPI_CLK'], desc: '默认 VSPI 时钟线。', warn: '' },
  { n: 'GPIO5', gpio: 5, type: 'io', cat: 'SPI', funcs: ['VSPI_CS'], desc: '默认 VSPI 片选，也是常用的输出脚。', warn: '属于 Strapping 引脚，上电时电平需保持稳定。' },
  { n: 'GPIO4', gpio: 4, type: 'io', cat: '通用 IO', funcs: ['ADC2_CH0', 'TOUCH0'], desc: '常用通用 IO，板上外接 DS18B20、继电器时常用。', warn: '' },
  { n: 'GPIO0', gpio: 0, type: 'io', cat: 'Strapping', funcs: ['BOOT 按键', 'ADC2_CH1', 'TOUCH1'], desc: 'Strapping 引脚。复位时拉低进入串口下载模式，板上 BOOT 按键即接此脚。', warn: '外接上拉/大电容可能导致无法烧录或无法正常运行。' },
  { n: 'GPIO2', gpio: 2, type: 'io', cat: 'Strapping', funcs: ['板载 LED', 'ADC2_CH2', 'TOUCH2'], desc: '多数 DevKit 板载蓝色 LED 接在此脚。', warn: 'Strapping 引脚，上电需为低或悬空；避免接下拉外设。' },
  { n: 'GPIO15', gpio: 15, type: 'io', cat: 'Strapping', funcs: ['ADC2_CH3', 'TOUCH3', 'HSPI_CS', 'MTDO'], desc: 'Strapping 引脚（MTDO），影响启动日志输出与 Flash 电压。', warn: '上电时需为低电平，许多板子已内置下拉。' },
  { n: 'GPIO1', gpio: 1, type: 'io', cat: 'UART0', funcs: ['U0TXD', '串口日志 TX'], desc: 'UART0 发送脚，用于 USB 转串口的日志输出与程序下载。', warn: '烧录与 Serial 监视器占用，一般不要复用。' },
  { n: 'GPIO3', gpio: 3, type: 'io', cat: 'UART0', funcs: ['U0RXD', '串口下载 RX'], desc: 'UART0 接收脚。', warn: '一般不要复用。' },
  { n: 'GND', gpio: null, type: 'power', cat: '电源', funcs: ['地'], desc: '系统地。', warn: '' }
];

const PIN_CATEGORIES = [
  { name: '电源 / 控制', color: '#8a99a9', cats: ['电源', '控制'] },
  { name: '仅输入', color: '#d97706', cats: ['仅输入'] },
  { name: '通用 IO / DAC', color: '#0d7c72', cats: ['通用 IO', 'DAC'] },
  { name: '通信总线', color: '#2563eb', cats: ['SPI', 'I²C', 'UART0'] },
  { name: 'Strapping（启动配置）', color: '#d64545', cats: ['Strapping'] }
];

/* ---------------- 理论页 ---------------- */
const PAGES = {
  hardware: {
    eyebrow: 'CHAPTER 01 · 硬件认知',
    title: '认识 ESP32 硬件',
    lead: '在写第一行代码之前，先把这块板子看明白：它有多少算力、哪些引脚能用、哪些引脚碰不得。下面的引脚图可以点击交互。',
    chips: ['ESP32-WROOM-32', '双核 Xtensa LX6', '34 个 GPIO', '3.3 V 逻辑'],
    html: `
<div class="callout tip"><div class="ci">◉</div><p><b>动手试试：</b>本页下方有一张可点击的 30 针引脚地图，悬停查看复用功能、点击查看禁用事项与选型建议。
  <button class="btn sm" data-scroll="pinoutSection" style="margin-left:8px">跳到引脚地图 ↓</button></p></div>
<div class="grid-2">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>片上资源一览</h2></div><div class="card-body">
    <div class="table-wrap"><table class="tbl">
      <tr><th>项目</th><th>参数</th></tr>
      <tr><td>CPU</td><td>双核 32 位 Xtensa LX6，主频 80 / 160 / 240 MHz，可独立关停单核</td></tr>
      <tr><td>存储</td><td>520 KB 片上 SRAM；外挂 4 MB（常见）SPI Flash；448 KB ROM</td></tr>
      <tr><td>无线</td><td>Wi-Fi 802.11 b/g/n @ 2.4 GHz；Bluetooth v4.2 BR/EDR + BLE</td></tr>
      <tr><td>GPIO</td><td>34 个可编程引脚（部分仅输入），支持矩阵式任意复用</td></tr>
      <tr><td>模拟</td><td>2 × 12 位 SAR ADC（18 通道）、2 × 8 位 DAC、10 路电容触摸</td></tr>
      <tr><td>定时/PWM</td><td>4 × 64 位通用定时器；16 路 LEDC PWM；8 路 MCPWM</td></tr>
      <tr><td>接口</td><td>3 × UART、2 × I²C、4 × SPI、I²S、CAN 2.0B、SD/SDIO、以太网 MAC</td></tr>
      <tr><td>安全</td><td>AES / SHA / RSA / ECC 硬件加速、安全启动、Flash 加密、eFuse</td></tr>
      <tr><td>供电</td><td>芯片 2.3–3.6 V；开发板 USB 5 V → 板载 LDO 3.3 V；I/O 为 3.3 V 逻辑</td></tr>
    </table></div>
    <div class="callout warn"><div class="ci">!</div><p><b>3.3 V 逻辑是设计红线。</b>尽管部分 IO 在实测中能短时承受 5 V，按数据手册规范，连接 5 V 器件（如经典 Arduino 传感器、5 V 继电器）时必须加分压电阻或电平转换芯片，否则会缩短芯片寿命甚至直接损坏。</p></div>
  </div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>最小系统与启动流程</h2></div><div class="card-body">
    <p>一块能跑起来的 ESP32 至少需要四部分：<b>电源与去耦</b>、<b>上电复位</b>、<b>启动模式选择</b>、<b>串口下载通道</b>。开发板已把它们集成好，但理解它们能解释绝大多数"烧不进去"的问题。</p>
    <div class="flow">
      <span class="node">USB 5 V</span><span class="arrow">→</span>
      <span class="node">LDO 3.3 V</span><span class="arrow">→</span>
      <span class="node hl">ESP32 芯片</span>
    </div>
    <div class="flow">
      <span class="node">EN 上电复位</span><span class="arrow">→</span>
      <span class="node">ROM 引导（一级 Bootloader）</span><span class="arrow">→</span>
      <span class="node">采样 Strapping 引脚</span><span class="arrow">→</span>
      <span class="node">Flash 中的二级 Bootloader</span><span class="arrow">→</span>
      <span class="node hl">app 分区 / setup()</span>
    </div>
    <h3 class="under">Strapping 引脚：上电瞬间被采样的"开关"</h3>
    <div class="table-wrap"><table class="tbl">
      <tr><th>引脚</th><th>作用</th><th>使用建议</th></tr>
      <tr><td>GPIO0</td><td>低电平 → 串口下载模式；高电平 → 正常运行</td><td>板上 BOOT 键；避免外接强上拉/大电容</td></tr>
      <tr><td>GPIO2</td><td>下载时需为低或悬空</td><td>板载 LED 占用；避免接下拉负载</td></tr>
      <tr><td>GPIO12 (MTDI)</td><td>决定 Flash 工作电压 1.8 V / 3.3 V</td><td><b>上电时务必为低</b>，否则 Flash 启动失败</td></tr>
      <tr><td>GPIO15 (MTDO)</td><td>影响启动日志与 Flash 电压</td><td>上电需为低，多数板已内置下拉</td></tr>
    </table></div>
    <div class="callout note"><div class="ci">i</div><p><b>被 Flash 占用的引脚：</b>GPIO6–GPIO11 在 WROOM-32 模组内部连接 SPI Flash，绝不可作为普通 IO 使用。GPIO34 / 35 / 36 / 39 是<b>仅输入</b>引脚，没有内部上拉下拉，也不能输出 PWM。</p></div>
    <h3 class="under">GPIO 矩阵与 IO_MUX</h3>
    <p>ESP32 的大多数数字外设信号可通过 <b>GPIO 交换矩阵</b> 路由到任意引脚，这是它比传统单片机灵活得多的地方。但高速信号（SPI、I²S、SDIO）走 <b>IO_MUX</b> 直连路径时延更低；追求 40 MHz 以上时钟时，优先使用默认引脚。</p>
  </div></div>
</div>

<h2 class="section-title" id="pinoutSection">交互式引脚地图 <small>点击任意引脚查看功能与禁用事项</small></h2>
<div class="card"><div class="card-body">
  <div class="pinout-wrap">
    <div id="pinoutHost"></div>
    <div class="pin-detail" id="pinDetail">
      <h3>选择一个引脚</h3>
      <p class="muted small">引脚图按 30 针 DevKit 教学示意绘制。颜色区分电源、仅输入、通用 IO、通信总线与启动配置引脚。悬停可看简介，点击可固定详情。</p>
      <div class="legend-dots" id="pinLegend"></div>
      <div class="callout tip" style="margin-top:18px"><div class="ci">✓</div><p><b>选型口诀：</b>模拟量优先 ADC1（GPIO32–36、39），避开 Strapping 引脚做关键输入，I²C 用 21/22，VSPI 用 18/19/23/5，日志口 1/3 不要动。</p></div>
    </div>
  </div>
  <p class="mini-note">注：不同厂商 DevKit 板型的引脚排列与丝印可能略有差异，实际接线请以板卡丝印和原理图为准；功能描述依据 Espressif《ESP32 技术参考手册》。</p>
</div></div>

<h2 class="section-title">电气特性速查</h2>
<div class="grid-3">
  <div class="card"><div class="card-body"><h4>输出驱动能力</h4><p class="small">单个 GPIO 推荐工作电流 <b>≤ 12 mA</b>，绝对最大约 40 mA；全部 IO 总电流建议控制在 200 mA 以内。驱动 LED 用 220–330 Ω 限流电阻，驱动继电器/电机必须经过三极管或驱动模块。</p><div class="formula">R = (3.3 V − V<sub>F</sub>) / I<br>红光 LED：V<sub>F</sub>≈2.0 V, I=10 mA → R≈130 Ω<br>工程常用：220 Ω → I≈6 mA</div></div></div>
  <div class="card"><div class="card-body"><h4>输入与中断</h4><p class="small">除仅输入引脚外，均可配置内部上拉/下拉（约 45 kΩ）。所有 GPIO 都支持上升沿/下降沿/双边沿中断与唤醒。按键推荐 <code class="inline">INPUT_PULLUP</code> + 按键接 GND，按下为低电平。</p><div class="formula">pinMode(4, INPUT_PULLUP);<br>attachInterrupt(digitalPinToInterrupt(4), isr, FALLING);</div></div></div>
  <div class="card"><div class="card-body"><h4>ADC 注意事项</h4><p class="small">默认 12 位、0–3.3 V（0 dB 衰减实测约 0–1.1 V 线性区）。设 <code class="inline">analogSetAttenuation(ADC_11db)</code> 可扩展量程。<b>ADC2 与 WiFi 驱动冲突</b>：开启 WiFi 后只能使用 ADC1（GPIO32–36、39）。片内 ADC 存在非线性，精密测量需多点标定或外接 ADS1115。</p><div class="formula">V<sub>GPIO</sub> = V<sub>in</sub> × R2 / (R1 + R2)<br>100 kΩ / 33 kΩ → 0–12 V 量程</div></div></div>
</div>`
  },

  toolchain: {
    eyebrow: 'CHAPTER 02 · 开发环境',
    title: '开发环境与程序生命周期',
    lead: '从一行 <code class="inline">digitalWrite()</code> 到芯片里真正翻转的寄存器，中间发生了什么？理解这条链路，才能看懂编译报错、烧录失败与启动日志。',
    chips: ['Arduino-ESP32', 'ESP-IDF', 'MicroPython', '编译 → 链接 → 烧录 → 运行'],
    html: `
<div class="card"><div class="card-head"><span class="dot"></span><h2>三条主流技术路线</h2><span class="sub">本课程以 Arduino-ESP32 为主，ESP-IDF 作为进阶对照</span></div><div class="card-body">
  <div class="table-wrap"><table class="tbl">
    <tr><th>框架</th><th>语言 / 构建</th><th>优势</th><th>适合场景</th></tr>
    <tr><td>Arduino-ESP32</td><td>C++ / Arduino CLI</td><td>生态库丰富、上手快，<code class="inline">setup()</code> + <code class="inline">loop()</code> 心智负担低</td><td>教学、快速原型、创客项目（本课主线）</td></tr>
    <tr><td>ESP-IDF</td><td>C / CMake + Ninja + FreeRTOS</td><td>官方原生 SDK，可完整配置分区表、电源管理、双核亲和性</td><td>产品级开发、需要精细控制外设与低功耗</td></tr>
    <tr><td>MicroPython</td><td>Python / 固件 + REPL</td><td>交互式调试，无需编译，改一行立刻见效</td><td>课堂演示、传感器快速验证</td></tr>
  </table></div>
  <div class="callout note"><div class="ci">i</div><p>Arduino-ESP32 本质上是<b>把 ESP-IDF 封装成 Arduino API 的一个 FreeRTOS 应用</b>：你的 <code class="inline">loop()</code> 运行在 APP_CPU 上优先级为 1 的任务里，WiFi/BT 协议栈跑在 PRO_CPU 上。所以 Arduino 程序天然就是多任务的，理解这一点对实验 8 很重要。</p></div>
</div></div>

<div class="grid-2" style="margin-top:18px">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>构建流程：源码如何变成固件</h2></div><div class="card-body">
    <div class="flow"><span class="node">.ino / .cpp</span><span class="arrow">→</span><span class="node">预处理</span><span class="arrow">→</span><span class="node">xtensa 交叉编译</span></div>
    <div class="flow"><span class="node">目标文件 .o</span><span class="arrow">→</span><span class="node">链接 + 库 + 链接脚本</span><span class="arrow">→</span><span class="node hl">ELF → .bin 镜像</span></div>
    <div class="flow"><span class="node">esptool.py</span><span class="arrow">→</span><span class="node">UART0 下载模式</span><span class="arrow">→</span><span class="node">写入 Flash 分区</span></div>
    <ol class="clean">
      <li><b>预处理 / 编译：</b>由 <code class="inline">xtensa-esp32-elf-gcc</code> 生成 Xtensa 指令集的目标文件，与 PC 上的 x86 指令完全不同。</li>
      <li><b>链接：</b>把 Arduino 核心、FreeRTOS、WiFi 协议栈与你的代码按链接脚本放进 IRAM / DRAM / Flash。</li>
      <li><b>生成镜像：</b>加上 boot 头、分区表、校验和，形成 bootloader.bin / partitions.bin / app.bin。</li>
      <li><b>烧录：</b>esptool 通过 DTR/RTS 自动拉低 GPIO0 并复位 EN，芯片进入下载模式后按分区地址写入。</li>
      <li><b>运行：</b>复位 → 一级 ROM Bootloader → 二级 Bootloader → app 分区 → <code class="inline">setup()</code> / <code class="inline">loop()</code>。</li>
    </ol>
  </div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>Flash 分区表</h2></div><div class="card-body">
    <div class="table-wrap"><table class="tbl">
      <tr><th>分区</th><th>典型偏移</th><th>内容</th></tr>
      <tr><td>bootloader</td><td>0x1000</td><td>二级引导程序</td></tr>
      <tr><td>partition table</td><td>0x8000</td><td>各分区的类型、偏移与长度</td></tr>
      <tr><td>nvs</td><td>0x9000</td><td>键值对存储（WiFi 配网参数等）</td></tr>
      <tr><td>app0 / app1</td><td>0x10000</td><td>应用程序；双分区支持 OTA</td></tr>
      <tr><td>spiffs / littlefs</td><td>可变</td><td>网页、配置、日志等文件</td></tr>
    </table></div>
    <div class="callout tip"><div class="ci">✓</div><p>串口监视器 <b>115200 baud</b> 是 Arduino-ESP32 的默认日志波特率。启动时打印的 <code class="inline">rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)</code> 是判断硬件状态的第一手证据，实验报告里建议记录。</p></div>
  </div></div>
</div>

<h2 class="section-title">常见故障排查清单</h2>
<div class="card"><div class="card-body">
<div class="table-wrap"><table class="tbl">
  <tr><th>现象</th><th>最可能原因</th><th>排查动作</th></tr>
  <tr><td>Failed to connect / 一直等 <code class="inline">.....</code></td><td>未进入下载模式、USB 线只有供电、驱动未装</td><td>按住 BOOT 再点烧录；换数据线；设备管理器查看 CP2102 / CH340 端口</td></tr>
  <tr><td>反复重启、日志乱码</td><td>供电不足、Flash 电压设置错误、GPIO12 被拉高</td><td>换 USB 口或外接 5 V；检查 GPIO12 外围电路；降低 Flash 频率</td></tr>
  <tr><td>上传成功但程序不运行</td><td>GPIO0 被外部电路拉低、代码在 setup() 里阻塞</td><td>拔掉外设再上电；在 setup() 开头打印日志定位</td></tr>
  <tr><td>Guru Meditation / 看门狗复位</td><td>长时间关中断、ISR 内做了耗时操作、任务饿死</td><td>ISR 只置标志位；循环里加 <code class="inline">yield()</code> 或 <code class="inline">vTaskDelay(1)</code></td></tr>
  <tr><td>ADC 读数乱跳</td><td>浮空输入、使用了 ADC2 且开启 WiFi、未共地</td><td>换 ADC1 引脚；加 0.1 µF 电容；确认共地</td></tr>
</table></div>
</div></div>

<h2 class="section-title">第一段程序：结构解读</h2>
<div class="code-block">
  <div class="code-toolbar"><span class="fname">blink.ino</span><span class="lang">ARDUINO C++</span><span class="spacer"></span><button data-copy="code-intro">复制代码</button></div>
  <pre class="code" id="code-intro"><span class="c">// setup() 只执行一次：完成引脚方向、串口、外设初始化</span>
<span class="k">void</span> <span class="f">setup</span>() {
  <span class="f">pinMode</span>(<span class="n">2</span>, OUTPUT);          <span class="c">// GPIO2 设为推挽输出</span>
  <span class="f">Serial.begin</span>(<span class="n">115200</span>);       <span class="c">// UART0 日志，波特率 115200</span>
}

<span class="c">// loop() 由 FreeRTOS 任务反复调用，不要在其中长时间阻塞</span>
<span class="k">void</span> <span class="f">loop</span>() {
  <span class="f">digitalWrite</span>(<span class="n">2</span>, HIGH);
  <span class="f">delay</span>(<span class="n">500</span>);                 <span class="c">// 阻塞式延时，让出任务调度</span>
  <span class="f">digitalWrite</span>(<span class="n">2</span>, LOW);
  <span class="f">delay</span>(<span class="n">500</span>);
}</pre>
</div>
<div class="callout warn"><div class="ci">!</div><p><b>从 delay() 到 millis()：</b>单任务里 <code class="inline">delay()</code> 尚可接受，但一旦要同时做"按键响应 + 传感器采样 + 网络上报"，阻塞延时就会让其它逻辑饿死。实验 2 之后我们统一改用基于 <code class="inline">millis()</code> 的非阻塞状态机，这也是实验 8 多任务的前置训练。</p></div>`
  },

  report: {
    eyebrow: 'APPENDIX · 文档规范',
    title: '实验报告规范',
    lead: '报告不是把代码粘贴一遍，而是证明"你理解了自己观察到的现象"。下面给出统一模板与评分细则。',
    chips: ['模板', '评分标准', '常见扣分点'],
    html: `
<div class="grid-2">
  <div class="card"><div class="card-head"><span class="dot"></span><h2>统一模板（每个实验 1 份）</h2></div><div class="card-body">
    <ol class="clean">
      <li><b>实验名称、日期、所用硬件/软件版本</b>（板型、核心版本、框架版本）。</li>
      <li><b>实验目的</b>：一句话说明要验证的原理，不要抄实验指导书全文。</li>
      <li><b>原理简述</b>：画出电路 schematic（可用本页电路图截图），写出关键计算，如限流电阻、分压比、PWM 频率与分辨率关系。</li>
      <li><b>硬件连接</b>：引脚对照表（ESP32 引脚 ↔ 器件引脚）与实物接线照片。</li>
      <li><b>关键代码</b>：只贴核心片段，附必要注释；说明参数为何这样取。</li>
      <li><b>实验现象与数据</b>：波形截图、串口日志、测量表格（至少 3 组不同参数）。<b>必须注明测量方法与仪器</b>（本课程的仿真波形请标注"仿真"）。</li>
      <li><b>结果分析</b>：实测/仿真与理论的偏差及原因，例如 LED 亮度与占空比不线性、ADC 量化台阶、抖动持续时间分布。</li>
      <li><b>思考题</b>：逐题作答，鼓励给出验证方案而非猜测。</li>
      <li><b>问题与总结</b>：踩过的坑、排查过程、可改进点。</li>
    </ol>
    <div class="callout tip"><div class="ci">✓</div><p>本网页每个实验都提供<b>代码复制</b>与<b>波形可视化</b>，可直接截图放进"实验现象"；请同时记录你调节的参数值，让结果可复现。</p></div>
  </div></div>
  <div class="card"><div class="card-head"><span class="dot"></span><h2>评分标准（单次实验 100 分）</h2></div><div class="card-body">
    <div class="table-wrap"><table class="tbl">
      <tr><th>维度</th><th>分值</th><th>得分要点</th></tr>
      <tr><td>原理与计算</td><td>20</td><td>电路/时序分析正确，关键参数有推导</td></tr>
      <tr><td>接线与代码</td><td>25</td><td>引脚约束遵守、代码规范、非阻塞设计</td></tr>
      <tr><td>现象与数据</td><td>25</td><td>数据完整、标注清晰、多组对照</td></tr>
      <tr><td>分析与思考题</td><td>20</td><td>能解释偏差，有独立验证思路</td></tr>
      <tr><td>规范与诚实</td><td>10</td><td>结构完整、引用规范、如实标注仿真与实测</td></tr>
    </table></div>
    <h3 class="under">常见扣分点</h3>
    <ul class="clean">
      <li>只贴整段代码，没有电路与参数分析。</li>
      <li>把仿真波形说成示波器实测（<b>学术诚信问题，直接扣满分项</b>）。</li>
      <li>截图无坐标、无单位、无参数标注，无法复现。</li>
      <li>结论只有"实验成功"，没有误差与异常讨论。</li>
      <li>使用 GPIO6–11、ADC2 + WiFi 等冲突资源却未说明。</li>
      <li>多人报告文字与截图高度雷同，缺少个人调试记录。</li>
    </ul>
  </div></div>
</div>
<div class="card" style="margin-top:18px"><div class="card-head"><span class="dot"></span><h2>数据记录表模板</h2></div><div class="card-body">
  <div class="table-wrap"><table class="tbl">
    <tr><th>序号</th><th>自变量（参数）</th><th>理论预期</th><th>观测结果</th><th>相对偏差</th><th>备注 / 截图编号</th></tr>
    <tr><td>1</td><td>例：PWM 占空比 25%</td><td>平均电压 0.83 V</td><td>0.81 V</td><td>−2.4%</td><td>图 1，万用表 DC 档</td></tr>
    <tr><td>2</td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td></td><td></td><td></td><td></td></tr>
  </table></div>
  <p class="mini-note">提示：至少改变 3 次自变量并观察趋势，比单点测量更能说明你是否真的理解了规律。</p>
</div></div>`
  }
};

/* ---------------- 综合项目数据 ---------------- */
const PROJECT = {
  eyebrow: 'CAPSTONE · 综合项目',
  title: '智能环境监测站',
  lead: '把前面 9 个实验串成一台真正能长期运行的设备：采集温湿度与光照 → 本地显示 → WiFi 上报 MQTT → 越限告警 → 定时深度睡眠。',
  chips: ['需求 → 架构 → 状态机', '多模块集成', '异常处理', '45 min'],
  requirements: [
    ['R1', '每 5 s 采集 DHT22 温湿度与光敏电阻电压，做 5 点滑动平均'],
    ['R2', '本地 OLED 显示实时数值与 WiFi 状态，按键切换显示页'],
    ['R3', '通过 WiFi 连接 MQTT Broker，按 topic 发布 JSON 数据'],
    ['R4', '温度 > 30 °C 或湿度 > 80 % 时点亮告警 LED 并推送事件'],
    ['R5', '断网自动重连（指数退避），连续失败 5 次进入降级离线缓存'],
    ['R6', '电池供电时每 10 min 唤醒一次，其余时间进入 Deep Sleep'],
    ['R7', '看门狗保护：任何任务超过 30 s 无响应则重启并上报原因']
  ],
  modules: [
    { name: '采集层', use: '实验 4 / 7', pins: 'GPIO34 (ADC 光照)、GPIO4 (DHT22)', note: 'ADC1 + 单总线，避开 ADC2' },
    { name: '交互层', use: '实验 2 / 3', pins: 'GPIO5 (按键)、GPIO2 (LED)、I²C 21/22 (OLED)', note: '中断只置标志，主循环消抖' },
    { name: '网络层', use: '实验 6', pins: '内置 WiFi + MQTT', note: '独立任务，队列传递数据' },
    { name: '系统层', use: '实验 8 / 9', pins: 'FreeRTOS / RTC / 看门狗', note: '核心亲和性、睡眠唤醒源' }
  ]
};

/* ---------------- 题库 ---------------- */
const QUIZ = [
  { q: 'ESP32 的 GPIO 逻辑电平与供电规范，下列说法正确的是？',
    o: ['I/O 为 5 V 逻辑，可直接驱动 5 V 模块', 'I/O 为 3.3 V 逻辑，连接 5 V 器件需电平转换或分压', 'VIN 引脚是 3.3 V，可直接接 GPIO 做输入', '所有 GPIO 都能承受 12 V 输入'],
    a: 1, e: 'ESP32 芯片工作电压 2.3–3.6 V，I/O 为 3.3 V 逻辑。VIN 是 USB 的 5 V，绝不能接 GPIO。接 5 V 传感器必须分压或用双向电平转换。' },
  { q: '下列哪一组引脚属于"仅输入"，无法配置为输出？',
    o: ['GPIO 4 / 16 / 17', 'GPIO 34 / 35 / 36 / 39', 'GPIO 21 / 22 / 23', 'GPIO 0 / 2 / 15'],
    a: 1, e: 'GPIO34/35/36/39 只能输入，且没有内部上拉下拉。GPIO0/2/15 是 Strapping 引脚但仍可双向使用。' },
  { q: 'LED 串联 220 Ω 电阻接到 3.3 V GPIO，红光 LED 正向压降约 2.0 V，工作电流约为？',
    o: ['约 2 mA', '约 6 mA', '约 15 mA', '约 25 mA'],
    a: 1, e: 'I = (3.3 − 2.0) / 220 ≈ 5.9 mA，安全且亮度足够。若按 10 mA 设计，理论电阻约 130 Ω，工程上常取 220 Ω 留余量。' },
  { q: '关于 Strapping 引脚 GPIO12 (MTDI)，错误的做法是？',
    o: ['上电时保持低电平', '仅作为普通输出在启动后使用', '接一个上拉到 3.3 V 的按键', '在原理图上标注其启动约束'],
    a: 2, e: 'GPIO12 在复位时决定 Flash 工作电压。上电时被拉高会把 Flash 设为 1.8 V，导致 3.3 V Flash 启动失败，表现为反复重启。' },
  { q: '使用 INPUT_PULLUP 的按键（按下接地）并采用 FALLING 中断，按下瞬间引脚电平如何变化？',
    o: ['3.3 V → 0 V，产生下降沿', '0 V → 3.3 V，产生上升沿', '保持 3.3 V 不变', '变成高阻态'],
    a: 0, e: '上拉使空闲为高电平，按下把引脚短接到 GND，产生下降沿，因此用 FALLING 触发。' },
  { q: '机械按键消抖中，下列哪一项是 ISR（中断服务函数）里不推荐做的？',
    o: ['置一个 volatile 标志位', '记录发生时刻的时间戳', '调用 Serial.printf 打印日志并 delay(20)', '用队列发送一个事件'],
    a: 2, e: 'ISR 必须短小、非阻塞，不能调用可能加锁或阻塞的 API。Serial 打印与 delay 都可能引起看门狗复位或死锁，应把工作交给任务层。' },
  { q: 'ESP32 LEDC 使用 80 MHz APB 时钟，若 PWM 频率为 5 kHz，理论最大分辨率约为？',
    o: ['8 bit', '10 bit', '13 bit', '16 bit'],
    a: 2, e: '约束为 freq × 2^bits ≤ 80 MHz。80 MHz / 5 kHz = 16000，log2(16000) ≈ 13.97，故最大 13 bit（取整数且留余量）。频率越高，可用分辨率越低。' },
  { q: '标准舵机 50 Hz（周期 20 ms）控制中，1.5 ms 高电平脉宽通常对应？',
    o: ['0° ', '90°（中位）', '180°', '连续旋转'],
    a: 1, e: '常见舵机用 0.5 ms → 0°、1.5 ms → 90°、2.5 ms → 180°，即占空比约 2.5 %–12.5 % @50 Hz。' },
  { q: '开启 WiFi 后 ADC 读数变得不可靠，最合理的解释是？',
    o: ['WiFi 降低了 CPU 主频', 'ADC2 与 WiFi 驱动共用内部资源，ADC2 通道被占用', '参考电压被无线模块拉高到 5 V', '仅输入引脚不能用于 ADC'],
    a: 1, e: 'ESP32 的 ADC2 控制器被 WiFi 驱动占用，此时 ADC2 采样会失败/返回旧值。解决方法是改用 ADC1（GPIO32–36、39），或在采样前后关闭 WiFi。' },
  { q: 'I²C 总线为什么必须接上拉电阻？',
    o: ['为了提高通信速率到 MHz 级', '因为器件输出是开漏/开集，只能拉低，需要上拉产生高电平', '为了给从设备供电', '为了防止静电'],
    a: 1, e: 'SDA/SCL 为开漏结构，器件只能把总线拉低，高电平由上拉电阻产生。典型值 4.7 kΩ（多数模块已内置），总线电容大时需减小阻值。' },
  { q: '关于 SPI 与 I²C 的对比，下列说法正确的是？',
    o: ['I²C 是全双工、需要片选线', 'SPI 靠地址寻址，无需片选线', 'SPI 通常速率更高但需要 CS 线，I²C 只需两根线且靠地址寻址', '两者都不需要时钟线'],
    a: 2, e: 'SPI 是同步全双工、主机提供时钟、用 CS 选片，速率可达数十 MHz；I²C 两线、靠 7/10 位地址寻址、带 ACK，速率通常 100/400 kHz。两者都需要时钟线。' },
  { q: '关于 FreeRTOS 与 ESP32 低功耗，下列哪项错误？',
    o: ['Arduino 的 loop() 本身运行在一个 FreeRTOS 任务里', '高优先级任务就绪时会抢占低优先级任务', 'vTaskDelay() 会让任务进入阻塞态，让出 CPU', '进入 Deep Sleep 后 RAM 内容完整保留，程序从断点继续执行'],
    a: 3, e: 'Deep Sleep 会关闭 CPU 与大部分数字电源，仅 RTC 域保持，唤醒后相当于复位重新执行（可用 RTC_NOINIT 内存保存少量状态）。Light Sleep 才保持 RAM 并从断点继续。' },
  { q: '要把 0–12 V 的电池电压接入 ESP32 ADC（量程 0–3.3 V），合适的做法是？',
    o: ['直接接到 GPIO34', '串一个 220 Ω 电阻', '用 100 kΩ / 33 kΩ 分压并加滤波电容，再接 ADC1 引脚', '接到 VIN 引脚读取'],
    a: 2, e: '12 V × 33/(100+33) ≈ 2.98 V，落在量程内。大阻值分压可限制电流，配合 0.1 µF 电容与软件平均滤波可抑制噪声；务必选 ADC1 引脚并注意共地。' },
  { q: 'MQTT 中 ESP32 发布消息到 topic "lab/esp32/temp"，手机 App 想收到它，需要？',
    o: ['手机与 ESP32 直接建立 TCP 连接', '手机订阅同一 topic，两者连到同一 Broker', '把消息写入 ESP32 的 Flash', '把 topic 改成手机的 IP 地址'],
    a: 1, e: 'MQTT 是发布/订阅模型：发布者与订阅者互不直连，经 Broker 按 topic 分发。QoS、保留消息与遗嘱消息是可靠性设计的关键。' }
];
