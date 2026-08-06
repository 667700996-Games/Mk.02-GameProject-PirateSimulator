import { expect, test } from '@playwright/test';

function expectPngResponse(response: import('@playwright/test').Response): void {
  expect(
    response.ok() || response.status() === 304,
    `${response.url()} returned ${response.status()}`
  ).toBe(true);
  if (response.status() !== 304) {
    expect(response.headers()['content-type']).toContain('image/png');
  }
}

async function createCaptain(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '새로운 전설 시작' }).click();
  await page.locator('#captain-name').fill('검은수염 테스트');
  await page.locator('#crew-name').fill('자동화 해적단');
  await page.locator('#ship-name').fill('난파된 왕관');
  await page.getByRole('button', { name: /건축가/ }).click();
  await page.getByRole('button', { name: /검은 깃발을 올린다/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
  await expect(page.locator('.settlement-host canvas')).toBeVisible({ timeout: 15_000 });
}

async function restoreFlagshipForNavalTest(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();
  await page.evaluate(
    async () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('blackwake-pirate-simulator');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const read = database.transaction('saves', 'readonly').objectStore('saves').getAll();
          read.onerror = () => reject(read.error);
          read.onsuccess = () => {
            const record = read.result[0];
            const state = record.state;
            const flagship = state.ships.find((ship: { id: string }) => ship.id === state.activeShipId) ?? state.ships[0];
            flagship.hull = flagship.stats.hullMax;
            flagship.sails = flagship.stats.sailMax;
            flagship.crew = Math.max(8, Math.min(flagship.stats.crewMax, 12));
            flagship.cargo.cannonballs = 80;
            flagship.cargo.powder = 80;
            const serialized = JSON.stringify(state);
            let hash = 2166136261;
            for (let index = 0; index < serialized.length; index += 1) {
              hash ^= serialized.charCodeAt(index);
              hash = Math.imul(hash, 16777619);
            }
            record.integrity = `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
            const write = database.transaction('saves', 'readwrite');
            write.objectStore('saves').put(record);
            write.onerror = () => reject(write.error);
            write.oncomplete = () => {
              database.close();
              resolve();
            };
          };
        };
      })
  );
  await page.reload();
  await page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
}

test('creates a pirate settlement and opens every core management surface', async ({
  page
}, testInfo) => {
  const terrainAtlasResponse = page.waitForResponse((response) => response.url().endsWith('/art/settlement/terrain-surfaces-atlas-v2.png'));
  await createCaptain(page);
  const terrainAtlas = await terrainAtlasResponse;
  expectPngResponse(terrainAtlas);
  if (!(await page.getByRole('heading', { name: '도시 건설' }).isVisible())) {
    await page.getByRole('button', { name: '건설 메뉴 열기' }).click();
  }
  await expect(page.getByRole('heading', { name: '도시 건설' })).toBeVisible();
  await expect(page.getByText('인구 / 주거')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('isometric-settlement.png'), fullPage: true });

  await page.locator('.game-nav').getByRole('button', { name: '선원단', exact: true }).click();
  await expect(page.getByRole('heading', { name: '주민과 노동력' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '정착민 명부' })).toBeVisible();

  await page.locator('.game-nav').getByRole('button', { name: '발전', exact: true }).click();
  await expect(page.getByRole('heading', { name: '해적 사회의 발전과 통치' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '정착지 정책' })).toBeVisible();

  await page.locator('.game-nav').getByRole('button', { name: '함선', exact: true }).click();
  await expect(page.getByRole('heading', { name: '조선소와 함선 건조' })).toBeVisible();

  await page.locator('.game-nav').getByRole('button', { name: '해도', exact: true }).click();
  await expect(page.getByRole('heading', { name: '검은 해도' })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.screenshot({ path: testInfo.outputPath('strategic-map.png'), fullPage: true });
  await page.getByRole('button', { name: '이 해역 원정 편성' }).click();
  await expect(page.getByRole('heading', { name: '함대와 전략 원정' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '일시정지' })).toBeVisible();
  await page.getByRole('button', { name: /항해 계속/ }).click();
  await expect(page.getByRole('heading', { name: '함대와 전략 원정' })).toBeVisible();
});

test('launches the restored flagship into the class-specific real-time naval theatre', async ({
  page
}, testInfo) => {
  test.slow();
  await createCaptain(page);
  await restoreFlagshipForNavalTest(page);
  await page.locator('.game-nav').getByRole('button', { name: '해도', exact: true }).click();
  await expect(page.getByRole('heading', { name: '검은 해도' })).toBeVisible();

  const sortie = page.getByRole('button', { name: '기함으로 전술 출격' });
  await expect(sortie).toBeEnabled();
  const atlasResponse = page.waitForResponse((response) => response.url().endsWith('/art/naval/fleet-classes-atlas.png'));
  await sortie.click();
  const atlas = await atlasResponse;
  expectPngResponse(atlas);

  await expect(page.getByTestId('sea-screen')).toBeVisible();
  await expect(page.locator('[data-testid="naval-canvas-host"] canvas')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('전투 태세 정상').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /1번 일반 포탄/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Q · 좌현/ })).toBeVisible();
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await expect(page.locator('.speed-readout b')).not.toHaveText('0.0');
  await page.screenshot({ path: testInfo.outputPath('real-time-naval-theatre.png'), fullPage: true });
});

test('persists and restores the complete settlement state through IndexedDB', async ({ page }) => {
  await createCaptain(page);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();
  const saved = await page.evaluate(
    async () =>
      new Promise<{ version: number; residents: number; buildings: number }>((resolve, reject) => {
        const open = indexedDB.open('blackwake-pirate-simulator');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result.transaction('saves', 'readonly').objectStore('saves').getAll();
          all.onerror = () => reject(all.error);
          all.onsuccess = () => {
            const state = all.result[0].state;
            resolve({
              version: state.version,
              residents: state.settlement.residents.length,
              buildings: state.settlement.buildings.length
            });
          };
        };
      })
  );
  expect(saved).toEqual({ version: 4, residents: 16, buildings: 6 });

  await page.reload();
  await expect(page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ })).toBeVisible();
  await page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
  await expect(page.getByText('인구 / 주거')).toBeVisible();
});

test('accepts a contract and keeps missions connected to the expedition command', async ({
  page
}) => {
  await createCaptain(page);
  await page.locator('.game-nav').getByRole('button', { name: '임무', exact: true }).click();
  await expect(page.getByRole('heading', { name: '임무와 소문' })).toBeVisible();
  const accept = page.getByRole('button', { name: '수락' }).first();
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page.getByText('활성 2 / 4')).toBeVisible();
  await page.locator('.game-nav').getByRole('button', { name: '함대', exact: true }).click();
  await expect(page.getByRole('heading', { name: '함대와 전략 원정' })).toBeVisible();
  const doctrineTab = page.getByTestId('fleet-doctrine-tab');
  await doctrineTab.click();
  await expect(doctrineTab).toHaveClass(/active/);
  await expect(page.getByRole('heading', { name: '함대 진형' })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1_250);
  await expect(doctrineTab).toHaveClass(/active/);
});

test('runs every coastal defense stage and returns damage to the spatial settlement', async ({
  page
}) => {
  await createCaptain(page);
  await page.locator('.game-nav').getByRole('button', { name: '세력', exact: true }).click();
  await page.getByRole('button', { name: /붉은 파도 유인/ }).click();
  await expect(page.getByRole('heading', { name: '검은 깃발을 지켜라' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: '방어 준비 지휘' }).click();
  await page.getByRole('button', { name: /주민 대피/ }).click();
  await page.getByRole('button', { name: /방어전 개시/ }).click();
  await page.getByRole('button', { name: /함대 중앙 돌파/ }).click();
  await expect(page.getByRole('heading', { name: '상륙대 저지' })).toBeVisible();
  await page.getByRole('button', { name: /목책 사수/ }).click();
  await expect(page.getByRole('heading', { name: '본거지 내부 전투' })).toBeVisible();
  await page.getByRole('button', { name: /조직적 후퇴/ }).click();
  await expect(page.getByText('AFTER ACTION REPORT')).toBeVisible();
  await page.getByRole('button', { name: '손상 점검 후 본거지로' }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
});

test('traps keyboard focus inside modal surfaces and exposes named controls', async ({ page }) => {
  test.slow();
  await createCaptain(page);
  await page.keyboard.press('Escape');
  const dialog = page.getByRole('dialog', { name: '일시정지' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: /항해 계속/ })).toBeFocused();
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  const unnamedButtons = await page.locator('button').evaluateAll((buttons) =>
    buttons.filter((button) => !button.getAttribute('aria-label') && !(button.textContent ?? '').trim()).length
  );
  expect(unnamedButtons).toBe(0);
});

test('keeps game chrome fixed and supports timed or manual notification dismissal', async ({ page }) => {
  await createCaptain(page);
  const chrome = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('.game-header')!;
    const footer = document.querySelector<HTMLElement>('.game-nav')!;
    const activeNavigation = footer.querySelector<HTMLElement>('.nav-item.active')!;
    const activeNavigationStyle = getComputedStyle(activeNavigation);
    const activeHighlightStyle = getComputedStyle(activeNavigation, '::before');
    return {
      headerPosition: getComputedStyle(header).position,
      headerTop: Math.round(header.getBoundingClientRect().top),
      footerPosition: getComputedStyle(footer).position,
      footerBottom: Math.round(window.innerHeight - footer.getBoundingClientRect().bottom),
      activeHighlightAtTop:
        Number.parseFloat(activeHighlightStyle.top) < 0 &&
        activeHighlightStyle.height === '3px' &&
        activeHighlightStyle.opacity === '1' &&
        activeHighlightStyle.backgroundImage !== 'none' &&
        activeNavigationStyle.borderTopWidth === '0px' &&
        activeNavigationStyle.borderBottomWidth === '0px'
    };
  });
  expect(chrome).toEqual({
    headerPosition: 'fixed',
    headerTop: 0,
    footerPosition: 'fixed',
    footerBottom: 0,
    activeHighlightAtTop: true
  });

  const save = page.getByRole('button', { name: '저장', exact: true });
  await save.click();
  const manualToast = page.locator('.toast').filter({ hasText: '항해일지' }).last();
  await expect(manualToast).toBeVisible();
  await manualToast.getByRole('button', { name: '알림 닫기: 항해일지' }).click();
  await expect(manualToast).toBeHidden();

  await save.click();
  const automaticToast = page.locator('.toast').filter({ hasText: '항해일지' }).last();
  await expect(automaticToast).toBeVisible();
  await expect(automaticToast).toBeHidden({ timeout: 8_000 });
});
