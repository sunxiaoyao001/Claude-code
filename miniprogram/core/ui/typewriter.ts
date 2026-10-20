// Typewriter reveal for the status-row camera name (CLAUDE.md §7.2): one character per step.
export function typewrite(text: string, stepMs: number, onStep: (visible: string) => void): () => void {
  const chars = Array.from(text);
  let shown = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    shown += 1;
    onStep(chars.slice(0, shown).join(''));
    if (shown < chars.length) timer = setTimeout(tick, stepMs);
  };
  onStep('');
  if (chars.length) timer = setTimeout(tick, stepMs);
  return () => {
    if (timer !== null) clearTimeout(timer);
  };
}
