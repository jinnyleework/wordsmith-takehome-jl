// The app renders zoomed out (`zoom` on <html>, see index.css). Element rects and the
// window size come back in screen pixels, but positions are set in CSS pixels, so
// anything placed from a rect converts through these.

export function zoom() {
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1
}

export function cssRect(el: Element) {
  const r = el.getBoundingClientRect()
  const z = zoom()
  return { top: r.top / z, bottom: r.bottom / z, left: r.left / z, right: r.right / z, width: r.width / z, height: r.height / z }
}

export function viewport() {
  const z = zoom()
  return { width: window.innerWidth / z, height: window.innerHeight / z }
}
