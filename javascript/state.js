// STATE
// Что сейчас играет, выбранная гамма и «кто поёт» для маленького экрана

const running = { voices: false, drums: false, sirens: false, pads: false }

let scaleIndex = 0

// Transport идёт, пока хоть что-то включено; иначе останавливаем и гасим подсветку шагов
function syncTransport() {
  const transport = Tone.getTransport()

  if (Object.values(running).some(Boolean)) {
    if (transport.state !== 'started') transport.start()
    return
  }

  transport.stop()
  document
    .querySelectorAll('.current')
    .forEach((cell) => cell.classList.remove('current'))
}

// Нота из ступени гаммы: корень + полутоны выбранной гаммы
function noteFor(root, degree) {
  return Tone.Frequency(root).transpose(SCALES[scaleIndex].steps[degree])
}

// singing[key] — момент (performance.now, мс), до которого голос звучит
const singing = { A: 0, W: 0, C: 0, V: 0 }

function markSinging(key, time, seconds) {
  Tone.getDraw().schedule(() => {
    singing[key] = Math.max(singing[key], performance.now() + seconds * 1000)
  }, time)
}

function isSinging(key) {
  return singing[key] > performance.now() && !channels[key].muted
}
