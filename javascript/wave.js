// WAVE
// Волна под экраном — осциллограф итогового звука.
// Чтобы линия была плавной «морской» волной, а не частоколом:
// • кадр начинается с перехода через ноль (картинка не дёргается);
// • показываем примерно три периода основного тона;
// • усредняем соседние точки и рисуем кривыми;
// • тихий звук автоматически усиливается, а в тишине волна спокойно колышется сама.

const wave = {
  canvas: null,
  context: null,
  gain: 4,
  idlePhase: 0,
  viewLength: 900,
  level: 0 // громкость итогового звука 0…1 — по ней из ракушек вылетают ноты
}

function findRisingZero(data, from, to) {
  for (let i = Math.max(from, 1); i < to; i++) {
    if (data[i - 1] < 0 && data[i] >= 0) return i
  }
  return -1
}

function getWavePoints(width, height) {
  const data = engine.analyser.node.getValue()
  const size = data.length

  const start = Math.max(findRisingZero(data, 1, size / 2), 0)
  const next = findRisingZero(data, start + 24, size)
  const wanted =
    next > 0 ? clamp((next - start) * 3, 360, size - start - 1) : 900
  wave.viewLength += (wanted - wave.viewLength) * 0.15
  const view = Math.min(Math.round(wave.viewLength), size - start - 1)

  let peak = 0
  for (let i = 0; i < size; i++) peak = Math.max(peak, Math.abs(data[i]))

  const targetGain = peak > 0.002 ? clamp(0.85 / peak, 1, 30) : wave.gain
  wave.gain += (targetGain - wave.gain) * 0.08
  wave.level += (peak - wave.level) * 0.2
  wave.idlePhase += 0.025

  const quiet = clamp(1 - peak * 25, 0, 1)
  const count = 72
  const padding = 14
  const smooth = Math.max(2, Math.floor(view / count))
  const points = []

  for (let i = 0; i <= count; i++) {
    const t = i / count
    const from = start + Math.floor(t * (view - smooth))

    let sum = 0
    for (let j = 0; j < smooth; j++) sum += data[from + j]

    const sound = Math.tanh((sum / smooth) * wave.gain * 1.1)
    const idle =
      Math.sin(t * 8 + wave.idlePhase) * 0.3 +
      Math.sin(t * 21 - wave.idlePhase * 1.7) * 0.14
    const value = sound * (1 - quiet) + idle * quiet

    points.push([
      padding + t * (width - padding * 2),
      height / 2 - value * (height / 2 - 7)
    ])
  }

  return points
}

function drawWave() {
  const { canvas, context } = wave
  const ratio = window.devicePixelRatio || 1
  const width = canvas.clientWidth * ratio
  const height = canvas.clientHeight * ratio

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  context.clearRect(0, 0, width, height)
  const points = getWavePoints(width, height)

  // Плавная кривая через середины отрезков
  context.beginPath()
  context.moveTo(points[0][0], points[0][1])

  for (let i = 1; i < points.length - 1; i++) {
    const middleX = (points[i][0] + points[i + 1][0]) / 2
    const middleY = (points[i][1] + points[i + 1][1]) / 2
    context.quadraticCurveTo(points[i][0], points[i][1], middleX, middleY)
  }

  const last = points[points.length - 1]
  context.lineTo(last[0], last[1])
  context.lineCap = 'round'
  context.lineJoin = 'round'

  // Мягкое свечение — широкая полупрозрачная линия под основной (дешевле, чем shadowBlur)
  context.strokeStyle = 'rgba(92, 192, 253, 0.22)'
  context.lineWidth = 7 * ratio
  context.stroke()

  context.strokeStyle = '#5cc0fd'
  context.lineWidth = 2 * ratio
  context.stroke()
}

function initWaveUI() {
  wave.canvas = document.getElementById('scope')
  wave.context = wave.canvas.getContext('2d')
}
