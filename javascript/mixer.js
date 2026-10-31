// MIXER
// Громкость, mute, панорама и solo для каждого канала.
// Голоса — прямо в своих панелях, хор сирен, звуки моря и ритм — в панели volume.
// Одну и ту же «mute» может переключать несколько кнопок (например, whale под экраном),
// поэтому все они хранятся в muteButtons и обновляются вместе.

const muteButtons = {}

function setMute(key, isMuted) {
  channels[key].mute = isMuted

  muteButtons[key].forEach((button) => {
    button.classList.toggle('active', isMuted)
  })
}

function bindMuteButton(key, button) {
  muteButtons[key] = muteButtons[key] || []
  muteButtons[key].push(button)
  button.classList.toggle('active', channels[key].mute)
}

// faderBox — куда поставить ползунок громкости, rowBox — куда mute / panorama / solo
function createChannelStrip(key, faderBox, rowBox) {
  const channel = channels[key]

  createSlider(faderBox, {
    hint: 'громкость канала, дБ',
    min: -40,
    max: 6,
    step: 1,
    value: -6,
    format: (value) =>
      value <= -40 ? '−∞ dB' : `${value > 0 ? '+' : ''}${value} dB`,
    onChange: (value) => glide(channel.volume, value <= -40 ? -100 : value)
  })

  const muteButton = createButton(rowBox, {
    label: 'mute',
    hint: 'выключить канал',
    className: 'SquareButton',
    onClick: () => setMute(key, !channel.mute)
  })
  bindMuteButton(key, muteButton)

  createKnob(rowBox, {
    label: 'panorama',
    hint: 'панорама: лево — право (двойной клик — центр)',
    min: -1,
    max: 1,
    value: channel.pan.value,
    size: 'large',
    bipolar: true,
    onChange: (value) => glide(channel.pan, Math.abs(value) < 0.04 ? 0 : value)
  })

  const soloButton = createButton(rowBox, {
    label: 'solo',
    hint: 'слушать только этот канал',
    className: 'SquareButton',
    onClick: () => {
      channel.solo = !channel.solo
      soloButton.classList.toggle('active', channel.solo)
    }
  })
}

function initMixerUI() {
  VOICES.forEach((voice) => {
    const panel = document.getElementById(`panel-${voice.key}`)
    createChannelStrip(
      voice.key,
      $('.fader-box', panel),
      $('.strip-row', panel)
    )
  })

  ;['V', 'P', 'D'].forEach((key) => {
    const box = document.getElementById(`mix-${key}`)
    createChannelStrip(key, $('.fader-box', box), $('.strip-row', box))
  })

  // Общая громкость — второй ползунок наверху
  topSliders.master = createSlider(document.getElementById('master'), {
    hint: 'общая громкость',
    min: -40,
    max: 0,
    step: 0.5,
    value: engine.master.volume,
    format: (value) =>
      value <= -40 ? 'volume −∞' : `volume ${Math.round(value)} dB`,
    onChange: (value) =>
      glide(engine.master.node.volume, value <= -40 ? -100 : value)
  })
}
