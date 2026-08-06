const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusTrap(node: HTMLElement): { destroy: () => void } {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  const focusFirst = () => (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
  const frame = requestAnimationFrame(focusFirst);
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      node.focus();
      return;
    }
    // Drive the complete cycle ourselves. WebKit may otherwise skip buttons
    // according to the host OS keyboard-navigation preference.
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex < 0 || currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    focusable[nextIndex].focus();
  };
  node.addEventListener('keydown', keydown);
  return {
    destroy: () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('keydown', keydown);
      previous?.focus();
    }
  };
}
