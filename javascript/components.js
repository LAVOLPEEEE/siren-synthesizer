// COMPONENTS
// Элементы управления в «морском» дизайне. Названия классов — как в ZakharDay/synth-controls:
// Button, ToggleButtonSet / ToggleButton, Knob, Slider.
// Состояние «включено» у всех элементов — класс active.

const ASSETS = {
  scallop: 'assets/scallop.svg',
  knobShell: 'assets/knob-shell-open.svg',
  tubeBubbles: 'assets/tube-bubbles.svg',
  sparkle: 'assets/sparkle.svg'
}

// BUTTON

function createButton(
  parent,
  { label, hint = '', className = 'Button', onClick }
) {
  const button = createElement('button', className, `<span>${label}</span>`)
  button.type = 'button'
  button.title = hint
  button.addEventListener('click', onClick)
  parent.appendChild(button)

  return button
}

// TOGGLE BUTTON SET
// Полоска, в которой активна одна кнопка (sine / triangle / square / sawtooth).
// allowEmpty — повторный клик по активной кнопке выключает её (пары звуков моря).

function createToggleButtonSet(
  parent,
  { items, activeIndex = -1, allowEmpty = false, className = '', onSelect }
) {
  const set = createElement('div', `ToggleButtonSet ${className}`.trim())
  set.style.setProperty('--count', items.length)
  set.appendChild(createElement('i', 'glider'))

  let current = -1

  const buttons = items.map((item, index) =>
    createButton(set, {
      label: item.name,
      hint: item.hint,
      className: 'ToggleButton',
      onClick: () => {
        Tone.start()
        const next = allowEmpty && index === current ? -1 : index
        setActive(next)
        onSelect(next)
      }
    })
  )

  function setActive(index) {
    current = index

    buttons.forEach((button, i) => {
      button.classList.toggle('active', i === index)
    })

    set.classList.toggle('empty', index < 0)
    if (index >= 0) set.style.setProperty('--index', index)
  }

  setActive(activeIndex)
  parent.appendChild(set)

  return { setActive, getActive: () => current, element: set }
}

// KNOB
// Ракушка с жемчужиной на кольце. Тянем вверх/вниз или крутим колесом,
// двойной клик — значение по умолчанию, стрелки на клавиатуре — шаг.
// Чем сильнее повёрнута ручка, тем ярче светится жемчужина.

let knobCount = 0

// Точка на кольце: 0° — вверх, по часовой стрелке
function ringPoint(angle, radius = 44) {
  const radians = (angle * Math.PI) / 180
  return [50 + radius * Math.sin(radians), 50 - radius * Math.cos(radians)]
}

// Цвет жемчужины: t = 0 — тусклая, t = 1 — сияющая
function paintPearl(pearl, t) {
  const mix = (from, to) => Math.round(from + (to - from) * t)
  const core = `rgb(${mix(172, 255)}, ${mix(198, 255)}, ${mix(222, 255)})`
  const rim = `rgb(${mix(128, 200)}, ${mix(162, 238)}, ${mix(196, 255)})`
  const innerGlow = `0 0 ${1 + 9 * t}px ${0.5 + 3 * t}px rgba(255, 255, 255, ${0.25 + 0.75 * t})`
  const outerGlow = `0 0 ${2 + 22 * t}px ${4 * t}px rgba(120, 220, 255, ${0.85 * t})`

  pearl.style.background = `radial-gradient(circle at 36% 32%, #fff 0%, ${core} ${28 + 22 * t}%, ${rim} 100%)`
  pearl.style.boxShadow = `${innerGlow}, ${outerGlow}`
  pearl.style.opacity = 0.75 + 0.25 * t
}

