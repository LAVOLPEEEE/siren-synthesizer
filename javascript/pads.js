// PADS
// Звуки моря — пять пар кнопок, в каждой паре звучит один звук из двух
// (нажал второй — первый плавно гаснет, повторный клик — тишина).
// • Непрерывные (ветер, дождь) — шумы, кнопка просто открывает их громкость.
// • Событийные (чайки, горн, буй, сонар, пузыри, дельфины, прибой, галька) — Tone.Loop
//   на общем Transport: события падают на доли такта и подчиняются темпу.
// • Всё тональное берёт высоту из выбранной гаммы и идёт через эхо на долю '8n.'.

const pads = {
  bus: null,
  send: null, // сюда подключаются тональные звуки (эхо)
  rows: [],
  all: [],
  switches: []
}

// «count четвертей» в секундах
const beat = (count) => count * Tone.Time('4n').toSeconds()

// Случайная нота из гаммы: ступени 0…maxDegree
function degreeFreq(root, maxDegree = 7) {
  return noteFor(
    root,
    Math.floor(Math.random() * (maxDegree + 1))
  ).toFrequency()
}

// Звук моря: out — его громкость; recipe.sources — непрерывные источники; every + play — события
function makePad(level, build) {
  const out = new Tone.Gain(0).connect(pads.bus)
  const recipe = build(out)
  const pad = {
    out,
    level,
    sources: recipe.sources || [],
    started: false,
    active: false
  }

  if (recipe.every) {
    // выключенный звук событий не создаёт
    new Tone.Loop((time) => {
      if (pad.active) recipe.play(time)
    }, recipe.every).start(0)
  }

  return pad
}

