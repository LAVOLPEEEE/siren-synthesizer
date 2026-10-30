// RECORDER
// Запись того, что звучит в колонках (после мастера и лимитера), в WAV-файл.
// recording → stop → скачать (WAV) или «заново» (стереть и начать новую запись). Предел — 10 минут.
// Пишет Tone.Recorder; готовый кусок декодируется и упаковывается в настоящий WAV (16 бит, стерео).

const REC_MAX_SECONDS = 10 * 60

const rec = {
  node: null,
  state: 'idle', // idle | recording | ready
  blob: null,
  startedAt: 0,
  timer: null,
  busy: false
}

let recButton, downloadButton, againButton, recTime

function initRecorder() {
  rec.node = new Tone.Recorder()
  engine.limiter.node.connect(rec.node)
}

function initRecorderUI() {
  recButton = document.getElementById('recBtn')
  downloadButton = document.getElementById('recDownload')
  againButton = document.getElementById('recAgain')
  recTime = document.getElementById('recTime')

  recButton.addEventListener('click', () => {
    if (rec.state === 'recording') stopRecording()
    else startRecording()
  })
  downloadButton.addEventListener('click', downloadTake)
  againButton.addEventListener('click', restartRecording)

  recTime.textContent = '0:00'
  showRecState()
}

function showRecState() {
  const recording = rec.state === 'recording'
  $('span', recButton).textContent = recording
    ? 'stop'
    : rec.state === 'ready'
      ? 'new take'
      : 'recording'
  recButton.classList.toggle('active', recording)
  recButton.title = recording ? 'остановить запись' : 'начать новую запись'
  downloadButton.disabled = rec.state !== 'ready' || rec.busy
  againButton.disabled = rec.state === 'idle' || rec.busy
}

function formatTime(seconds) {
  const s = Math.floor(seconds)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

async function startRecording() {
  if (rec.busy) return
  await Tone.start()
  rec.busy = true
  rec.blob = null
  try {
    await rec.node.start()
  } catch (error) {
    rec.busy = false
    recTime.textContent = '—'
    return
  }
  rec.busy = false
  rec.state = 'recording'
  rec.startedAt = performance.now()
  recTime.textContent = '0:00'
  clearInterval(rec.timer)
  rec.timer = setInterval(() => {
    const seconds = (performance.now() - rec.startedAt) / 1000
    recTime.textContent = formatTime(seconds)
    if (seconds >= REC_MAX_SECONDS) stopRecording()
  }, 250)
  showRecState()
}

async function stopRecording() {
  if (rec.state !== 'recording' || rec.busy) return
  rec.busy = true
  clearInterval(rec.timer)
  recTime.textContent = '…'
  showRecState()
  try {
    rec.blob = await rec.node.stop()
    rec.state = 'ready'
    recTime.textContent = formatTime((performance.now() - rec.startedAt) / 1000)
  } catch (error) {
    rec.state = 'idle'
    recTime.textContent = '0:00'
  }
  rec.busy = false
  showRecState()
}

// «Заново»: убрать текущую запись и сразу начать чистую
async function restartRecording() {
  if (rec.busy) return
  if (rec.state === 'recording') {
    rec.busy = true
    clearInterval(rec.timer)
    try {
      await rec.node.stop()
    } catch (error) {
      /* нечего останавливать */
    }
    rec.busy = false
  }
  rec.blob = null
  rec.state = 'idle'
  await startRecording()
}

async function downloadTake() {
  if (!rec.blob || rec.busy) return
  rec.busy = true
  showRecState()
  let file = rec.blob
  let extension = /ogg/.test(rec.blob.type)
    ? 'ogg'
    : /mp4/.test(rec.blob.type)
      ? 'm4a'
      : 'webm'
  try {
    const audio = await Tone.getContext().decodeAudioData(
      await rec.blob.arrayBuffer()
    )
    file = encodeWav(audio)
    extension = 'wav'
  } catch (error) {
    // не вышло упаковать в WAV — отдаём файл как записал браузер
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = `morskoj-sintezator-${stamp}.${extension}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 10000)
  rec.busy = false
  showRecState()
}

// AudioBuffer → WAV (PCM, 16 бит, стерео)
function encodeWav(audio) {
  const left = audio.getChannelData(0)
  const right = audio.numberOfChannels > 1 ? audio.getChannelData(1) : left
  const frames = left.length
  const view = new DataView(new ArrayBuffer(44 + frames * 4))
  const text = (offset, string) =>
    [...string].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + frames * 4, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, audio.sampleRate, true)
  view.setUint32(28, audio.sampleRate * 4, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * 4, true)
  const toInt = (x) => {
    const s = clamp(x, -1, 1)
    return s < 0 ? s * 0x8000 : s * 0x7fff
  }
  for (let i = 0; i < frames; i++) {
    view.setInt16(44 + i * 4, toInt(left[i]), true)
    view.setInt16(46 + i * 4, toInt(right[i]), true)
  }
  return new Blob([view], { type: 'audio/wav' })
}
