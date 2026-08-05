<script lang="ts">
  import type { GameScreen } from '$lib/domain/types';
  let { screen, onNavigate } = $props<{ screen: GameScreen; onNavigate: (screen: GameScreen) => void }>();
  const items: { screen: GameScreen; icon: string; label: string }[] = [
    { screen: 'haven', icon: '⌂', label: '본거지' },
    { screen: 'world-map', icon: '✥', label: '해도' },
    { screen: 'freeport', icon: '⚓', label: '자유항' },
    { screen: 'shipyard', icon: '◢', label: '함선' },
    { screen: 'crew', icon: '♞', label: '선원단' },
    { screen: 'missions', icon: '▤', label: '임무' },
    { screen: 'factions', icon: '♛', label: '세력' }
  ];
</script>

<nav class="game-nav" aria-label="주요 화면">
  {#each items as item}
    <button class:active={screen === item.screen} class="nav-item" onclick={() => onNavigate(item.screen)}><span>{item.icon}</span>{item.label}</button>
  {/each}
</nav>
