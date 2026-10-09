// Coordinates are measured in the window after keyboard/window layout settles.
export function keyboardScrollAdjustment({
  containerTop,
  containerHeight,
  inputTop,
  inputHeight,
  keyboardTop = Infinity,
  offset = 0,
  gap = 20,
}) {
  const containerBottom = containerTop + containerHeight;
  const visibleBottom = Math.min(containerBottom, keyboardTop);
  const overlap = Number.isFinite(keyboardTop) ? Math.max(0, containerBottom - keyboardTop) : 0;
  const bottomDelta = inputTop + inputHeight + gap - visibleBottom;
  const topDelta = inputTop - gap - containerTop;
  const delta = bottomDelta > 0 ? bottomDelta : topDelta < 0 ? topDelta : 0;
  return { overlap, scrollY: Math.max(0, offset + delta), needsScroll: delta !== 0 };
}
