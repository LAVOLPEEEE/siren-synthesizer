// MAIN
// Точка входа, как в ADC-GID-26-27: всё запускается после загрузки страницы.
// Сначала звук (initX), потом интерфейс (initXUI) — элементы управления
// сразу передают свои начальные значения в звук.

// Один цикл анимации на всю страницу: экран, волна и ноты из ракушек
function startAnimationLoop() {
  function frame(now) {
    updateScreen()
    drawWave()
    updateNotes(now)
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}

document.addEventListener('DOMContentLoaded', () => {
  initLayout()

  initEngine()
  initVoices()
  initChoir()
  initDrums()
  initPads()
  initPops()
  initRecorder()
  initDj()

  initVoicesUI()
  initMixerUI()
  initControlsUI()
  initChoirUI()
  initDrumsUI()
  initPadsUI()
  initRecorderUI()
  initScreenUI()
  initPopsUI()
  initWaveUI()
  initDjUI()
  initStoryUI()
  initEffectsUI()
  initWelcomeUI()

  startAnimationLoop()
})
