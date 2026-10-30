import { animate } from 'motion/mini';
import { spring } from 'motion';
import type { DOMKeyframesDefinition, SpringOptions } from 'motion';

// Native Web Animations + Motion's spring generator. No React runtime or scroll loop.
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const springs = {
  press: { stiffness: 850, damping: 48, mass: .65 },
  release: { stiffness: 480, damping: 25, mass: .65 },
  surface: { stiffness: 420, damping: 38, mass: 1 },
  disclosure: { stiffness: 460, damping: 42, mass: 1 },
};
type Running = { stop: () => void; finish: () => void };
const running = new Map<HTMLElement, Running>();

export function stopMotion(element: HTMLElement) {
  running.get(element)?.stop();
  running.delete(element);
}

export function springTo(element: HTMLElement, frames: DOMKeyframesDefinition, options: SpringOptions = springs.surface, complete?: () => void) {
  stopMotion(element);
  const applyFinal = () => {
    for (const [key, value] of Object.entries(frames)) {
      const final = Array.isArray(value) ? value.at(-1) : value;
      if (final != null) element.style.setProperty(key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), String(final));
    }
  };
  if (reducedMotion.matches) { applyFinal(); complete?.(); return; }
  const animation = animate(element, frames, { type: spring, ...options });
  const entry: Running = {
    stop: () => animation.stop(),
    finish: () => { animation.stop(); applyFinal(); complete?.(); },
  };
  running.set(element, entry);
  animation.then(() => {
    if (running.get(element) !== entry) return;
    running.delete(element); complete?.();
  });
}

export function finishMotion() {
  const entries = [...running.values()]; running.clear();
  entries.forEach(entry => entry.finish());
}
reducedMotion.addEventListener('change', e => {
  if (!e.matches) return;
  finishMotion();
  // CSS media rules do not stop animations started through element.animate().
  document.getAnimations().forEach(animation => {
    try { animation.finish(); } catch { animation.cancel(); }
  });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) finishMotion(); });

export function revealResults(elements: HTMLElement[]) {
  if (reducedMotion.matches) return;
  elements.forEach((element, i) => {
    // Short, finite stagger; result links are usable throughout the animation.
    element.animate([{ opacity: .3, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], {
      duration: 300, delay: Math.min(i, 4) * 30, easing: 'cubic-bezier(.2,.8,.25,1)',
    });
  });
}
