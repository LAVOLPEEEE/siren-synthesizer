// LAYOUT
// Адаптивность. Три раскладки, каждая растягивается на всю ширину окна (CSS zoom):
// • desktop (от 1100 px) — макет 1440 px, как в дизайне;
// • tablet (700–1099 px) — две колонки, ширина 960 px;
// • mobile (до 700 px) — одна колонка, ширина 480 px.

const LAYOUTS = [
  { name: 'desktop', from: 1100, width: 1440 },
  { name: 'tablet', from: 700, width: 960 },
  { name: 'mobile', from: 0, width: 480 }
]

function fitToScreen() {
  const windowWidth = document.documentElement.clientWidth
  const layout = LAYOUTS.find((item) => windowWidth >= item.from)

  LAYOUTS.forEach((item) => {
    document.body.classList.toggle(item.name, item === layout)
  })

  document.getElementById('app').style.zoom = Math.min(
    windowWidth / layout.width,
    1.6
  )
}

function initLayout() {
  fitToScreen()
  window.addEventListener('resize', fitToScreen)
}