// Рецепты звуков: создаются в initPads(), когда движок уже готов
function createPadRows() {
  return [
    {
      title: 'Берег',
      items: [
        {
          hint: 'волна накатывает и откатывается каждые два такта; панорама едет слева направо',
          pad: makePad(0.9, (out) => {
            const wave = new Tone.NoiseSynth({
              noise: { type: 'pink' },
              envelope: { attack: 1.6, decay: 2.2, sustain: 0, release: 1.5 }
            })
            const body = new Tone.Filter({
              type: 'bandpass',
              frequency: 300,
              Q: 0.6
            })
            const pan = new Tone.Panner(0)
            wave.chain(body, pan, out)
            const foam = new Tone.NoiseSynth({
              noise: { type: 'white' },
              envelope: { attack: 1.8, decay: 1.6, sustain: 0, release: 1 }
            })
            foam.chain(
              new Tone.Filter(4200, 'highpass'),
              new Tone.Gain(0.18),
              pan
            )
            return {
              every: '2m',
              play(time) {
                const dir = Math.random() < 0.5 ? -1 : 1
                body.frequency.cancelScheduledValues(time)
                body.frequency.setValueAtTime(220, time)
                body.frequency.exponentialRampToValueAtTime(1800, time + 1.8)
                body.frequency.exponentialRampToValueAtTime(350, time + 4.4)
                pan.pan.setValueAtTime(-0.5 * dir, time)
                pan.pan.linearRampToValueAtTime(0.5 * dir, time + 4.4)
                wave.triggerAttackRelease(2.2, time)
                foam.triggerAttackRelease(1.4, time + 0.9)
              }
            }
          })
        },
        {
          hint: 'крики «ки-ау» на долях такта, высота из гаммы',
          pad: makePad(0.45, (out) => {
            const gull = new Tone.Synth({
              oscillator: { type: 'sawtooth' },
              envelope: {
                attack: 0.02,
                decay: 0.1,
                sustain: 0.6,
                release: 0.12
              }
            })
            const pan = new Tone.Panner(0)
            gull.chain(
              new Tone.Filter({ type: 'bandpass', frequency: 1900, Q: 1.2 }),
              new Tone.Vibrato(7, 0.2),
              pan,
              out
            )
            pan.connect(pads.send)
            return {
              every: '1m',
              play(time) {
                if (Math.random() > 0.5) return
                pan.pan.setValueAtTime(randomBetween(-0.7, 0.7), time)
                const start = time + pick([0, beat(1), beat(2)])
                const count = pick([2, 3, 3])
                const base = degreeFreq('D6', 4)
                for (let k = 0; k < count; k++) {
                  const t = start + k * 0.42
                  const f = base * randomBetween(0.96, 1.04)
                  gull.triggerAttack(f, t, randomBetween(0.6, 1))
                  gull.frequency.setValueAtTime(f, t)
                  gull.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.1)
                  gull.frequency.exponentialRampToValueAtTime(
                    f * 0.78,
                    t + 0.36
                  )
                  gull.triggerRelease(t + 0.38)
                }
              }
            }
          })
        }
      ]
    },
    {
      title: 'Корабль',
      items: [
        {
          hint: 'низкий туманный горн на D и A, на первой или третьей доле',
          pad: makePad(0.4, (out) => {
            const horn = new Tone.PolySynth(Tone.Synth, {
              oscillator: { type: 'sawtooth' },
              envelope: { attack: 0.12, decay: 0.1, sustain: 0.9, release: 0.9 }
            })
            horn.chain(new Tone.Filter(380, 'lowpass', -24), out)
            horn.connect(pads.send)
            return {
              every: '2m',
              play(time) {
                if (Math.random() > 0.7) return
                const start = time + pick([0, beat(2)])
                horn.triggerAttackRelease(['D2', 'A2'], beat(2.5), start, 0.7)
                if (Math.random() < 0.3)
                  horn.triggerAttackRelease(
                    ['D2', 'A2'],
                    beat(1),
                    start + beat(3.5),
                    0.6
                  )
              }
            }
          })
        },
        {
          hint: 'колокол на волне: редкие удары, ноты из гаммы, длинное эхо',
          pad: makePad(0.55, (out) => {
            const bell = new Tone.FMSynth({
              harmonicity: 2.4,
              modulationIndex: 7,
              envelope: { attack: 0.002, decay: 1.8, sustain: 0, release: 2 },
              modulation: { type: 'sine' },
              modulationEnvelope: {
                attack: 0.002,
                decay: 0.9,
                sustain: 0,
                release: 0.5
              }
            })
            const pan = new Tone.Panner(0)
            bell.chain(new Tone.Filter(3200, 'lowpass', -12), pan, out)
            pan.connect(pads.send)
            return {
              every: '2n',
              play(time) {
                if (Math.random() > 0.45) return
                pan.pan.setValueAtTime(randomBetween(-0.5, 0.5), time)
                bell.triggerAttackRelease(
                  degreeFreq('D4', 5),
                  0.05,
                  time,
                  randomBetween(0.5, 0.9)
                )
              }
            }
          })
        }
      ]
    },
    {
      title: 'Небо',
      items: [
        {
          hint: 'порывы ветра в снастях: полоса шума и медленная панорама',
          pad: makePad(0.7, (out) => {
            const noise = new Tone.Noise('pink')
            const band = new Tone.Filter({
              type: 'bandpass',
              frequency: 600,
              Q: 3
            })
            const gust = new Tone.Gain(0)
            const pan = new Tone.Panner(0)
            noise.chain(band, gust, pan, out)
            const sweep = new Tone.LFO(0.07, 350, 1400)
            const swell = new Tone.LFO(0.11, 0.25, 1)
            const drift = new Tone.LFO(0.05, -0.6, 0.6)
            sweep.connect(band.frequency)
            swell.connect(gust.gain)
            drift.connect(pan.pan)
            return { sources: [noise, sweep, swell, drift] }
          })
        },
        {
          hint: 'шум дождя по воде плюс редкие капли в гамме, падающие на доли',
          pad: makePad(0.65, (out) => {
            const noise = new Tone.Noise('white')
            noise.chain(
              new Tone.Filter(1800, 'highpass'),
              new Tone.Filter(9000, 'lowpass'),
              new Tone.Gain(0.3),
              out
            )
            const drop = new Tone.Synth({
              oscillator: { type: 'sine' },
              envelope: {
                attack: 0.001,
                decay: 0.09,
                sustain: 0,
                release: 0.05
              }
            })
            drop.volume.value = -6
            drop.connect(out)
            drop.connect(pads.send)
            return {
              sources: [noise],
              every: '16n',
              play(time) {
                if (Math.random() > 0.28) return
                drop.triggerAttackRelease(
                  degreeFreq('D5'),
                  0.01,
                  time,
                  randomBetween(0.3, 0.8)
                )
              }
            }
          })
        }
      ]
    },
    {
      title: 'Глубина',
      items: [
        {
          hint: 'пинг подводной лодки: две ноты гаммы и эхо на долю',
          pad: makePad(0.5, (out) => {
            const ping = new Tone.Synth({
              oscillator: { type: 'sine' },
              envelope: { attack: 0.003, decay: 1.4, sustain: 0, release: 0.4 }
            })
            ping.connect(out)
            ping.connect(pads.send)
            return {
              every: '1m',
              play(time) {
                if (Math.random() > 0.75) return
                const start = time + pick([0, beat(2)])
                ping.triggerAttackRelease(
                  noteFor('D5', 0).toFrequency(),
                  0.05,
                  start,
                  0.8
                )
                ping.triggerAttackRelease(
                  noteFor('D5', 2).toFrequency(),
                  0.05,
                  start + beat(1.5),
                  0.4
                )
              }
            }
          })
        },
        {
          hint: 'всплывающие пузырьки пачками на восьмых, высота из гаммы',
          pad: makePad(0.55, (out) => {
            const bubble = new Tone.Synth({
              oscillator: { type: 'sine' },
              envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.04 }
            })
            bubble.connect(out)
            bubble.connect(pads.send)
            return {
              every: '8n',
              play(time) {
                if (Math.random() > 0.35) return
                const count = 2 + Math.floor(Math.random() * 4)
                for (let k = 0; k < count; k++) {
                  const t = time + k * 0.09
                  const f = degreeFreq('D4') * 2
                  bubble.triggerAttackRelease(
                    f,
                    0.08,
                    t,
                    randomBetween(0.4, 0.9)
                  )
                  bubble.frequency.exponentialRampToValueAtTime(
                    f * 1.6,
                    t + 0.07
                  )
                }
              }
            }
          })
        }
      ]
    },
    {
      title: 'Жизнь',
      items: [
        {
          hint: 'щёлканье и свист со скольжением, на третьей доле',
          pad: makePad(0.4, (out) => {
            const whistle = new Tone.Synth({
              oscillator: { type: 'sine' },
              envelope: {
                attack: 0.01,
                decay: 0.05,
                sustain: 0.8,
                release: 0.06
              }
            })
            const pan = new Tone.Panner(0)
            whistle.chain(pan, out)
            pan.connect(pads.send)
            const clicks = new Tone.NoiseSynth({
              noise: { type: 'white' },
              envelope: { attack: 0.001, decay: 0.012, sustain: 0 }
            })
            clicks.chain(
              new Tone.Filter(5000, 'highpass'),
              new Tone.Gain(0.5),
              pan
            )
            return {
              every: '2m',
              play(time) {
                if (Math.random() > 0.6) return
                pan.pan.setValueAtTime(randomBetween(-0.6, 0.6), time)
                const start = time + beat(2)
                for (let k = 0; k < 6; k++)
                  clicks.triggerAttackRelease(
                    0.01,
                    start + k * 0.04,
                    randomBetween(0.5, 1)
                  )
                const base = degreeFreq('D6', 4)
                const calls = pick([2, 3])
                for (let k = 0; k < calls; k++) {
                  const t = start + 0.35 + k * 0.5
                  whistle.triggerAttack(
                    base * randomBetween(0.95, 1.05),
                    t,
                    0.6
                  )
                  whistle.frequency.setValueAtTime(base, t)
                  whistle.frequency.exponentialRampToValueAtTime(
                    base * 1.7,
                    t + 0.22
                  )
                  whistle.frequency.exponentialRampToValueAtTime(
                    base * 1.25,
                    t + 0.4
                  )
                  whistle.triggerRelease(t + 0.42)
                }
              }
            }
          })
        },
        {
          hint: 'шорох гальки в отходящей волне: ритмичный шум на шестнадцатых',
          pad: makePad(0.5, (out) => {
            const grain = new Tone.NoiseSynth({
              noise: { type: 'white' },
              envelope: { attack: 0.001, decay: 0.022, sustain: 0 }
            })
            const pan = new Tone.Panner(0)
            grain.chain(
              new Tone.Filter({ type: 'bandpass', frequency: 3200, Q: 1.5 }),
              pan,
              out
            )
            return {
              every: '16n',
              play(time) {
                // вероятность плавно качается — как накат и отлив волны
                const wave = 0.5 + 0.5 * Math.sin(time * 0.8)
                if (Math.random() > 0.12 + 0.5 * wave) return
                pan.pan.setValueAtTime(randomBetween(-0.5, 0.5), time)
                grain.triggerAttackRelease(0.02, time, randomBetween(0.3, 1))
              }
            }
          })
        }
      ]
    }
  ]
}

