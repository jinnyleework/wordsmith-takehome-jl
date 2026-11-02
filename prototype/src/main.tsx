import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Scrollbars only show while something is scrolling (see index.css)
const scrollTimers = new WeakMap<Element, number>()
document.addEventListener(
  'scroll',
  (e) => {
    const el = e.target instanceof Element ? e.target : document.documentElement
    el.setAttribute('data-scrolling', '')
    clearTimeout(scrollTimers.get(el))
    scrollTimers.set(el, window.setTimeout(() => el.removeAttribute('data-scrolling'), 800))
  },
  { capture: true, passive: true },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
