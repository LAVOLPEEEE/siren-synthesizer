// STORY
// Композиция «the song of the sirens» — синтезатор играет её сам по кнопке на экране.
// Четыре главы, около 3,5 минуты:
//   I   descent    — погружение: ветер, сонар и одинокий кит, потом звон коралла
//   II  the siren  — вступает сирена, хор и спокойный ритм, музыка светлеет
//   III the storm  — целотонный лад, шторм в ритме, хор срывается на крик
//   IV  silence    — буря стихает, кит уплывает, остаётся эхо, всё растворяется
// События привязаны к тактам Transport, поэтому идут ровно в музыку.
// Все изменения видны в интерфейсе: шаги, пробирки, ручки, ползунки, лады.

// Ноты всей композиции: on — какие из 8 шагов звучат, degrees — высота ракушки (0 — низ, 7 — верх).
// Ноты выставляются один раз: мелодия меняется сама, когда меняется лад
// (lydian — светло, pentonika — нежно и грустно, whole-tone — тревожно).
const STORY_NOTES = {
  A: { on: [1, 0, 1, 1, 1, 0, 1, 0], degrees: [2, 2, 4, 5, 4, 4, 1, 1] },
  W: { on: [1, 0, 0, 0, 1, 0, 1, 0], degrees: [0, 0, 0, 0, 4, 4, 2, 2] },
  C: { on: [1, 0, 1, 0, 1, 0, 1, 0], degrees: [7, 7, 5, 5, 4, 4, 5, 5] }
}

// Звуки моря: ряд и звук в паре (−1 — тишина)
const SEA = { coast: 0, ship: 1, sky: 2, depth: 3, life: 4 }

// Сценарий: bar — такт, когда происходит событие
const STORY_SCRIPT = [
  // I · descent
  { bar: 0, run: () => showChapter('I', 'descent') },
  { bar: 0, run: () => setPadPair(SEA.sky, 0) }, // ветер
  { bar: 0, run: () => tween(topSliders.master, -4, 10) }, // плавно выходим из тишины
  { bar: 2, run: () => setPadPair(SEA.depth, 0) }, // сонар
  { bar: 4, run: () => tween(voiceControl('W', 'glissando'), 1.6, 8) },
  { bar: 8, run: () => setMute('C', false) }, // звон коралла
  { bar: 8, run: () => tween(voiceControl('C', 'echo'), 0.55, 6) },
  { bar: 12, run: () => tween(choir.sliders[0], 0.25, 8) }, // далёкий хор «а»

  // II · the siren
  { bar: 16, run: () => showChapter('II', 'the siren') },
  { bar: 16, run: () => setMute('A', false) },
  { bar: 16, run: () => startRhythm(0) }, // calm
  { bar: 20, run: () => tween(topSliders.tempo, 84, 8) },
  { bar: 20, run: () => tween(choir.sliders[0], 0.45, 6) },
  { bar: 20, run: () => setPadPair(SEA.sky, 1) }, // дождь
  { bar: 24, run: () => selectScale(0) }, // pentonika
  { bar: 24, run: () => startRhythm(1) }, // breeze
  { bar: 24, run: () => tween(voiceControl('A', 'vibration'), 0.3, 6) },
  { bar: 28, run: () => tween(choir.sliders[1], 0.4, 6) }, // хор «о»

  // III · the storm
  { bar: 32, run: () => showChapter('III', 'the storm') },
  { bar: 32, run: () => selectScale(2) }, // whole-tone
  { bar: 32, run: () => startRhythm(2) }, // storm
  { bar: 32, run: () => setPadPair(SEA.coast, 0) }, // прибой
  { bar: 32, run: () => tween(choir.controls.anxiety, 0.75, 14) },
  { bar: 34, run: () => tween(topSliders.tempo, 92, 6) },
  { bar: 36, run: () => setVoiceWave('A', 3) }, // sawtooth — голос сирены резче
  { bar: 36, run: () => tween(voiceControl('W', 'glissando'), 2, 4) },
  { bar: 40, run: () => tween(choir.sliders[2], 0.4, 4) }, // хор «у»

  // IV · silence
  { bar: 44, run: () => showChapter('IV', 'silence') },
  { bar: 44, run: () => tween(choir.controls.anxiety, 0, 6) },
  { bar: 44, run: () => selectScale(1) }, // lydian
  { bar: 44, run: () => setVoiceWave('A', 1) }, // снова triangle
  { bar: 44, run: () => startRhythm(0) },
  { bar: 44, run: () => tween(topSliders.tempo, 70, 8) },
  { bar: 48, run: () => setDrumsRunning(false) },
  { bar: 48, run: () => setPadPair(SEA.coast, -1) },
  { bar: 48, run: () => setPadPair(SEA.sky, -1) },
  { bar: 48, run: () => tween(choir.sliders[1], 0, 6) },
  { bar: 48, run: () => tween(choir.sliders[2], 0, 6) },
  { bar: 50, run: () => setMute('W', true) }, // кит уплывает
  { bar: 52, run: () => tween(voiceControl('C', 'echo'), 0.75, 6) },
  { bar: 52, run: () => tween(voiceControl('C', 'repetitions'), 0.85, 6) },
  { bar: 52, run: () => tween(choir.sliders[0], 0, 8) },
  { bar: 54, run: () => tween(topSliders.master, -40, 12) }, // растворяемся в тишине
  { bar: 60, run: () => stopStory(true) }
]

