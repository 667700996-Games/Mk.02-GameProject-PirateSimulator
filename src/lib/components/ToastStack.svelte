<script lang="ts">
  import type { ToastMessage } from '$lib/domain/types';
  let { toasts, onDismiss } = $props<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }>();

  $effect(() => {
    const timers: number[] = toasts.map((toast: ToastMessage) => window.setTimeout(() => onDismiss(toast.id), toast.kind === 'danger' ? 7000 : 4200));
    return () => timers.forEach((timer: number) => window.clearTimeout(timer));
  });
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <button class={`toast ${toast.kind}`} onclick={() => onDismiss(toast.id)}>
      <strong>{toast.title}</strong><small>{toast.detail}</small>
    </button>
  {/each}
</div>
