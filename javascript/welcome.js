// WELCOME
// Приветствие при входе на сайт: «what's your name?».
// Имя встаёт на кнопку вместо MEDUZA — «DJ: ИМЯ» — и запоминается в браузере.
// skip оставляет «DJ: MEDUZA». Клик по кнопке заодно включает звук (Tone.start),
// как кнопка Start в ADC-GID-26-27.

const DEFAULT_DJ_NAME = 'MEDUZA'
const NAME_STORAGE_KEY = 'siren-dj-name'

function readSavedName() {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || ''
  } catch (error) {
    return ''
  }
}

function saveName(name) {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name)
  } catch (error) {
    // хранилище недоступно — просто не запоминаем
  }
}

function setDjName(name) {
  const cleanName = name.replace(/\s+/g, ' ').trim().slice(0, 14)
  const label = (cleanName || DEFAULT_DJ_NAME).toUpperCase()
  const holder = $('#dj .dj-name')

  holder.textContent = label

  // Длинное имя чуть уменьшаем, чтобы влезло в кнопку
  const fontSize = Math.max(17, 22 - (label.length - 10) * 1.1)
  holder.parentElement.style.fontSize = label.length > 10 ? `${fontSize}px` : ''
}

function closeWelcome(name) {
  const welcome = document.getElementById('welcome')

  Tone.start()

  if (name !== null) {
    setDjName(name)
    saveName(name.trim())
  }

  welcome.classList.add('hide')
  setTimeout(() => welcome.remove(), 450)
}

function initWelcomeUI() {
  const nameInput = document.getElementById('welcomeName')

  document.getElementById('welcomeForm').addEventListener('submit', (event) => {
    event.preventDefault()
    closeWelcome(nameInput.value)
  })

  document.getElementById('welcomeSkip').addEventListener('click', () => {
    setDjName('')
    closeWelcome(null)
  })

  nameInput.value = readSavedName()
  setDjName(nameInput.value)
  setTimeout(() => nameInput.focus(), 350)
}
