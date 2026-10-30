// DRUMS
// Ритм-секвенсор на 16 шагов. Все звуки «морские» и в тональности голосов:
// • depth  — далёкий гул-бочка (D1), на каждый удар хор сирен чуть приседает
// • rush   — волна: шум, фильтр которого раскрывается и закрывается, панорама едет слева направо
// • drop   — стеклянная капля, высота из выбранной гаммы
// • bubble — пузырь, всплывающий на квинту вверх, тоже в гамме
// • ripple — лёгкий шум-«хэт», рябь по воде
// • shell  — сухой щелчок раковины: «малый барабан» с коротким тоном
// Капли и пузырьки идут через эхо на ту же долю '8n.', что и у голосов.

const drums = {
  bus: null,
  echo: null,
  tideFilter: null,
  tidePan: null,
  synths: {},
  cells: {},
  lastStep: 0,
  presets: null
}

const PRESET_NAMES = Object.keys(PRESET_LABELS)

function initDrums() {
  drums.bus = new Tone.Gain(1).connect(channels.D)
  drums.echo = new Tone.FeedbackDelay({
    delayTime: '8n.',
    feedback: 0.4,
    wet: 0.3
  }).connect(drums.bus)
  drums.tideFilter = new Tone.Filter({
    type: 'bandpass',
    frequency: 300,
    Q: 0.7
  })
  drums.tidePan = new Tone.Panner(0)
  drums.tideFilter.chain(drums.tidePan, drums.bus)

  const { synths } = drums

  synths.deep = new Tone.MembraneSynth({
    pitchDecay: 0.12,
    octaves: 2.5,
    volume: 2,
    envelope: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.5 }
  }).chain(new Tone.Filter(260, 'lowpass', -24), drums.bus)

  synths.tide = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    volume: -6,
    envelope: { attack: 0.9, decay: 1.4, sustain: 0, release: 1.2 }
  }).connect(drums.tideFilter)

  synths.drop = new Tone.Synth({
    oscillator: { type: 'sine' },
    volume: -8,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 }
  }).connect(drums.echo)

  synths.pop = new Tone.Synth({
    oscillator: { type: 'sine' },
    volume: -10,
    envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.05 }
  }).connect(drums.echo)

  synths.ripple = new Tone.NoiseSynth({
    noise: { type: 'white' },
    volume: -16,
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 }
  }).chain(new Tone.Filter(7000, 'highpass'), drums.bus)

  synths.shell = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    volume: -4,
    envelope: { attack: 0.001, decay: 0.11, sustain: 0 }
  }).chain(
    new Tone.Filter({ type: 'bandpass', frequency: 1900, Q: 1.1 }),
    drums.bus
  )

  synths.shellTone = new Tone.MembraneSynth({
    pitchDecay: 0.015,
    octaves: 1.5,
    volume: -10,
    envelope: { attack: 0.001, decay: 0.09, sustain: 0 }
  }).connect(drums.bus)

  new Tone.Sequence(playDrumStep, [...Array(16).keys()], '16n').start(0)
}

// Нота «из гаммы» для высоких звуков
function scaleFrequency(root, degrees) {
  return noteFor(root, pick(degrees)).toFrequency()
}

