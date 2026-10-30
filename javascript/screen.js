// SCREEN
// Маленький экран: появляется тот, кто сейчас поёт.
// siren — сирена (мелодия siren или хор сирен), whale — кит, coral — ракушка с жемчужиной.
// Поют несколько — они вместе на одном экране.
// Кнопки whale / coral / siren под экраном горят, когда голос звучит; клик — выключить / включить голос.

const CAST = [
  { name: 'whale', keys: ['W'], image: 'assets/screen-whale.svg' },
  { name: 'siren', keys: ['A', 'V'], image: 'assets/screen-siren.svg' },
  { name: 'coral', keys: ['C'], image: 'assets/screen-shell.svg' }
]

// Расстановка персонажей: x, y — центр, w — ширина (в % меньшей стороны экрана)
const STAGE = {
  whale: { whale: { x: 50, y: 50, w: 78 } },
  siren: { siren: { x: 50, y: 52, w: 46 } },
  coral: { coral: { x: 50, y: 52, w: 60 } },
  'whale siren': {
    whale: { x: 66, y: 36, w: 58 },
    siren: { x: 30, y: 57, w: 38 }
  },
  'whale coral': {
    whale: { x: 40, y: 32, w: 66 },
    coral: { x: 68, y: 70, w: 42 }
  },
  'siren coral': {
    siren: { x: 31, y: 52, w: 40 },
    coral: { x: 71, y: 62, w: 42 }
  },
  'whale siren coral': {
    whale: { x: 62, y: 25, w: 56 },
    siren: { x: 27, y: 59, w: 34 },
    coral: { x: 72, y: 71, w: 36 }
  }
}

const screenView = {
  stage: null,
  actors: {},
  buttons: {},
  cast: ''
}

// Позиции — от центра экрана в cqmin (1 % меньшей стороны экрана),
// поэтому компания персонажей выглядит одинаково на узком, широком и квадратном экране
function placeActor(actor, spot) {
  actor.style.left = `calc(50% + ${spot.x - 50}cqmin)`
  actor.style.top = `calc(50% + ${spot.y - 50}cqmin)`
  actor.style.width = `${spot.w}cqmin`
}

function isMemberMuted(member) {
  return member.keys.every((key) => channels[key].mute)
}

function initScreenUI() {
  screenView.stage = document.getElementById('stage')

  CAST.forEach((member) => {
    const actor = createElement(
      'div',
      `actor actor-${member.name}`,
      `<div class="swim"><img src="${member.image}" alt="${member.name}" draggable="false" /></div>`
    )

    placeActor(actor, STAGE[member.name][member.name])
    screenView.stage.appendChild(actor)
    screenView.actors[member.name] = actor

    const button = document.getElementById(`cast-${member.name}`)
    screenView.buttons[member.name] = button

    button.addEventListener('click', () => {
      Tone.start()
      const muteNow = !isMemberMuted(member)
      member.keys.forEach((key) => setMute(key, muteNow))
    })
  })

  // Мелкие декоративные пузырьки, поднимающиеся со дна
  const bubbleBox = $('.screen-bubbles')

  for (let i = 0; i < 18; i++) {
    const bubble = createElement('i')
    const size = randomBetween(3, 12)

    bubble.style.left = `${Math.random() * 100}%`
    bubble.style.width = `${size}px`
    bubble.style.height = `${size}px`
    bubble.style.animationDuration = `${randomBetween(6, 14)}s`
    bubble.style.animationDelay = `${-Math.random() * 14}s`
    bubble.style.setProperty('--sway', `${randomBetween(-20, 20)}px`)

    bubbleBox.appendChild(bubble)
  }
}

// Вызывается каждый кадр: кто поёт → кнопки и персонажи
function updateScreen() {
  const singers = CAST.filter((member) => member.keys.some(isSinging)).map(
    (member) => member.name
  )
  const cast = singers.join(' ')

  CAST.forEach((member) => {
    const button = screenView.buttons[member.name]
    button.classList.toggle('active', singers.includes(member.name))
    button.classList.toggle('muted', isMemberMuted(member))
  })

  if (cast === screenView.cast) return
  screenView.cast = cast
  screenView.stage.classList.toggle('alive', singers.length > 0)

  CAST.forEach((member) => {
    const actor = screenView.actors[member.name]
    const spot = STAGE[cast] && STAGE[cast][member.name]

    // ушедший персонаж остаётся на последнем месте и просто тает
    actor.classList.toggle('visible', Boolean(spot))
    if (spot) placeActor(actor, spot)
  })
}
