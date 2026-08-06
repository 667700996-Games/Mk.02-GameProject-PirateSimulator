<script lang="ts">
  import { enactPolicy, POLICIES, PROGRESSION_NODES, unlockProgression } from '$lib/settlement/progression';
  import { gameSession } from '$lib/stores/gameStore';
  import type { PolicyCategory, ProgressAxis } from '$lib/settlement/types';
  import type { GameState } from '$lib/domain/types';
  import { campaignObjectives } from '$lib/domain/campaign';

  let { game } = $props<{ game: GameState }>();
  let selectedPolicyCategory = $state<PolicyCategory>('loot');
  let campaign = $derived(campaignObjectives(game));
  const axes: { id: ProgressAxis; name: string; subtitle: string; icon: string; color: string }[] = [
    { id: 'infamy', name: '악명', subtitle: '공포, 약탈과 화력', icon: '☠', color: '#b75a48' },
    { id: 'prosperity', name: '번영', subtitle: '생산, 물류와 교역', icon: '◆', color: '#c29a52' },
    { id: 'seamanship', name: '항해술', subtitle: '함선, 해도와 원정', icon: '✥', color: '#5997a2' },
    { id: 'federation', name: '해적 연방', subtitle: '주민, 행정과 동맹', icon: '♛', color: '#7c9b78' }
  ];
  const policyCategories: { id: PolicyCategory; name: string }[] = [{ id: 'loot', name: '전리품 분배' }, { id: 'labor', name: '노동 정책' }, { id: 'food', name: '식량 정책' }, { id: 'prisoners', name: '포로 정책' }, { id: 'diplomacy', name: '외교 정책' }];

  function unlock(id: string): void {
    let ok = false;
    let reason = '';
    gameSession.updateGame((state) => {
      const result = unlockProgression(state.settlement, id);
      ok = result.ok;
      reason = result.reason ?? '';
      return ok ? { ...state, settlement: result.state } : state;
    }, true);
    if (ok) gameSession.addToast('success', '발전 해금', PROGRESSION_NODES.find((node) => node.id === id)?.effect ?? '새 기능이 열렸습니다.');
    else gameSession.addToast('warning', '해금 불가', reason);
  }

  function policy(id: string): void {
    gameSession.updateGame((state) => ({ ...state, settlement: enactPolicy(state.settlement, id) }), true);
  }
</script>

