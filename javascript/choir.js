// CHOIR
// Хор сирен: шесть голосов с формантами гласных (А, О, У, а при тревоге — Э и И).
// Пилообразная волна проходит через четыре полосовых фильтра — так синтезатор «поёт гласную».
// Ползунки справа в панели siren: siren A / O / Y — громкость групп, anxiety — тревога,
// expanse — простор, in time — насколько хор уступает удару depth в ритме.

const choir = {
  alarm: 0, // anxiety 0–1
  duckDepth: 0.5, // in time 0–1
  groupLevels: [0, 0, 0],
  voices: [],
  sliders: [],
  driftDegree: 2, // общая ступень, вокруг которой поёт хор
  driftHold: 0, // сколько тактов держим текущую ступень
  bus: null,
  groupGains: [],
  distortion: null,
  pingPong: null,
  cave: null,
  duck: null,
  sweep: null
}

function initChoir() {
  choir.bus = new Tone.Gain(1)
  choir.distortion = new Tone.Distortion({ distortion: 0.8, wet: 0 })
  choir.pingPong = new Tone.PingPongDelay({
    delayTime: '8n.',
    feedback: 0.45,
    wet: 0.3
  })
  choir.cave = new Tone.Reverb({ decay: 12, preDelay: 0.07, wet: 0.7 })
  choir.duck = new Tone.Gain(1)

  const filter = new Tone.Filter(3000, 'lowpass')

  choir.bus.chain(
    choir.distortion,
    new Tone.Chorus(0.8, 7, 0.8).start(),
    new Tone.StereoWidener(0.85),
    choir.pingPong,
    filter,
    choir.cave,
    new Tone.Limiter(-3),
    choir.duck,
    channels.V
  )

  // Фильтр хора «дышит» в темпе: вдох-выдох за два такта
  choir.sweep = new Tone.LFO({ frequency: 0.2, min: 1600, max: 3900 })
    .connect(filter.frequency)
    .start()
  syncChoirToTempo()

  choir.groupGains = [0, 1, 2].map(() => new Tone.Gain(0).connect(choir.bus))

  // Раз в 1–4 такта хор сдвигается на 0–2 ступени — смена «аккорда» всегда на первую долю
  new Tone.Loop(() => {
    if (--choir.driftHold > 0) return
    choir.driftHold = pick([1, 2, 2, 4])
    choir.driftDegree = clamp(choir.driftDegree + pick([-2, -1, 0, 1, 2]), 0, 5)
  }, '1m').start(0)

  CHOIR.forEach(createChoirVoice)
}

function syncChoirToTempo() {
  choir.sweep.frequency.value = Tone.Time('1m').toFrequency() / 2
}

// Хор уступает место бочке: на удар depth громкость быстро проседает и возвращается
function duckChoir(time = Tone.immediate()) {
  const low = 1 - 0.7 * choir.duckDepth

  choir.duck.gain.cancelAndHoldAtTime(time)
  choir.duck.gain.linearRampToValueAtTime(low, time + 0.03)
  choir.duck.gain.linearRampToValueAtTime(1, time + 0.55)
}

