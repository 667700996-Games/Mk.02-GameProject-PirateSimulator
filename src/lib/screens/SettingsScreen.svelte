<script lang="ts">
  import type { GameSettings, KeyBindings, SaveRecord } from '$lib/domain/types';
  let { settings, saves, onUpdate, onLoad, onDelete, onExport, onImport, onBack, onTitle } =
    $props<{
      settings: GameSettings;
      saves: SaveRecord[];
      onUpdate: (settings: Partial<GameSettings>) => void;
      onLoad: (id: string) => void;
      onDelete: (id: string) => void;
      onExport: () => string | undefined;
      onImport: (serialized: string) => Promise<void>;
      onBack: () => void;
      onTitle: () => void;
    }>();
  const bindingNames: Record<keyof KeyBindings, string> = {
    sailUp: '돛 펼치기',
    sailDown: '돛 접기',
    steerLeft: '좌현 조타',
    steerRight: '우현 조타',
    aimPort: '좌현 포대',
    aimStarboard: '우현 포대',
    fire: '포격',
    nextTarget: '표적 전환',
    map: '해도',
    ship: '함선 관리',
    crew: '선원 관리',
    haven: '본거지',
    pause: '일시정지'
  };
  const keyOptions = [
    'KeyW',
    'KeyS',
    'KeyA',
    'KeyD',
    'KeyQ',
    'KeyE',
    'KeyF',
    'KeyM',
    'KeyI',
    'KeyC',
    'KeyB',
    'KeyR',
    'Space',
    'Tab',
    'Escape'
  ];
  const keyLabel = (code: string) => (code.startsWith('Key') ? code.slice(3) : code);
  function bindKey(action: keyof KeyBindings, code: string): void {
    onUpdate({ keyBindings: { ...settings.keyBindings, [action]: code } });
  }
  function downloadSave(): void {
    const serialized = onExport();
    if (!serialized) return;
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pirate-simulator-save-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await onImport(await file.text());
    input.value = '';
  }
</script>

<section class="management-screen">
  <header class="management-header">
    <div>
      <span class="eyebrow">CAPTAIN'S PREFERENCES</span>
      <h1>설정과 항해일지</h1>
    </div>
    <button class="btn" onclick={onBack}>← 게임으로</button>
  </header>
  <div class="management-grid">
    <article class="panel span-6">
      <span class="eyebrow">AUDIO</span>
      <h2>음향</h2>
      {#each [['masterVolume', '전체 음량'], ['musicVolume', '음악'], ['effectsVolume', '효과음'], ['ambienceVolume', '환경음']] as [key, label]}<div
          class="field"
        >
          <label for={key}
            >{label} · {Math.round((settings[key as keyof GameSettings] as number) * 100)}%</label
          ><input
            id={key}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings[key as keyof GameSettings] as number}
            oninput={(event) => onUpdate({ [key]: Number(event.currentTarget.value) })}
          />
        </div>{/each}
    </article>
    <article class="panel span-6">
      <span class="eyebrow">DISPLAY & ACCESSIBILITY</span>
      <h2>화면</h2>
      <div class="field">
        <label for="quality">렌더링 품질</label><select
          id="quality"
          value={settings.quality}
          onchange={(event) =>
            onUpdate({ quality: event.currentTarget.value as GameSettings['quality'] })}
          ><option value="low">낮음</option><option value="medium">중간</option><option value="high"
            >높음</option
          ></select
        >
      </div>
      <div class="field">
        <label for="ui-scale">UI 글자 크기</label>
        <select id="ui-scale" value={settings.uiScale} onchange={(event) => onUpdate({ uiScale: event.currentTarget.value as GameSettings['uiScale'] })}>
          <option value="compact">작게</option><option value="normal">기본</option><option value="large">크게</option>
        </select>
      </div>
      <div class="field">
        <label for="color-vision">색각 보정</label>
        <select id="color-vision" value={settings.colorVision} onchange={(event) => onUpdate({ colorVision: event.currentTarget.value as GameSettings['colorVision'] })}>
          <option value="standard">표준</option><option value="deuteranopia">녹색약 보정</option><option value="protanopia">적색약 보정</option>
        </select>
      </div>
      <label class="resource-row"><span><strong>고대비 UI</strong><small style="display:block">텍스트와 패널 경계를 더 선명하게 표시</small></span><input type="checkbox" checked={settings.highContrast} onchange={(event) => onUpdate({ highContrast: event.currentTarget.checked })} /></label>
      <label class="resource-row"
        ><span
          ><strong>화면 흔들림</strong><small style="display:block"
            >대포 피격과 폭발 카메라 효과</small
          ></span
        ><input
          type="checkbox"
          checked={settings.screenShake}
          onchange={(event) => onUpdate({ screenShake: event.currentTarget.checked })}
        /></label
      ><label class="resource-row"
        ><span
          ><strong>모션 감소</strong><small style="display:block">배경과 UI 애니메이션 최소화</small
          ></span
        ><input
          type="checkbox"
          checked={settings.reducedMotion}
          onchange={(event) => onUpdate({ reducedMotion: event.currentTarget.checked })}
        /></label
      ><label class="resource-row"
        ><span
          ><strong>피해 수치 표시</strong><small style="display:block"
            >포격 후 선체·돛 피해를 전투 HUD에 표시</small
          ></span
        ><input
          type="checkbox"
          checked={settings.showDamageNumbers}
          onchange={(event) => onUpdate({ showDamageNumbers: event.currentTarget.checked })}
        /></label
      >
    </article>
    <article class="panel span-12">
      <div class="panel-title">
        <div>
          <span class="eyebrow">KEY BINDINGS</span>
          <h2>키 설정</h2>
        </div>
        <span class="tag">해상 장면 재진입 시 적용</span>
      </div>
      <div class="crew-role-grid">
        {#each Object.entries(bindingNames) as [action, label]}<div class="resource-row">
            <strong>{label}</strong><select
              value={settings.keyBindings[action as keyof KeyBindings]}
              onchange={(event) => bindKey(action as keyof KeyBindings, event.currentTarget.value)}
              >{#each keyOptions as code}<option value={code}>{keyLabel(code)}</option
                >{/each}</select
            >
          </div>{/each}
      </div>
    </article>
    <article class="panel span-12">
      <div class="panel-title">
        <div>
          <span class="eyebrow">INDEXEDDB SAVE SLOTS</span>
          <h2>항해일지</h2>
        </div>
        <div>
          <button class="btn small" onclick={downloadSave}>파일 내보내기</button>
          <label class="btn small" for="save-import">파일 가져오기</label><input
            id="save-import"
            class="visually-hidden"
            type="file"
            accept="application/json,.json"
            onchange={importFile}
          /> <button class="btn danger-button small" onclick={onTitle}>저장 후 타이틀로</button>
        </div>
      </div>
      {#each saves as save}<div class="save-card">
          <div>
            <strong>{save.name}</strong><small class="muted" style="display:block"
              >{save.captainName} · {save.shipName} · 본거지 {save.havenTier}단계 · {new Date(
                save.updatedAt
              ).toLocaleString('ko-KR')}</small
            >
          </div>
          <div>
            <button class="btn small" onclick={() => onLoad(save.id)}>불러오기</button>
            <button class="btn small danger-button" onclick={() => onDelete(save.id)}>삭제</button>
          </div>
        </div>{/each}
    </article>
  </div>
</section>
