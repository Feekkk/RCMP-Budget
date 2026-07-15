import { useEffect, useRef, useState } from "react";

export function useAutoHideReveal(timeoutMs = 3000) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () => () => Object.values(timers.current).forEach(clearTimeout),
    [],
  );

  const toggle = (label: string) => {
    clearTimeout(timers.current[label]);
    const next = !revealed[label];
    setRevealed((prev) => ({ ...prev, [label]: next }));
    if (next) {
      timers.current[label] = setTimeout(
        () => setRevealed((prev) => ({ ...prev, [label]: false })),
        timeoutMs,
      );
    }
  };

  return { revealed, toggle };
}
