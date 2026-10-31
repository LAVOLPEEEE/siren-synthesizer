// UTILITIES
// Маленькие помощники, которыми пользуются все модули

const $ = (selector, root = document) => root.querySelector(selector)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const pick = (list) => list[Math.floor(Math.random() * list.length)]

const randomBetween = (min, max) => min + Math.random() * (max - min)

// Создать элемент с классом и разметкой
function createElement(tag, className, html) {
  const element = document.createElement(tag)

  if (className) element.className = className
  if (html != null) element.innerHTML = html

  return element
}

// Плавно перевести параметр к новому значению в момент time (за 40 мс, без щелчка).
// Нужен там, где прошлый звук ещё не отзвучал, а мы меняем его панораму или фильтр.
function moveTo(param, value, time, seconds = 0.04) {
  param.cancelAndHoldAtTime(time)
  param.linearRampToValueAtTime(value, time + seconds)
}

// Плавно изменить параметр звука прямо сейчас.
// Резкий скачок значения даёт щелчок, а за 60 мс параметр доезжает без него.
function glide(param, value, seconds = 0.06) {
  param.cancelScheduledValues(Tone.immediate())
  param.rampTo(value, seconds, Tone.immediate())
}
