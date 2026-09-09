import { useEffect, useRef, useState } from 'react';

/**
 * Reusable "hide on scroll down, reveal on scroll up" controller for the
 * mobile bottom navigation.
 *
 * - passive window scroll listener
 * - requestAnimationFrame throttling (at most one state read per frame)
 * - direction detection against the previous scroll position
 * - small delta so tiny jitters (rubber-banding, sub-pixel scroll) do not flip it
 * - always visible near the top of the page
 * - state is only written when it actually changes (no per-pixel re-renders)
 * - listeners and pending frames are cleaned up on unmount
 *
 * @param {object} [opts]
 * @param {number} [opts.topThreshold=24]  scrollY at or below this always shows the nav
 * @param {number} [opts.delta=6]          minimum movement (px) before direction counts
 * @param {boolean} [opts.enabled=true]    disable to force the nav visible
 * @returns {boolean} true when the nav should be hidden
 */
export default function useNavVisibility({ topThreshold = 24, delta = 6, enabled = true } = {}) {
  const [hidden, setHidden] = useState(false);
  const prevY = useRef(0);
  const ticking = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setHidden(false);
      return undefined;
    }

    prevY.current = Math.max(0, window.scrollY || window.pageYOffset || 0);
    setHidden(false);

    const evaluate = () => {
      ticking.current = false;
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const prev = prevY.current;
      let next;
      if (y <= topThreshold) {
        next = false; // at the very top: always visible
      } else if (y > prev + delta) {
        next = true; // scrolling down: slide away
      } else if (y < prev - delta) {
        next = false; // scrolling up (even slightly): come back
      } else {
        prevY.current = y;
        return; // below the jitter threshold: keep the most recent state
      }

      prevY.current = y;
      setHidden((cur) => (cur === next ? cur : next));
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      frame.current = window.requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current) window.cancelAnimationFrame(frame.current);
      ticking.current = false;
    };
  }, [enabled, topThreshold, delta]);

  return enabled ? hidden : false;
}