function createChoirVoice(settings) {
  const oscillator = new Tone.Oscillator({
    type: 'sawtooth',
    frequency: settings.root
  })
  const breath = new Tone.Noise('pink')
  const breathGain = new Tone.Gain(0.05)
  const mix = new Tone.Gain(1)
  const envelope = new Tone.AmplitudeEnvelope({
    attack: 0.45,
    decay: 0.2,
    sustain: 0.85,
    release: 1.6
  })
  const output = new Tone.Gain(10)
  const panner = new Tone.Panner(0)

  oscillator.chain(new Tone.Filter(1700, 'lowpass', -12), mix)
  breath.chain(breathGain, mix)
  mix.connect(envelope)

  // Четыре параллельных полосовых фильтра = форманты гласной
  const formants = FORMANT_GAINS.map((gain, index) => {
    const band = new Tone.Filter({
      type: 'bandpass',
      frequency: VOWELS['А'][index],
      Q: 12
    })
    envelope.chain(band, new Tone.Gain(gain), output)
    return band
  })

  output.chain(panner, choir.groupGains[settings.group])

  // Вибрато, медленный дрейф высоты и дрейф по панораме.
  // Запускаются вместе с голосом: пока хор молчит, процессор на них не тратится
  const vibrato = new Tone.LFO({
    frequency: randomBetween(5, 5.8),
    min: -18,
    max: 18
  }).connect(oscillator.detune)
  const drift = new Tone.LFO({
    frequency: randomBetween(0.5, 1),
    min: -9,
    max: 9
  }).connect(oscillator.detune)
  const wander = new Tone.LFO({
    frequency: randomBetween(0.03, 0.12),
    min: -1,
    max: 1,
    phase: Math.random() * 360
  }).connect(panner.pan)

  const voice = {
    oscillator,
    breath,
    vibrato,
    modulators: [vibrato, drift, wander],
    group: settings.group,
    started: false
  }
  choir.voices.push(voice)

  let beatsLeft = 0

  new Tone.Loop((time) => {
    if (choir.groupLevels[settings.group] <= 0 || --beatsLeft > 0) return

    // Новая фраза — только на 1-ю или 3-ю долю такта, поэтому хор не «плывёт» мимо ритма
    const transport = Tone.getTransport()
    const quarter = Math.round(transport.getTicksAtTime(time) / transport.PPQ)

    if (quarter % 2 !== 0) {
      beatsLeft = 0
      return
    }

    // Иногда пауза
    if (Math.random() < 0.18) {
      beatsLeft = 2
      return
    }

    const { alarm } = choir

    // Ступень: общий дрейф + сдвиг голоса; при тревоге иногда ±1
    let degree = choir.driftDegree + settings.offset
    if (Math.random() < alarm * 0.7) degree += Math.random() < 0.5 ? -1 : 1
    degree = clamp(degree, 0, settings.maxDegree)
    const frequency = noteFor(settings.root, degree).toFrequency()

    // Крик — при сильной тревоге; иначе «своя» гласная или случайная
    const cry = alarm > 0.55 && Math.random() < (alarm - 0.5) * 0.6
    let vowel = Math.random() < 0.7 ? settings.vowel : pick(['А', 'О', 'У'])
    if (Math.random() < alarm * 0.5) vowel = pick(['Э', 'И'])
    if (cry) vowel = 'И'

    const shift = 1.05 + alarm * 0.1 + (cry ? 0.12 : 0)
    formants.forEach((band, index) => {
      band.frequency.rampTo(VOWELS[vowel][index] * shift, 0.25, time)
    })

    beatsLeft = cry ? 2 : pick(settings.lengths)
    oscillator.detune.rampTo(
      (Math.random() - 0.5) * (12 + 110 * alarm),
      0.3,
      time
    )
    vibrato.frequency.rampTo(cry ? 9.5 : 5 + alarm * 2.5, 0.2, time)
    breathGain.gain.rampTo(cry ? 0.35 : 0.05 + 0.1 * alarm, 0.1, time)
    envelope.attack = cry ? 0.05 : randomBetween(0.3, 0.7)

    if (cry) {
      oscillator.frequency.setValueAtTime(frequency, time)
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 2.2,
        time + 0.7
      )
    } else {
      oscillator.frequency.rampTo(
        frequency,
        alarm > 0.4 ? randomBetween(0.2, 1.5) : 0.2,
        time
      )
    }

    const duration = beatsLeft * Tone.Time('4n').toSeconds() * 0.95
    envelope.triggerAttackRelease(duration, time)
    markSinging('V', time, duration + 0.6)
  }, '4n').start(0)
}

// Генераторы группы запускаются один раз, дальше управляем только громкостью
function startChoirGroup(group) {
  choir.voices
    .filter((voice) => voice.group === group && !voice.started)
    .forEach((voice) => {
      voice.oscillator.start()
      voice.breath.start()
      voice.modulators.forEach((lfo) => lfo.start())
      voice.started = true
    })
}

function setChoirGroupLevel(group, level) {
  choir.groupLevels[group] = level

  if (level > 0) {
    Tone.start()
    startChoirGroup(group)
  }

  glide(
    choir.groupGains[group].gain,
    level > 0 ? Tone.dbToGain(-34 + 30 * level) : 0,
    0.1
  )
  running.sirens = choir.groupLevels.some((value) => value > 0)
  syncTransport()
}

function setChoirAlarm(level) {
  choir.alarm = level
  glide(choir.distortion.wet, level * level * 0.5)

  choir.voices.forEach((voice) => {
    voice.vibrato.min = -(18 + 60 * level)
    voice.vibrato.max = 18 + 60 * level
  })
}

// Чуть суше, чем раньше: ритм не тонет в реверберации
function setChoirExpanse(level) {
  glide(choir.cave.wet, 0.2 + 0.55 * level)
  glide(choir.pingPong.wet, 0.4 * level)
}

function initChoirUI() {
  const box = document.getElementById('choir')

  choir.sliders = SIREN_NAMES.map((name, group) =>
    createSlider(box, {
      label: name,
      hint: 'громкость группы хора',
      className: 'thin',
      onChange: (level) => setChoirGroupLevel(group, level)
    })
  )

  createSlider(box, {
    label: 'anxiety',
    hint: 'тревога: хор срывается на крик',
    className: 'thin',
    onChange: setChoirAlarm
  })
  createSlider(box, {
    label: 'expanse',
    hint: 'простор: пещера и эхо хора',
    className: 'thin',
    value: 0.6,
    onChange: setChoirExpanse
  })
  createSlider(box, {
    label: 'in time',
    hint: 'насколько хор уступает удару depth (0 — не уступает)',
    className: 'thin',
    value: choir.duckDepth,
    onChange: (level) => (choir.duckDepth = level)
  })
}
