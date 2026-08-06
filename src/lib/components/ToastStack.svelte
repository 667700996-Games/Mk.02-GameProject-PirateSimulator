<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ToastMessage } from '$lib/domain/types';
  let { toasts, onDismiss } = $props<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }>();
  const timers: Record<string, number> = Object.create(null) as Record<string, number>;

  function durationFor(toast: ToastMessage): number {
    return toast.kind === 'danger' ? 7000 : 4200;
  }

  function dismiss(id: string): void {
    const timer = timers[id];
    if (timer !== undefined) window.clearTimeout(timer);
    delete timers[id];
    onDismiss(id);
  }

  $effect(() => {
    const visibleIds = new Set(toasts.map((toast: ToastMessage) => toast.id));
    for (const toast of toasts) {
      if (timers[toast.id] !== undefined) continue;
      const timer = window.setTimeout(() => dismiss(toast.id), durationFor(toast));
      timers[toast.id] = timer;
    }
    for (const [id, timer] of Object.entries(timers)) {
      if (visibleIds.has(id)) continue;
      window.clearTimeout(timer);
      delete timers[id];
    }
  });

  onDestroy(() => {
    for (const timer of Object.values(timers)) window.clearTimeout(timer);
    for (const id of Object.keys(timers)) delete timers[id];
  });
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class={`toast ${toast.kind}`} role={toast.kind === 'danger' ? 'alert' : 'status'} style={`--toast-life: ${durationFor(toast)}ms`}>
      <strong>{toast.title}</strong><small>{toast.detail}</small>
      <button
        class="toast-dismiss"
        type="button"
        aria-label={`알림 닫기: ${toast.title}`}
        title="알림 닫기"
        onclick={() => dismiss(toast.id)}>×</button
      >
      <i class="toast-lifetime" aria-hidden="true"></i>
    </div>
  {/each}
</div>