// time по умолчанию — «сейчас», чтобы кнопки названий звучали и вне секвенсора
const DRUM_SOUNDS = {
  Глубина: (time = Tone.immediate()) => {
    drums.synths.deep.triggerAttackRelease('D1', '4n', time)
    duckChoir(time)
  },

  Прилив: (time = Tone.immediate()) => {
    const { tideFilter, tidePan } = drums

    // Волна накатывает (фильтр раскрывается) и откатывается; панорама плывёт слева направо
    tideFilter.frequency.cancelScheduledValues(time)
    tideFilter.frequency.setValueAtTime(250, time)
    tideFilter.frequency.exponentialRampToValueAtTime(2200, time + 1)
    tideFilter.frequency.exponentialRampToValueAtTime(400, time + 2.6)
    tidePan.pan.cancelScheduledValues(time)
    tidePan.pan.setValueAtTime(-0.6, time)
    tidePan.pan.linearRampToValueAtTime(0.6, time + 2.6)
    drums.synths.tide.triggerAttackRelease(1, time)
  },

  Капля: (time = Tone.immediate()) => {
    const frequency = scaleFrequency('D6', [0, 1, 2, 3, 4])
    drums.synths.drop.triggerAttackRelease(
      frequency,
      0.02,
      time,
      randomBetween(0.5, 1)
    )
  },

  Пузырёк: (time = Tone.immediate()) => {
    const frequency = scaleFrequency('D5', [0, 1, 2, 3, 4])
    drums.synths.pop.triggerAttackRelease(
      frequency,
      0.1,
      time,
      randomBetween(0.6, 1)
    )
    drums.synths.pop.frequency.exponentialRampToValueAtTime(
      frequency * 1.5,
      time + 0.09
    )
  },

  Рябь: (time = Tone.immediate()) => {
    drums.synths.ripple.triggerAttackRelease(0.04, time, randomBetween(0.5, 1))
  },

  Ракушка: (time = Tone.immediate()) => {
    drums.synths.shell.triggerAttackRelease(0.1, time)
    drums.synths.shellTone.triggerAttackRelease('D3', 0.05, time)
  }
}

function playDrumStep(time, step) {
  if (!running.drums) return

  Object.keys(DRUM_SOUNDS).forEach((name) => {
    if (DRUM_PATTERN[name][step]) DRUM_SOUNDS[name](time)
  })

  Tone.getDraw().schedule(() => {
    Object.values(drums.cells).forEach((row) => {
      row[drums.lastStep].classList.remove('current')
      row[step].classList.add('current')
    })
    drums.lastStep = step
  }, time)
}

// Подставить готовый рисунок (x — удар, точка — пауза); дальше его можно править руками
function applyDrumPreset(title) {
  Object.keys(DRUM_SOUNDS).forEach((name) => {
    const text = (DRUM_PRESETS[title] || {})[name] || '.'.repeat(16)
    DRUM_PATTERN[name] = [...text].map((char) => (char === 'x' ? 1 : 0))

    drums.cells[name].forEach((cell, step) => {
      cell.classList.toggle('active', Boolean(DRUM_PATTERN[name][step]))
    })
  })
}

function setDrumsRunning(isRunning) {
  const button = document.getElementById('drumsToggle')

  running.drums = isRunning
  button.classList.toggle('active', isRunning)
  button.title = isRunning ? 'остановить ритм' : 'включить ритм'

  if (!isRunning) {
    Object.values(drums.cells).forEach((row) => {
      row.forEach((cell) => cell.classList.remove('current'))
    })
  }

  syncTransport()
}

function initDrumsUI() {
  const sequencer = document.getElementById('drums')

  Object.keys(DRUM_SOUNDS).forEach((name) => {
    const row = createElement('div', 'SequencerRow')

    createButton(row, {
      label: DRUM_LABELS[name],
      hint: 'послушать звук',
      className: 'RowButton',
      onClick: () => {
        Tone.start()
        DRUM_SOUNDS[name]()
      }
    })

    drums.cells[name] = DRUM_PATTERN[name].map((isOn, step) => {
      const classes = [
        'BeatButton',
        isOn ? 'active' : '',
        step % 4 === 0 ? 'downbeat' : ''
      ]

      const cell = createButton(row, {
        label: '',
        className: classes.filter(Boolean).join(' '),
        onClick: () => {
          DRUM_PATTERN[name][step] ^= 1
          cell.classList.toggle('active', Boolean(DRUM_PATTERN[name][step]))
          drums.presets.setActive(-1) // рисунок изменён руками — уже не «готовый»
        }
      })

      return cell
    })

    sequencer.appendChild(row)
  })

  drums.presets = createToggleButtonSet(
    document.getElementById('drumPresets'),
    {
      items: PRESET_NAMES.map((title) => ({
        name: PRESET_LABELS[title],
        hint: 'готовый рисунок ритма'
      })),
      onSelect: (index) => {
        if (index >= 0) applyDrumPreset(PRESET_NAMES[index])
      }
    }
  )

  document.getElementById('drumClear').addEventListener('click', () => {
    applyDrumPreset('Очистить')
    drums.presets.setActive(-1)
  })

  document.getElementById('drumsToggle').addEventListener('click', async () => {
    await Tone.start()
    setDrumsRunning(!running.drums)
  })
}