// bipolar — ручка «из центра в обе стороны» (панорама): жемчужина ярче к краям
function createKnob(
  parent,
  {
    label,
    hint = '',
    min,
    max,
    value,
    size = 'small',
    bipolar = false,
    onChange
  }
) {
  const gradientId = `knobGradient${knobCount++}`
  const knob = createElement('div', `Knob ${size}`)
  knob.title = hint
  knob.innerHTML = `
    <div class="dial" tabindex="0" role="slider" aria-label="${label}">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="${gradientId}" x1="0.25" y1="0" x2="0.75" y2="1">
            <stop offset="0" stop-color="#5fc4fb" />
            <stop offset="0.45" stop-color="#86d8fb" />
            <stop offset="0.78" stop-color="#d2f2fe" />
            <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <circle class="ring" cx="50" cy="50" r="44" stroke="url(#${gradientId})" />
        <circle class="dot" r="7" cx="50" cy="6" />
      </svg>
      <div class="shell">
        <img src="${ASSETS.knobShell}" alt="" draggable="false" />
        <i class="pearl"></i>
      </div>
    </div>
    <b>${label}</b>`

  const dial = $('.dial', knob)
  const dot = $('.dot', knob)
  const pearl = $('.pearl', knob)
  const range = max - min
  let current = value

  function setValue(next, silent = false) {
    current = clamp(next, min, max)
    const t = (current - min) / range
    const [x, y] = ringPoint(-135 + 270 * t)

    dot.setAttribute('cx', x.toFixed(2))
    dot.setAttribute('cy', y.toFixed(2))
    paintPearl(pearl, bipolar ? Math.abs(t * 2 - 1) : t)
    dial.setAttribute('aria-valuenow', current)

    if (!silent) onChange(current)
  }

  function onPointerMove(event) {
    setValue(
      dial.dragStartValue + ((dial.dragStartY - event.clientY) / 150) * range
    )
  }

  function onPointerUp() {
    dial.removeEventListener('pointermove', onPointerMove)
    dial.classList.remove('active')
  }

  dial.addEventListener('pointerdown', (event) => {
    Tone.start()
    dial.setPointerCapture(event.pointerId)
    dial.classList.add('active')
    dial.dragStartY = event.clientY
    dial.dragStartValue = current
    dial.addEventListener('pointermove', onPointerMove)
  })

  dial.addEventListener('pointerup', onPointerUp)
  dial.addEventListener('pointercancel', onPointerUp)
  dial.addEventListener('dblclick', () => setValue(value))

  dial.addEventListener('wheel', (event) => {
    event.preventDefault()
    setValue(current - (Math.sign(event.deltaY) * range) / 40)
  })

  dial.addEventListener('keydown', (event) => {
    const step = range / 40

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight')
      setValue(current + step)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft')
      setValue(current - step)
    else return

    event.preventDefault()
  })

  setValue(value)
  parent.appendChild(knob)

  return { setValue, getValue: () => current, element: knob }
}

// SLIDER
// Ползунок с ракушкой. vertical — «пробирка» с пузырьками для высоты ноты.
// step — шаг значения (0 — плавно). format(value) — подсказка над ракушкой при перетаскивании.

function createSlider(
  parent,
  {
    label,
    hint = '',
    min = 0,
    max = 1,
    step = 0,
    value = 0,
    vertical = false,
    className = '',
    format,
    onChange
  }
) {
  const classes = ['Slider', vertical ? 'tube' : '', className]
    .filter(Boolean)
    .join(' ')
  const slider = createElement('div', classes)
  slider.title = hint
  slider.innerHTML = `
    ${label ? `<span class="title">${label}</span>` : ''}
    <div class="body" tabindex="0" role="slider" aria-label="${label || hint}">
      <div class="track">
        <div class="fill">
          ${vertical ? `<img class="bubbles" src="${ASSETS.tubeBubbles}" alt="" draggable="false" />` : ''}
        </div>
      </div>
      <img class="thumb" src="${ASSETS.scallop}" alt="" draggable="false" />
      ${format ? '<output class="tip"></output>' : ''}
    </div>`

  const body = $('.body', slider)
  const thumb = $('.thumb', slider)
  const tip = $('.tip', slider)
  const range = max - min
  let current = NaN

  function setValue(next, silent = false) {
    let snapped = clamp(next, min, max)
    if (step) snapped = Math.round((snapped - min) / step) * step + min

    const changed = snapped !== current
    current = snapped

    body.style.setProperty('--p', (current - min) / range)
    body.setAttribute('aria-valuenow', current)
    if (tip) tip.textContent = format(current)

    if (!silent && changed) onChange(current)
  }

  // Позиция указателя → значение (с учётом размера ракушки и масштаба страницы)
  function setFromPointer(event) {
    const box = body.getBoundingClientRect()
    const thumbBox = thumb.getBoundingClientRect()
    let position

    if (vertical) {
      position =
        1 -
        (event.clientY - box.top - thumbBox.height / 2) /
          (box.height - thumbBox.height)
    } else {
      position =
        (event.clientX - box.left - thumbBox.width / 2) /
        (box.width - thumbBox.width)
    }

    setValue(min + clamp(position, 0, 1) * range)
  }

  function onPointerUp() {
    body.removeEventListener('pointermove', setFromPointer)
    body.classList.remove('active')
  }

  body.addEventListener('pointerdown', (event) => {
    Tone.start()
    body.setPointerCapture(event.pointerId)
    body.classList.add('active')
    setFromPointer(event)
    body.addEventListener('pointermove', setFromPointer)
  })

  body.addEventListener('pointerup', onPointerUp)
  body.addEventListener('pointercancel', onPointerUp)
  body.addEventListener('dblclick', () => setValue(value))

  body.addEventListener('keydown', (event) => {
    const delta = step || range / 50

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight')
      setValue(current + delta)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft')
      setValue(current - delta)
    else return

    event.preventDefault()
  })

  setValue(value)
  parent.appendChild(slider)

  return { setValue, getValue: () => current, element: slider }
}
