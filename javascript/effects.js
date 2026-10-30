// EFFECTS
// Украшения страницы:
// • за курсором тянется шлейф пузырьков, по клику — горсть пузырьков;
// • когда играет музыка, из спиралей больших ракушек в шапке вылетают ноты —
//   чем громче звук, тем чаще.
// Если в системе включено «уменьшить движение», эффекты не запускаются.

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

const NOTE_SHAPES = [
  // восьмая
  '<svg viewBox="0 0 24 32"><path d="M10 4v17.2A5 5 0 1 0 13 26V10.5c3.2 1.1 5.5 3.4 6.2 6.8 1.6-5.8-2.6-9.6-9.2-13.3z" /></svg>',
  // две восьмые под ребром
  '<svg viewBox="0 0 32 32"><path d="M9 7.5 27 3v17.5a4.6 4.6 0 1 1-3-4.3V9.6L12 12.5v11a4.6 4.6 0 1 1-3-4.3z" /></svg>',
  // четверть
  '<svg viewBox="0 0 20 32"><path d="M12 3h2.6v20.5A5.2 5.2 0 1 1 12 19z" /></svg>',
  // две шестнадцатые
  '<svg viewBox="0 0 32 32"><path d="M9 7 27 3v17.5a4.6 4.6 0 1 1-3-4.3V12.4L12 15v8.5a4.6 4.6 0 1 1-3-4.3zm3 3.4 12-2.6V6.6L12 9.3z" /></svg>'
]

const effects = {
  trail: null,
  lastTrailAt: 0,
  notes: null,
  roses: [],
  nextNoteAt: 0,
  noteSide: 0
}

// CURSOR TRAIL

function addTrailBubble(x, y, isBig) {
  if (effects.trail.childElementCount > 30) return

  const size = isBig ? randomBetween(6, 16) : randomBetween(3, 10)
  const bubble = createElement('i')

  bubble.style.left = `${x + randomBetween(-6, 6)}px`
  bubble.style.top = `${y + randomBetween(-6, 6)}px`
  bubble.style.width = `${size}px`
  bubble.style.height = `${size}px`
  bubble.style.animationDuration = `${randomBetween(0.8, 1.5)}s`
  bubble.style.setProperty('--up', `${-randomBetween(30, 80)}px`)
  bubble.style.setProperty('--side', `${randomBetween(-15, 15)}px`)

  bubble.addEventListener('animationend', () => bubble.remove())
  effects.trail.appendChild(bubble)
}

function initCursorTrail() {
  effects.trail = createElement('div', 'cursor-trail')
  document.body.appendChild(effects.trail)

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return

    const now = performance.now()
    if (now - effects.lastTrailAt < 38) return

    effects.lastTrailAt = now
    addTrailBubble(event.clientX, event.clientY + 6, false)
  })

  window.addEventListener('pointerdown', (event) => {
    for (let i = 0; i < 5; i++)
      addTrailBubble(event.clientX, event.clientY, true)
  })
}

// NOTES FROM SHELLS

// Центр спирали ракушки — примерно 45 % ширины и 44 % высоты картинки (правая отражена)
function getSpiralCenter(side) {
  const rose = effects.roses[side]
  const fromLeft = side === 0 ? 0.45 : 0.55

  return [
    rose.offsetLeft + rose.offsetWidth * fromLeft,
    rose.offsetTop + rose.offsetHeight * 0.44
  ]
}

function launchNote(side, level) {
  if (effects.notes.childElementCount > 18) return

  const [x, y] = getSpiralCenter(side)
  const direction = side === 0 ? 1 : -1
  const size = randomBetween(28, 46) + level * 18
  const note = createElement('i', 'note', pick(NOTE_SHAPES))

  note.style.left = `${x}px`
  note.style.top = `${y}px`
  note.style.width = `${size}px`
  note.style.animationDuration = `${randomBetween(2.2, 3.8)}s`
  note.style.setProperty('--dx', `${direction * randomBetween(40, 210)}px`)
  note.style.setProperty('--dy', `${-randomBetween(50, 220)}px`)
  note.style.setProperty('--r0', `${randomBetween(-20, 20)}deg`)
  note.style.setProperty('--r1', `${randomBetween(-35, 35)}deg`)

  note.addEventListener('animationend', () => note.remove())
  effects.notes.appendChild(note)
}

// Вызывается каждый кадр
function updateNotes(now) {
  if (reducedMotion || document.hidden) return

  const level = clamp(wave.level * 1.6, 0, 1)
  if (level < 0.02 || now < effects.nextNoteAt) return

  effects.nextNoteAt = now + 380 - 260 * level + Math.random() * 140
  launchNote(effects.noteSide, level)
  effects.noteSide = 1 - effects.noteSide
}

function initEffectsUI() {
  effects.notes = $('.notes')
  effects.roses = [$('.rose-l'), $('.rose-r')]

  if (!reducedMotion) initCursorTrail()
}