function initPads() {
  pads.bus = new Tone.Gain(1).connect(channels.P)
  const echo = new Tone.FeedbackDelay({
    delayTime: '8n.',
    feedback: 0.35,
    wet: 1
  }).connect(pads.bus)
  pads.send = new Tone.Gain(0.4).connect(echo)

  pads.rows = createPadRows()
  pads.all = pads.rows.flatMap((row) => row.items.map((item) => item.pad))
}

function setPad(pad, isOn) {
  if (isOn && !pad.started) {
    pad.sources.forEach((source) => source.start())
    pad.started = true
  }

  pad.active = isOn
  glide(pad.out.gain, isOn ? pad.level : 0, isOn ? 0.5 : 0.8)
}

// Включить звук index в паре rowIndex (−1 — тишина)
function selectPad(rowIndex, index) {
  pads.rows[rowIndex].items.forEach((item, i) => setPad(item.pad, i === index))
  running.pads = pads.all.some((pad) => pad.active)
  syncTransport()
}

// То же, но вместе с кнопками — для DJ
function setPadPair(rowIndex, index) {
  pads.switches[rowIndex].setActive(index)
  selectPad(rowIndex, index)
}

function initPadsUI() {
  pads.switches = pads.rows.map((row, rowIndex) => {
    const [title, ...names] = PAD_LABELS[row.title]
    const box = createElement(
      'div',
      'pad-row',
      `<span class="pad-title">${title}</span>`
    )

    const toggleSet = createToggleButtonSet(box, {
      items: row.items.map((item, i) => ({ name: names[i], hint: item.hint })),
      allowEmpty: true,
      className: 'pair',
      onSelect: (index) => selectPad(rowIndex, index)
    })

    document.getElementById('pads').appendChild(box)
    return toggleSet
  })
}
