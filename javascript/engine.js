// ENGINE
// Общий звук: мастер, лимитер, «клей»-компрессор, общий «океан» (реверберация)
// и каналы микшера. Все голоса живут в одном пространстве, как хор сирен.
//
// Путь звука: голос → канал → компрессор → мастер → лимитер → колонки
//                       ↘ отправка в «океан» ↗

const engine = {
  wasRunning: false,
  // Буфер побольше и планирование нот на 0,25 с вперёд —
  // если страница на миг задумается, звук не заикается и не щёлкает
  context: { latencyHint: 'playback', lookAhead: 0.25 },
  master: { volume: -4, node: null },
  limiter: { threshold: -2, node: null },
  // Срезаем инфра-бас и чуть приглушаем низ: встроенные динамики ноутбука его не тянут,
  // хрипят («пукают»), а MacBook при перегрузе басом может на миг заглушить звук
  lowCut: { type: 'highpass', frequency: 45, rolloff: -24, node: null },
  lowShelf: { type: 'lowshelf', frequency: 140, gain: -4, node: null },
  analyser: { type: 'waveform', size: 2048, node: null },
  glue: { threshold: -20, ratio: 2.5, attack: 0.03, release: 0.25, node: null },
  sea: {
    send: 0.6,
    cutoff: 2800,
    reverb: { decay: 9, preDelay: 0.06, wet: 1 },
    breath: { frequency: 0.06, min: 0.35, max: 0.85 },
    input: null
  }
}

// pan — панорама, send — сколько звука канал отдаёт в общий «океан»
const CHANNELS = {
  A: { name: 'siren', pan: -0.3, send: 0.35 },
  W: { name: 'whale', pan: 0, send: 0.5 },
  C: { name: 'coral', pan: 0.3, send: 0.4 },
  V: { name: 'sirens', pan: 0, send: 0.12 },
  D: { name: 'rhythm', pan: 0, send: 0.45 },
  P: { name: 'sounds of the sea', pan: 0, send: 0.4 }
}

const channels = {}

function initEngine() {
  // Важно: после смены движка используем Tone.getTransport() / getDraw() / getDestination(),
  // а не Tone.Transport / Tone.Draw / Tone.Destination — те привязаны к прежнему движку
  // Движок строим на обычном AudioContext браузера. Без этого Tone.js оборачивает его
  // в standardized-audio-context, который при КАЖДОЙ ноте перебирает все пути
  // по звуковой цепочке (проверка на петли). Со временем это забивает браузер,
  // ноты перестают успевать планироваться — и звук пропадает
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  Tone.setContext(
    new Tone.Context({
      context: new AudioContextClass({
        latencyHint: engine.context.latencyHint
      }),
      lookAhead: engine.context.lookAhead
    }),
    true
  )

  engine.master.node = new Tone.Volume(engine.master.volume)
  engine.limiter.node = new Tone.Limiter(engine.limiter.threshold)
  engine.analyser.node = new Tone.Analyser(
    engine.analyser.type,
    engine.analyser.size
  )
  engine.glue.node = new Tone.Compressor(engine.glue).connect(
    engine.master.node
  )

  engine.lowCut.node = new Tone.Filter(engine.lowCut)
  engine.lowShelf.node = new Tone.Filter(engine.lowShelf)

  engine.master.node.chain(
    engine.lowCut.node,
    engine.lowShelf.node,
    engine.limiter.node,
    Tone.getDestination()
  )
  engine.master.node.connect(engine.analyser.node)

  initSea()
  initChannels()
  keepAudioAlive()
}

// Браузер может сам «усыпить» звук: при сворачивании вкладки, блокировке экрана,
// подключении наушников или звонке (особенно Safari и телефоны). Тогда звук пропадает
// насовсем, пока страницу не перезагрузить. Здесь мы будим его при первой возможности
function keepAudioAlive() {
  const context = Tone.getContext().rawContext

  const wake = () => {
    if (context.state !== 'running' && engine.wasRunning) {
      context.resume()
    }
  }

  context.addEventListener('statechange', () => {
    if (context.state === 'running') engine.wasRunning = true
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake()
  })
  window.addEventListener('focus', wake)
  window.addEventListener('pointerdown', wake, true)
  window.addEventListener('keydown', wake, true)
}

// Общий океан: тёмная большая реверберация, которая медленно «дышит»
function initSea() {
  const { sea } = engine
  sea.input = new Tone.Gain(sea.send)

  sea.input.chain(
    new Tone.Filter(sea.cutoff, 'lowpass', -12),
    new Tone.Reverb(sea.reverb),
    engine.master.node
  )

  new Tone.LFO(sea.breath).connect(sea.input.gain).start()
}

// Отправка в океан идёт после громкости канала, поэтому mute и solo работают и для неё
function initChannels() {
  Object.entries(CHANNELS).forEach(([key, { pan, send }]) => {
    const channel = new Tone.Channel({ volume: -6, pan }).connect(
      engine.glue.node
    )
    channel.chain(new Tone.Gain(send), engine.sea.input)
    channels[key] = channel
  })
}