const story = {
  isPlaying: false,
  eventIds: [],
  button: null,
  title: null,
  savedMaster: -4
}

// HELPERS

function voiceControl(key, label) {
  return VOICES.find((voice) => voice.key === key).controls[label]
}

// Новые шаги и высоты нот — пробирки и кружки двигаются на глазах
function setVoicePattern(key, pattern) {
  const voice = VOICES.find((item) => item.key === key)

  pattern.on.forEach((isOn, index) => {
    voice.on[index] = isOn
    voice.cells[index].classList.toggle('active', Boolean(isOn))
    voice.sliders[index].setValue(pattern.degrees[index])
  })
}

function applyPatterns(patterns) {
  Object.entries(patterns).forEach(([key, pattern]) =>
    setVoicePattern(key, pattern)
  )
}

function setVoiceWave(key, index) {
  const voice = VOICES.find((item) => item.key === key)
  voice.waveSet.setActive(index)
  voice.synth.set({ oscillator: { type: WAVES[index].type } })
}

function startRhythm(presetIndex) {
  setDrumPreset(presetIndex)
  setDrumsRunning(true)
}

// Плавно «повернуть» ручку или ползунок за seconds секунд
function tween(control, target, seconds) {
  const from = control.getValue()
  const startedAt = performance.now()

  function step(now) {
    if (!story.isPlaying) return

    const t = Math.min(1, (now - startedAt) / (seconds * 1000))
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    control.setValue(from + (target - from) * eased)

    if (t < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

function showChapter(number, name) {
  story.title.innerHTML = `<small>${number}</small><span>${name}</span>`
  story.title.classList.remove('visible')
  void story.title.offsetWidth // перезапуск анимации
  story.title.classList.add('visible')
}

// START / STOP

// Тишина и исходные настройки перед началом
function resetForStory() {
  if (dj.isOn) stopDj()

  setVoicesRunning(false)
  setDrumsRunning(false)
  drums.presets.setActive(-1)
  pads.rows.forEach((_, rowIndex) => setPadPair(rowIndex, -1))
  choir.sliders.forEach((slider) => slider.setValue(0))
  choir.controls.anxiety.setValue(0)
  choir.controls.expanse.setValue(0.75)
  choir.controls.inTime.setValue(0.5)

  selectScale(1) // lydian
  topSliders.tempo.setValue(70)
  topSliders.master.setValue(-30)

  setVoiceWave('A', 1) // triangle
  setVoiceWave('W', 0) // sine
  setVoiceWave('C', 1) // triangle
  voiceControl('A', 'depth').setValue(0.8)
  voiceControl('A', 'echo').setValue(0.2)
  voiceControl('A', 'vibration').setValue(0.1)
  voiceControl('W', 'glissando').setValue(0.6)
  voiceControl('W', 'depth').setValue(0.5)
  voiceControl('C', 'brightness').setValue(0.8)
  voiceControl('C', 'echo').setValue(0.35)
  voiceControl('C', 'repetitions').setValue(0.5)

  applyPatterns(STORY_NOTES)

  // сначала поёт только кит
  setMute('W', false)
  setMute('A', true)
  setMute('C', true)
}

async function startStory() {
  await Tone.start()

  story.savedMaster = topSliders.master.getValue()
  resetForStory()
  story.isPlaying = true

  const transport = Tone.getTransport()
  transport.stop()

  story.eventIds = STORY_SCRIPT.map(({ bar, run }) =>
    transport.scheduleOnce((time) => {
      Tone.getDraw().schedule(() => {
        if (story.isPlaying) run()
      }, time)
    }, `${bar}:0:0`)
  )

  story.button.classList.add('active')
  $('span', story.button).textContent = 'stop the story'
  setVoicesRunning(true)
}

// finished — композиция доиграла до конца (громкость возвращаем, когда уже тихо)
function stopStory(finished = false) {
  const transport = Tone.getTransport()

  story.isPlaying = false
  story.eventIds.forEach((id) => transport.clear(id))
  story.eventIds = []

  setVoicesRunning(false)
  setDrumsRunning(false)
  pads.rows.forEach((_, rowIndex) => setPadPair(rowIndex, -1))
  choir.sliders.forEach((slider) => slider.setValue(0))
  ;['A', 'W', 'C'].forEach((key) => setMute(key, false))

  setTimeout(
    () => topSliders.master.setValue(story.savedMaster),
    finished ? 6000 : 0
  )

  story.title.classList.remove('visible')
  story.button.classList.remove('active')
  $('span', story.button).textContent = 'play the story'
}

function initStoryUI() {
  story.button = document.getElementById('storyButton')
  story.title = document.getElementById('storyTitle')

  story.button.addEventListener('click', () => {
    if (story.isPlaying) stopStory()
    else startStory()
  })
}