<section class="management-screen progression-screen">
  <header class="management-header"><div><span class="eyebrow">THE FOUR CURRENTS</span><h1>해적 사회의 발전과 통치</h1><p class="muted">도시는 하나의 기술 트리가 아니라, 서로 다른 네 물결 위에서 자랍니다.</p></div><span class="tag">해금 {game.settlement.progression.unlocked.length}개</span></header>
  <div class="axis-grid">
    {#each axes as axis}
      <article class="axis-column" style={`--axis:${axis.color}`}>
        <div class="axis-head"><span>{axis.icon}</span><div><small>{axis.subtitle}</small><h2>{axis.name}</h2></div><b>{game.settlement.progression.points[axis.id]}<small>점</small></b></div>
        <div class="node-list">
          {#each PROGRESSION_NODES.filter((node) => node.axis === axis.id) as node, index}
            {@const unlocked = game.settlement.progression.unlocked.includes(node.id)}
            {@const prerequisitesMet = node.prerequisites.every((id) => game.settlement.progression.unlocked.includes(id))}
            <button class:unlocked class:available={!unlocked && prerequisitesMet && game.settlement.progression.points[axis.id] >= node.cost} onclick={() => !unlocked && unlock(node.id)} disabled={unlocked}>
              <i>{unlocked ? '✓' : index + 1}</i><span><strong>{node.name}</strong><small>{node.description}</small><em>{node.effect}</em></span><b>{unlocked ? '완료' : `${node.cost}점`}</b>
            </button>
          {/each}
        </div>
      </article>
    {/each}
  </div>

  <article class="panel campaign-section">
    <div class="panel-title"><div><span class="eyebrow">THE PIRATE CROWN</span><h2>해적 왕국 선포 조건</h2></div><span class="tag">{campaign.filter((objective) => objective.complete).length} / {campaign.length}</span></div>
    <p class="muted">도시, 물류, 함대, 탐사, 발전과 방어를 모두 증명하면 장기 캠페인이 완결됩니다. 승리 뒤에도 계속 운영할 수 있습니다.</p>
    <div class="campaign-objectives">{#each campaign as objective}<div class:complete={objective.complete}><i>{objective.complete ? '✓' : '◇'}</i><span><strong>{objective.name}</strong><small>{objective.detail}</small></span><b>{objective.current} / {objective.target}</b></div>{/each}</div>
  </article>

  <article class="panel policy-section">
    <div class="panel-title"><div><span class="eyebrow">PIRATE LAW</span><h2>정착지 정책</h2></div><span class="tag">정책은 즉시 주민과 생산 계산에 적용됩니다</span></div>
    <div class="policy-tabs">{#each policyCategories as category}<button class:active={selectedPolicyCategory === category.id} onclick={() => (selectedPolicyCategory = category.id)}>{category.name}</button>{/each}</div>
    <div class="policy-options">{#each POLICIES.filter((item) => item.category === selectedPolicyCategory) as item}<button class:active={game.settlement.policies.active[item.category] === item.id} onclick={() => policy(item.id)}><span>{game.settlement.policies.active[item.category] === item.id ? '◆' : '◇'}</span><div><strong>{item.name}</strong><p class="success">+ {item.benefit}</p><p class="danger">− {item.drawback}</p></div></button>{/each}</div>
  </article>
</section>

<style>
  .progression-screen{background:radial-gradient(circle at 50% 10%,#203d3a66,transparent 38%),linear-gradient(145deg,#07191d,#030c0f)}.axis-grid{display:grid;grid-template-columns:repeat(4,minmax(230px,1fr));gap:.65rem}.axis-column{border:1px solid color-mix(in srgb,var(--axis) 55%,#2e3c39);background:linear-gradient(180deg,color-mix(in srgb,var(--axis) 14%,#0a2021),#061316e8);box-shadow:inset 0 3px var(--axis),0 18px 40px #0004;padding:.8rem}.axis-head{display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:.55rem;padding:.3rem .2rem .8rem;border-bottom:1px solid color-mix(in srgb,var(--axis) 45%,transparent)}.axis-head>span{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--axis);color:var(--axis);font-size:1.35rem;transform:rotate(45deg)}.axis-head>span::first-letter{transform:rotate(-45deg)}.axis-head h2{font-size:1.4rem;margin:0}.axis-head small{color:var(--ink-faint);font-size:.55rem}.axis-head>b{font-size:1.4rem;color:var(--axis)}.axis-head>b small{display:block}.node-list{display:grid;gap:.38rem;padding-top:.7rem}.node-list button{display:grid;grid-template-columns:26px 1fr auto;align-items:start;gap:.5rem;border:1px solid var(--line-soft);background:#071719b5;color:var(--ink);padding:.55rem;text-align:left;opacity:.5}.node-list button:not(:disabled){cursor:pointer}.node-list button.available{opacity:1;border-color:var(--axis);box-shadow:inset 2px 0 var(--axis)}.node-list button.unlocked{opacity:.82;background:color-mix(in srgb,var(--axis) 12%,#071719)}.node-list i{width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--axis);border-radius:50%;color:var(--axis);font-style:normal;font-size:.6rem}.node-list strong,.node-list small,.node-list em{display:block}.node-list strong{font-size:.67rem}.node-list small{color:var(--ink-muted);font-size:.54rem;line-height:1.35;margin:.15rem 0}.node-list em{font-size:.5rem;color:var(--axis);font-style:normal}.node-list>button>b{font-size:.55rem;color:var(--axis);white-space:nowrap}.campaign-section,.policy-section{margin-top:.8rem;padding:1rem}.campaign-objectives{display:grid;grid-template-columns:repeat(2,1fr);gap:.45rem;margin-top:.7rem}.campaign-objectives>div{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:.55rem;padding:.6rem;border:1px solid var(--line-soft);background:#071719}.campaign-objectives>div.complete{border-color:#708f6c;background:#14281f}.campaign-objectives i{font-style:normal;color:var(--brass);font-size:1rem}.campaign-objectives strong,.campaign-objectives small{display:block}.campaign-objectives strong{font-size:.68rem}.campaign-objectives small{font-size:.53rem;color:var(--ink-muted);margin-top:.15rem}.campaign-objectives b{font-size:.58rem;color:var(--brass-light)}.policy-tabs{display:flex;gap:.25rem;border-bottom:1px solid var(--line);margin-bottom:.7rem}.policy-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--ink-muted);padding:.6rem 1rem;cursor:pointer}.policy-tabs button.active{color:var(--ink);border-color:var(--brass)}.policy-options{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem}.policy-options>button{display:grid;grid-template-columns:32px 1fr;gap:.55rem;text-align:left;border:1px solid var(--line-soft);background:#0a2022;color:var(--ink);padding:.7rem;cursor:pointer}.policy-options>button.active{border-color:var(--brass);background:linear-gradient(135deg,#4b3b29aa,#102728)}.policy-options>button>span{color:var(--brass-light);font-size:1rem}.policy-options strong{font-size:.72rem}.policy-options p{font-size:.56rem;margin:.3rem 0 0}
  @media(max-width:1100px){.axis-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.axis-grid,.campaign-objectives{grid-template-columns:1fr}.policy-options{grid-template-columns:1fr}.policy-tabs{overflow-x:auto}.policy-tabs button{white-space:nowrap}}
</style>
