"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps the screen on while a Recipe is being followed, where the browser can. The lock is dropped by the browser
 * whenever the page is hidden, so it is asked for again each time the page comes back.
 */
export function useKeepScreenOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const ask = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (gone) return void next.release();
        lock = next;
        setOn(true);
        next.addEventListener("release", () => setOn(false));
      } catch {
        // Refused (battery saver, no permission): the page works the same, the screen just dims as usual.
      }
    };
    void ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", ask);
      void lock?.release();
    };
  }, []);
  return on;
}

export type RunningTimer = { id: number; label: string; endsAt: number; rung: boolean };

/**
 * Kitchen timers that keep running while the cook moves between steps. When one ends it beeps and buzzes (where
 * the device allows) and stays listed as done until dismissed.
 */
export function useKitchenTimers() {
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const nextId = useRef(1);

  const ring = useCallback(() => {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    const ctx = audio.current;
    if (!ctx) return;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.45);
      osc.stop(ctx.currentTime + i * 0.45 + 0.3);
    }
  }, []);

  const active = timers.some((t) => !t.rung);
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      const at = Date.now();
      setNow(at);
      setTimers((prev) => {
        if (!prev.some((t) => !t.rung && t.endsAt <= at)) return prev;
        ring();
        return prev.map((t) => (!t.rung && t.endsAt <= at ? { ...t, rung: true } : t));
      });
    }, 500);
    return () => clearInterval(tick);
  }, [active, ring]);

  const start = useCallback((label: string, seconds: number) => {
    // Sound is only allowed after a tap, so the audio is set up here, on the tap that starts a timer.
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      // No sound on this device; the timer still shows and buzzes.
    }
    const at = Date.now();
    setNow(at);
    setTimers((prev) => [...prev, { id: nextId.current++, label, endsAt: at + seconds * 1000, rung: false }]);
  }, []);

  const dismiss = useCallback((id: number) => setTimers((prev) => prev.filter((t) => t.id !== id)), []);

  return { timers, now, start, dismiss };
}

/** "12:05" or "1:02:05" left on a timer. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
