<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ToastMessage } from '$lib/domain/types';
  let { toasts, onDismiss } = $props<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }>();
  const timers = new Map<string, number>();

  function dismiss(id: string): void {
    const timer = timers.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(id);
    onDismiss(id);
  }

  $effect(() => {
    const visibleIds = new Set(toasts.map((toast: ToastMessage) => toast.id));
    for (const toast of toasts) {
      if (timers.has(toast.id)) continue;
      const timer = window.setTimeout(
        () => dismiss(toast.id),
        toast.kind === 'danger' ? 7000 : 4200
      );
      timers.set(toast.id, timer);
    }
    for (const [id, timer] of timers) {
      if (visibleIds.has(id)) continue;
      window.clearTimeout(timer);
      timers.delete(id);
    }
  });

  onDestroy(() => {
    for (const timer of timers.values()) window.clearTimeout(timer);
    timers.clear();
  });
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class={`toast ${toast.kind}`} role={toast.kind === 'danger' ? 'alert' : 'status'}>
      <strong>{toast.title}</strong><small>{toast.detail}</small>
      <button
        class="toast-dismiss"
        type="button"
        aria-label={`알림 닫기: ${toast.title}`}
        title="알림 닫기"
        onclick={() => dismiss(toast.id)}>×</button
      >
    </div>
  {/each}
</div>
