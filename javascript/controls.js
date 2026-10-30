// CONTROLS
// Верх пульта: swim (старт/стоп голосов), random, гаммы и темп

const TEMPO = { min: 50, max: 160, value: 84 }

function setVoicesRunning(isRunning) {
  const swimButton = document.getElementById('swim')

  running.voices = isRunning
  swimButton.classList.toggle('active', isRunning)
  $('span', swimButton).textContent = isRunning ? 'stop' : 'swim'

  if (!isRunning) {
    VOICES.forEach((voice) => {
      voice.cells.forEach((cell) => cell.classList.remove('current'))
    })
  }

  syncTransport()
}

// Гаммы — три отдельные кнопки, из которых активна одна
function selectScale(index) {
  scaleIndex = index

  document.querySelectorAll('#scales .Button').forEach((button, i) => {
    button.classList.toggle('active', i === index)
  })
}

function initControlsUI() {
  document.getElementById('swim').addEventListener('click', async () => {
    await Tone.start()
    setVoicesRunning(!running.voices)
  })

  const randomButton = document.getElementById('random')

  randomButton.addEventListener('click', () => {
    randomizeVoices()
    randomButton.classList.add('flash')
    setTimeout(() => randomButton.classList.remove('flash'), 350)
  })

  SCALES.forEach((scale, index) => {
    createButton(document.getElementById('scales'), {
      label: scale.name,
      hint: scale.hint,
      className: 'Button' + (index === scaleIndex ? ' active' : ''),
      onClick: () => {
        Tone.start()
        selectScale(index)
      }
    })
  })

  // Темп — первый ползунок наверху; фильтр хора «дышит» в темпе, поэтому пересчитываем и его
  createSlider(document.getElementById('tempo'), {
    hint: 'темп (BPM)',
    min: TEMPO.min,
    max: TEMPO.max,
    step: 1,
    value: TEMPO.value,
    format: (value) => `${value} bpm`,
    onChange: (value) => {
      Tone.getTransport().bpm.value = value
      syncChoirToTempo()
    }
  })
}
