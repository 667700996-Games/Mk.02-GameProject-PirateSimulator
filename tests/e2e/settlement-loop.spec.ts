import { expect, test } from '@playwright/test';

const DEFERRED_BUILDING_ATLASES = [
  'core-buildings-tier2-atlas.png',
  'core-buildings-tier3-atlas.png',
  'industry-buildings-atlas.png',
  'industry-buildings-tier2-atlas.png',
  'industry-buildings-tier3-atlas.png',
  'society-buildings-atlas.png',
  'society-buildings-tier2-atlas.png',
  'society-buildings-tier3-atlas.png',
  'logistics-fleet-buildings-atlas.png',
  'logistics-fleet-buildings-tier2-atlas.png',
  'logistics-fleet-buildings-tier3-atlas.png',
  'livelihood-service-buildings-atlas.png',
  'livelihood-service-buildings-tier2-atlas.png',
  'livelihood-service-buildings-tier3-atlas.png',
  'civic-defense-buildings-atlas.png',
  'civic-defense-buildings-tier2-atlas.png',
  'civic-defense-buildings-tier3-atlas.png'
] as const;

async function createSettlement(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '새로운 전설 시작' }).click();
  await page.locator('#captain-name').fill('모건 도시테스트');
  await page.locator('#crew-name').fill('절벽의 망치단');
  await page.locator('#ship-name').fill('난파된 왕관');
  await page.getByRole('button', { name: /건축가/ }).click();
  const atlasResponses = Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/core-buildings-atlas.png')
    ),
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/resident-walk-front-atlas.png')
    ),
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/resident-walk-rear-atlas.png')
    ),
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/resident-work-front-atlas.png')
    ),
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/resident-work-rear-atlas.png')
    ),
    page.waitForResponse((response) =>
      response.url().endsWith('/art/settlement/building-progression-overlays-atlas.png')
    )
  ]);
  await page.getByRole('button', { name: /검은 깃발을 올린다/ }).click();
  for (const response of await atlasResponses) {
    expect(
      response.ok() || response.status() === 304,
      `${response.url()} returned ${response.status()}`
    ).toBe(true);
  }
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
  await expect(page.locator('.settlement-host canvas')).toBeVisible({ timeout: 15_000 });
  const initialResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name)
  );
  for (const atlas of DEFERRED_BUILDING_ATLASES) {
    expect(initialResources.some((url) => url.endsWith(`/art/settlement/${atlas}`))).toBe(false);
  }
}

test('publishes complete non-core tier bodies without loading them into a fresh settlement', async ({
  page
}) => {
  await createSettlement(page);
  const initialResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name)
  );
  for (const atlas of [
    'industry-buildings-tier2-atlas.png',
    'industry-buildings-tier3-atlas.png',
    'society-buildings-tier2-atlas.png',
    'society-buildings-tier3-atlas.png',
    'logistics-fleet-buildings-tier2-atlas.png',
    'logistics-fleet-buildings-tier3-atlas.png',
    'livelihood-service-buildings-tier2-atlas.png',
    'livelihood-service-buildings-tier3-atlas.png',
    'civic-defense-buildings-tier2-atlas.png',
    'civic-defense-buildings-tier3-atlas.png'
  ]) {
    expect(initialResources.some((url) => url.endsWith(`/art/settlement/${atlas}`))).toBe(false);
    const response = await page.request.get(`/art/settlement/${atlas}`);
    expect(response.ok(), `${atlas} returned ${response.status()}`).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect((await response.body()).byteLength).toBeGreaterThan(1_000_000);
  }
});

test('publishes resident work and combat loops while keeping combat art demand-loaded', async ({
  page
}) => {
  await createSettlement(page);
  const initialResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name)
  );
  for (const atlas of ['resident-work-front-atlas.png', 'resident-work-rear-atlas.png']) {
    expect(initialResources.some((url) => url.endsWith(`/art/settlement/${atlas}`))).toBe(true);
  }
  for (const atlas of ['resident-combat-front-atlas.png', 'resident-combat-rear-atlas.png']) {
    expect(initialResources.some((url) => url.endsWith(`/art/settlement/${atlas}`))).toBe(false);
  }
  for (const asset of [
    'resident-work-front-atlas.png',
    'resident-work-front-atlas.json',
    'resident-work-rear-atlas.png',
    'resident-work-rear-atlas.json',
    'resident-combat-front-atlas.png',
    'resident-combat-front-atlas.json',
    'resident-combat-rear-atlas.png',
    'resident-combat-rear-atlas.json'
  ]) {
    const response = await page.request.get(`/art/settlement/${asset}`);
    expect(response.ok(), `${asset} returned ${response.status()}`).toBe(true);
    expect(response.headers()['content-type']).toContain(
      asset.endsWith('.png') ? 'image/png' : 'application/json'
    );
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(asset.endsWith('.png') ? 1_000_000 : 1_000);
    if (asset.endsWith('.json')) {
      const atlas = JSON.parse(body.toString()) as { frames?: Record<string, unknown> };
      expect(Object.keys(atlas.frames ?? {}), `${asset} frame count`).toHaveLength(24);
    }
  }
});

