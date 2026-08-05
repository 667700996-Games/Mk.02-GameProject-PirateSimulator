<script lang="ts">
  import type { ToastMessage } from '$lib/domain/types';
  let { toasts, onDismiss } = $props<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }>();
</script>

<div class="toast-stack" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <button class={`toast ${toast.kind}`} onclick={() => onDismiss(toast.id)}>
      <strong>{toast.title}</strong><small>{toast.detail}</small>
    </button>
  {/each}
</div>
