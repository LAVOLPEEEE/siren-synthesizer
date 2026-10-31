// VOICES
// Три мелодических голоса: siren, whale, coral.
// У каждого: синтезатор → цепочка эффектов → свой канал микшера.
// Первая ручка у всех — brightness: это и есть «простой фильтр» (ФНЧ).
// Кружок шага — включить/выключить шаг, «пробирка» под ним — высота ноты (ступень гаммы 0–7).
// Никакой клавиатуры пианино: мелодия собирается шагами, как в Ableton Learning Music.

// Срез фильтра: ручка 0–1 → частота от minHz до minHz × CUTOFF_RANGE
const cutoffHz = (minHz, value) => minHz * CUTOFF_RANGE ** value

function setCutoff(filter, minHz, value) {
  filter.frequency.rampTo(cutoffHz(minHz, value), 0.05, Tone.immediate())
}

// SIREN — тёплый «поющий» тон: три расстроенные волны, вибрато и хорус
function createSirenSound(output) {
  const reverb = new Tone.Reverb({ decay: 6, preDelay: 0.04, wet: 0.35 })
  const delay = new Tone.FeedbackDelay({
    delayTime: '8n.',
    feedback: 0.4,
    wet: 0.2
  })
  const chorus = new Tone.Chorus(1.8, 4.5, 0.6).start()
  const filter = new Tone.Filter(3000, 'lowpass', -24)
  const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.1 })

  const synth = new Tone.Synth({
    oscillator: { type: 'fattriangle', count: 3, spread: 14 },
    portamento: 0.12,
    envelope: { attack: 0.18, decay: 0.2, sustain: 0.7, release: 1.8 }
  })

  synth.chain(vibrato, filter, chorus, delay, reverb, output)

  const knobs = [
    {
      label: 'brightness',
      hint: 'фильтр: срез частот',
      min: 0,
      max: 1,
      value: 0.7,
      onChange: (v) => setCutoff(filter, 80, v)
    },
    {
      label: 'vibration',
      hint: 'вибрато: дрожь высоты',
      min: 0,
      max: 0.6,
      value: 0.1,
      onChange: (v) => glide(vibrato.depth, v)
    },
    {
      label: 'chorus',
      hint: 'хорус: эффект ансамбля',
      min: 0,
      max: 1,
      value: 0.3,
      onChange: (v) => glide(chorus.wet, v)
    },
    {
      label: 'echo',
      hint: 'эхо: повторы',
      min: 0,
      max: 0.8,
      value: 0.2,
      onChange: (v) => glide(delay.wet, v)
    },
    {
      label: 'depth',
      hint: 'реверберация: пространство',
      min: 0,
      max: 0.95,
      value: 0.35,
      onChange: (v) => glide(reverb.wet, v)
    }
  ]

  return { synth, knobs }
}

// WHALE — глубокий стон: расстроенные синусы, медленное «дыхание» высоты, длинный хвост
function createWhaleSound(output) {
  const reverb = new Tone.Reverb({ decay: 9, preDelay: 0.08, wet: 0.5 })
  const tremolo = new Tone.Tremolo(2, 0.8).start()
  const filter = new Tone.Filter(700, 'lowpass', -24)
  const moan = new Tone.Vibrato({ frequency: 0.35, depth: 0.05 })
  tremolo.wet.value = 0

  const synth = new Tone.Synth({
    oscillator: { type: 'fatsine', count: 2, spread: 8 },
    portamento: 0.6,
    envelope: { attack: 1, decay: 0.4, sustain: 0.8, release: 3 }
  })
  synth.volume.value = -1

  synth.chain(moan, filter, tremolo, reverb, output)

  const knobs = [
    {
      label: 'brightness',
      hint: 'фильтр: срез частот',
      min: 0,
      max: 1,
      value: 0.5,
      onChange: (v) => setCutoff(filter, 60, v)
    },
    {
      label: 'glissando',
      hint: 'скольжение между нотами',
      min: 0,
      max: 2,
      value: 0.6,
      onChange: (v) => (synth.portamento = v)
    },
    {
      label: 'shimmer',
      hint: 'тремоло: дрожь громкости',
      min: 0,
      max: 1,
      value: 0,
      onChange: (v) => glide(tremolo.wet, v)
    },
    {
      label: 'depth',
      hint: 'реверберация: пространство',
      min: 0,
      max: 0.95,
      value: 0.5,
      onChange: (v) => glide(reverb.wet, v)
    }
  ]

  return { synth, knobs }
}

