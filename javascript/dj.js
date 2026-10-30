// DJ
// Автопилот «DJ: имя». Включает всё сразу: три голоса, ритм, хор сирен и пару звуков моря,
// а дальше раз в 4 такта сам меняет мелодию, рисунок ритма, иногда гамму и звуки моря.
// Повторный клик выключает всё, что включил DJ.

const dj = {
  isOn: false,
  bars: 0
}

// Две случайные пары звуков моря звучат, остальные молчат
function shuffleSea() {
  const rows = [...pads.rows.keys()].sort(() => Math.random() - 0.5)

  rows.forEach((rowIndex, order) => {
    setPadPair(rowIndex, order < 2 ? pick([0, 1]) : -1)
  })
}

function setDrumPreset(index) {
  drums.presets.setActive(index)
  applyDrumPreset(PRESET_NAMES[index])
}

function startDj() {
  dj.isOn = true
  dj.bars = 0
  document.getElementById('dj').classList.add('active')

  randomizeVoices()
  setVoicesRunning(true)
  setDrumPreset(pick([1, 2, 3]))
  setDrumsRunning(true)
  choir.sliders[0].setValue(0.45)
  shuffleSea()
}

function stopDj() {
  dj.isOn = false
  document.getElementById('dj').classList.remove('active')

  setVoicesRunning(false)
  setDrumsRunning(false)
  choir.sliders.forEach((slider) => slider.setValue(0))
  pads.rows.forEach((_, rowIndex) => setPadPair(rowIndex, -1))
}

// Раз в 4 такта — новая мелодия, иногда новый ритм и гамма; раз в 8 тактов — новые звуки моря и хор
function changeDjMix() {
  if (!dj.isOn) return

  randomizeVoices()
  if (Math.random() < 0.6) setDrumPreset(pick([0, 1, 2, 3]))
  if (Math.random() < 0.25) selectScale(pick([0, 1, 2]))

  if (dj.bars % 8 === 0) {
    shuffleSea()

    choir.sliders.forEach((slider, index) => {
      const sings = index === 0 || Math.random() < 0.4
      slider.setValue(sings ? randomBetween(0.25, 0.6) : 0)
    })
  }
}

function initDj() {
  new Tone.Loop((time) => {
    if (!dj.isOn) return

    dj.bars += 1
    if (dj.bars % 4 === 0) Tone.getDraw().schedule(changeDjMix, time)
  }, '1m').start(0)
}

function initDjUI() {
  document.getElementById('dj').addEventListener('click', async () => {
    await Tone.start()

    if (dj.isOn) stopDj()
    else startDj()
  })
}
