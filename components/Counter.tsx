"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

interface CounterProps {
  value: number;
  suffix?: string;
  isYear?: boolean;
  duration?: number;
}

export default function Counter({
  value,
  suffix = "",
  isYear = false,
  duration = 1800,
}: CounterProps) {
  const [display, setDisplay] = useState(isYear ? 2000 : 0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  useEffect(() => {
    if (!inView) return;
    const start = isYear ? 2000 : 0;
    const end = value;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value, duration, isYear]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