// CORAL — стеклянный колокольчик: FM-синтез и пинг-понг эхо на ту же долю
function createCoralSound(output) {
  const reverb = new Tone.Reverb({ decay: 5, preDelay: 0.03, wet: 0.3 })
  const delay = new Tone.PingPongDelay({
    delayTime: '8n.',
    feedback: 0.5,
    wet: 0.35
  })
  const filter = new Tone.Filter(5000, 'lowpass', -12)

  const synth = new Tone.FMSynth({
    oscillator: { type: 'fattriangle', count: 2, spread: 8 },
    harmonicity: 3.01,
    modulationIndex: 5,
    envelope: { attack: 0.003, decay: 0.35, sustain: 0, release: 0.6 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.3 }
  })
  synth.volume.value = -6

  synth.chain(filter, delay, reverb, output)

  const knobs = [
    {
      label: 'brightness',
      hint: 'фильтр: срез частот',
      min: 0,
      max: 1,
      value: 0.8,
      onChange: (v) => setCutoff(filter, 80, v)
    },
    {
      label: 'echo',
      hint: 'эхо: повторы',
      min: 0,
      max: 0.8,
      value: 0.35,
      onChange: (v) => glide(delay.wet, v)
    },
    {
      label: 'repetitions',
      hint: 'сколько раз повторяется эхо',
      min: 0,
      max: 0.92,
      value: 0.5,
      onChange: (v) => glide(delay.feedback, v)
    },
    {
      label: 'depth',
      hint: 'реверберация: пространство',
      min: 0,
      max: 0.95,
      value: 0.3,
      onChange: (v) => glide(reverb.wet, v)
    }
  ]

  return { synth, knobs }
}

const VOICE_SOUNDS = {
  A: createSirenSound,
  W: createWhaleSound,
  C: createCoralSound
}

function initVoices() {
  VOICES.forEach((voice) => {
    const { synth, knobs } = VOICE_SOUNDS[voice.key](channels[voice.key])
    voice.synth = synth
    voice.knobs = knobs
    voice.lastStep = 0

    voice.sequence = new Tone.Sequence(
      (time, step) => playVoiceStep(voice, time, step),
      [...voice.on.keys()],
      voice.interval
    ).start(0)
  })
}

function playVoiceStep(voice, time, step) {
  if (!running.voices) return

  if (voice.on[step]) {
    const note = noteFor(voice.root, voice.degrees[step]).toNote()
    voice.synth.triggerAttackRelease(
      note,
      voice.length,
      time,
      0.7 + Math.random() * 0.3
    )

    // + хвост 1,4 с, чтобы персонаж на экране не мигал между нотами
    markSinging(voice.key, time, Tone.Time(voice.length).toSeconds() + 1.4)
  }

  Tone.getDraw().schedule(() => {
    voice.cells[voice.lastStep].classList.remove('current')
    voice.cells[step].classList.add('current')
    voice.lastStep = step
  }, time)
}

function initVoicesUI() {
  VOICES.forEach((voice) => {
    const panel = document.getElementById(`panel-${voice.key}`)

    voice.waveSet = createToggleButtonSet($('.wave-box', panel), {
      items: WAVES,
      activeIndex: WAVES.findIndex((wave) => wave.type === voice.wave),
      onSelect: (index) =>
        voice.synth.set({ oscillator: { type: WAVES[index].type } })
    })

    voice.cells = []
    voice.sliders = []

    voice.on.forEach((isOn, index) => {
      const step = createElement('div', 'Step')

      const cell = createButton(step, {
        label: `<img src="${ASSETS.sparkle}" alt="" />`,
        hint: `шаг ${index + 1}: вкл / выкл`,
        className: 'StepButton' + (isOn ? ' active' : ''),
        onClick: () => {
          voice.on[index] ^= 1
          cell.classList.toggle('active', Boolean(voice.on[index]))
        }
      })

      const slider = createSlider(step, {
        vertical: true,
        hint: `шаг ${index + 1}: высота ноты (ступень гаммы)`,
        min: 0,
        max: 7,
        step: 1,
        value: voice.degrees[index],
        format: (value) => `${noteFor(voice.root, value).toNote()} · ${value}`,
        onChange: (value) => (voice.degrees[index] = value)
      })

      $('.Steps', panel).appendChild(step)
      voice.cells.push(cell)
      voice.sliders.push(slider)
    })

    // ручки по названию — ими управляет композиция (story.js)
    voice.controls = {}
    voice.knobs.forEach((knob) => {
      voice.controls[knob.label] = createKnob($('.knobs', panel), knob)
    })
  })
}

// Новый случайный рисунок для всех трёх голосов (кнопка random и DJ)
function randomizeVoices() {
  VOICES.forEach((voice) => {
    voice.on.forEach((_, index) => {
      voice.on[index] = Math.random() < 0.65 ? 1 : 0
      voice.cells[index].classList.toggle('active', Boolean(voice.on[index]))
      voice.sliders[index].setValue(Math.floor(Math.random() * 8))
    })
  })
}
