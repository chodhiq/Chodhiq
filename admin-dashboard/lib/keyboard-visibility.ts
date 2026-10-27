export function installKeyboardVisibility(
  targetWindow: Window = window,
  targetDocument: Document = document,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reveal = () => {
    const element = targetDocument.activeElement as HTMLElement | null;
    const editing = !!element?.matches(
      'textarea, select, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="hidden"])',
    );
    targetDocument.body.dataset.editing = editing ? 'true' : 'false';
    if (!editing || !element || targetWindow.innerWidth > 820) return;
    const viewport = targetWindow.visualViewport;
    const top = viewport?.offsetTop || 0;
    const bottom = top + (viewport?.height || targetWindow.innerHeight);
    const header = targetDocument.querySelector('.topbar')?.getBoundingClientRect().height || 0;
    const rect = element.getBoundingClientRect();
    if (rect.bottom > bottom - 20 || rect.top < top + header + 12)
      element.scrollIntoView({ block: 'center', behavior: 'auto' });
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(reveal, 120);
  };
  targetDocument.addEventListener('focusin', schedule);
  targetDocument.addEventListener('focusout', schedule);
  targetWindow.addEventListener('resize', schedule);
  targetWindow.visualViewport?.addEventListener('resize', schedule);
  return () => {
    if (timer) clearTimeout(timer);
    targetDocument.removeEventListener('focusin', schedule);
    targetDocument.removeEventListener('focusout', schedule);
    targetWindow.removeEventListener('resize', schedule);
    targetWindow.visualViewport?.removeEventListener('resize', schedule);
    delete targetDocument.body.dataset.editing;
  };
}
