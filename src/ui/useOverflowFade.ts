import { useEffect, useRef, useState } from "react";

export function useOverflowFade<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    let frame = 0;
    const measure = () => {
      const next = element.scrollHeight > element.clientHeight + 1;
      setOverflowing((current) => (current === next ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : undefined;
    resizeObserver?.observe(element);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);

  return { ref, overflowing: enabled && overflowing };
}
