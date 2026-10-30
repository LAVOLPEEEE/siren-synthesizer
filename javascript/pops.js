// POPS
// Пузыри на маленьком экране, которые можно лопать.
// Звук «плюп» — короткий синус, взлетающий вверх, и щелчок плёнки.
// Нота берётся из выбранной гаммы: большой пузырь звучит ниже, маленький — выше,
// поэтому лопанье всегда попадает в тональность музыки.

const pops = {
  synth: null,
  click: null,
  layer: null,
  max: 7
}

function initPops() {
  const output = new Tone.Gain(0.9).connect(engine.glue.node)
  output.connect(new Tone.Gain(0.35).connect(engine.sea.input))

  const echo = new Tone.FeedbackDelay({
    delayTime: '8n.',
    feedback: 0.25,
    wet: 0.2
  }).connect(output)

  pops.synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    volume: -4,
    envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.06 }
  }).connect(echo)

  pops.click = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.018, sustain: 0 }
  })
  pops.click.chain(new Tone.Filter(3500, 'highpass'), new Tone.Gain(0.3), echo)
}

function playPop(size) {
  const now = Tone.immediate()
  const degree = clamp(
    Math.round(7 - (size - 18) / 4.5 + randomBetween(-1, 1)),
    0,
    7
  )
  const frequency = noteFor('D5', degree).toFrequency()

  pops.synth.triggerAttackRelease(frequency, 0.1, now, 0.85)
  pops.synth.frequency.setValueAtTime(frequency * 0.8, now)
  pops.synth.frequency.exponentialRampToValueAtTime(frequency * 1.6, now + 0.09)
  pops.click.triggerAttackRelease(0.02, now, 0.7)
}

function spawnPopBubble() {
  if (pops.layer.childElementCount >= pops.max || document.hidden) return

  const size = randomBetween(18, 48)
  const bubble = createElement('button', 'pop-bubble', '<i></i>')
  bubble.type = 'button'
  bubble.title = 'лопни меня'
  bubble.setAttribute('aria-label', 'пузырь')

  bubble.style.left = `${randomBetween(6, 88)}%`
  bubble.style.setProperty('--size', `${Math.round(size)}px`)
  bubble.style.setProperty('--rise', `${randomBetween(8, 14)}s`)
  bubble.style.setProperty('--wobble', `${randomBetween(1.6, 3)}s`)
  bubble.style.setProperty('--drift', `${randomBetween(-25, 25)}px`)

  bubble.addEventListener('animationend', (event) => {
    if (event.animationName === 'popRise') bubble.remove()
  })

  bubble.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    if (bubble.classList.contains('popped')) return

    Tone.start()
    playPop(size)
    splashAt(bubble)
    bubble.classList.add('popped')
    setTimeout(() => bubble.remove(), 260)
  })

  pops.layer.appendChild(bubble)
}

// Брызги: колечко и капельки разлетаются из места, где лопнул пузырь
function splashAt(bubble) {
  const stage = screenView.stage
  const stageBox = stage.getBoundingClientRect()
  const box = bubble.getBoundingClientRect()
  const scale = stage.offsetWidth / stageBox.width // поправка на масштаб страницы
  const x = (box.left + box.width / 2 - stageBox.left) * scale
  const y = (box.top + box.height / 2 - stageBox.top) * scale
  const size = box.width * scale

  const ring = createElement('i', 'pop-ring')
  ring.style.cssText = `left: ${x}px; top: ${y}px; width: ${size}px; height: ${size}px`
  stage.appendChild(ring)
  setTimeout(() => ring.remove(), 500)

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.5
    const distance = size * randomBetween(0.7, 1.3)
    const drop = createElement('i', 'pop-drop')

    drop.style.cssText = `left: ${x}px; top: ${y}px`
    drop.style.setProperty(
      '--dx',
      `${(Math.cos(angle) * distance).toFixed(1)}px`
    )
    drop.style.setProperty(
      '--dy',
      `${(Math.sin(angle) * distance).toFixed(1)}px`
    )

    stage.appendChild(drop)
    setTimeout(() => drop.remove(), 520)
  }
}

function initPopsUI() {
  pops.layer = $('.pop-layer')

  for (let i = 0; i < 3; i++) setTimeout(spawnPopBubble, 300 + i * 700)

  // Новый пузырь каждые 0,9–2,2 с (если на экране их меньше семи)
  function scheduleNextBubble() {
    spawnPopBubble()
    setTimeout(scheduleNextBubble, randomBetween(900, 2200))
  }
  scheduleNextBubble()
}