test('places a terrain-bound building and runs its physical construction flow', async ({
  page
}, testInfo) => {
  test.slow();
  await createSettlement(page);
  const buildPanel = page.getByTestId('build-panel');
  if (!(await buildPanel.getByRole('heading', { name: '도시 건설' }).isVisible())) {
    await page.getByRole('button', { name: '건설 메뉴 열기' }).click();
  }
  await buildPanel.getByRole('button', { name: /물류/ }).click();
  const logisticsAtlasResponse = page.waitForResponse((response) =>
    response.url().endsWith('/art/settlement/logistics-fleet-buildings-atlas.png')
  );
  await page.getByTestId('build-local-storage').click();
  const logisticsAtlas = await logisticsAtlasResponse;
  expect(
    logisticsAtlas.ok() || logisticsAtlas.status() === 304,
    `${logisticsAtlas.url()} returned ${logisticsAtlas.status()}`
  ).toBe(true);
  if (!(await buildPanel.getByRole('heading', { name: '도시 건설' }).isVisible())) {
    await page.getByRole('button', { name: '건설 메뉴 열기' }).click();
  }
  await buildPanel.getByRole('button', { name: /채집/ }).click();
  await page.getByTestId('build-water-collector').click();
  if ((page.viewportSize()?.width ?? 1280) > 760) {
    await page.getByRole('button', { name: '건설 메뉴 닫기' }).click();
  }
  const canvas = page.locator('.settlement-host canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: { x: Math.floor(box!.width * 0.5), y: Math.floor(box!.height * 0.5) }
  });
  await expect(page.getByText('빗물 집수장 계획 배치')).toBeVisible();
  await page.getByRole('button', { name: '3×', exact: true }).click();
  // The construction is intentionally gated by two physical deliveries before builders begin.
  await expect(page.getByText(/CONSTRUCTING|ACTIVE/)).toBeVisible({ timeout: 75_000 });
  await page.screenshot({ path: testInfo.outputPath('settlement-city.png'), fullPage: true });
});

test('shows the logistics overlay and persists settlement schema v4', async ({ page }) => {
  await createSettlement(page);
  if ((page.viewportSize()?.width ?? 1280) <= 760) {
    await page.getByRole('button', { name: '분석 도구 열기' }).click();
  }
  await page.getByRole('button', { name: '⇄물류', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();
  const storedVersion = await page.evaluate(async () => {
    return await new Promise<number>((resolve, reject) => {
      const open = indexedDB.open('blackwake-pirate-simulator');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('saves', 'readonly');
        const all = tx.objectStore('saves').getAll();
        all.onerror = () => reject(all.error);
        all.onsuccess = () =>
          resolve(
            (all.result[0] as { state: { version: number; settlement: { schemaVersion: number } } })
              .state.version *
              10 +
              (
                all.result[0] as {
                  state: { version: number; settlement: { schemaVersion: number } };
                }
              ).state.settlement.schemaVersion
          );
      };
    });
  });
  expect(storedVersion).toBe(41);
  await page.reload();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
});

test('loads distinct core building bodies as a facility reaches tiers two and three', async ({
  page
}, testInfo) => {
  test.slow();
  await createSettlement(page);
  if ((page.viewportSize()?.width ?? 1280) <= 760) {
    await page.getByRole('button', { name: '시설 장부 열기' }).click();
  }
  await page.getByTestId('facility-campfire').click();
  await expect(page.getByTestId('selected-building-level')).toHaveText('1');

  const tierTwoResponse = page.waitForResponse((response) =>
    response.url().endsWith('/art/settlement/core-buildings-tier2-atlas.png')
  );
  await page.getByRole('button', { name: '확장', exact: true }).click();
  await page.getByRole('button', { name: '3×', exact: true }).click();
  const tierTwo = await tierTwoResponse;
  expect(
    tierTwo.ok() || tierTwo.status() === 304,
    `${tierTwo.url()} returned ${tierTwo.status()}`
  ).toBe(true);
  if (tierTwo.status() !== 304) expect(tierTwo.headers()['content-type']).toContain('image/png');
  await expect(page.getByTestId('selected-building-level')).toHaveText('2', { timeout: 30_000 });

  const tierThreeResponse = page.waitForResponse((response) =>
    response.url().endsWith('/art/settlement/core-buildings-tier3-atlas.png')
  );
  await page.getByRole('button', { name: '확장', exact: true }).click();
  const tierThree = await tierThreeResponse;
  expect(
    tierThree.ok() || tierThree.status() === 304,
    `${tierThree.url()} returned ${tierThree.status()}`
  ).toBe(true);
  if (tierThree.status() !== 304)
    expect(tierThree.headers()['content-type']).toContain('image/png');
  await expect(page.getByTestId('selected-building-level')).toHaveText('3', { timeout: 30_000 });
  await page.screenshot({
    path: testInfo.outputPath('tier-three-core-facility.png'),
    fullPage: true
  });
});
