import { expect, test } from '@playwright/test';

async function createSettlement(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '새로운 전설 시작' }).click();
  await page.locator('#captain-name').fill('모건 도시테스트');
  await page.locator('#crew-name').fill('절벽의 망치단');
  await page.locator('#ship-name').fill('난파된 왕관');
  await page.getByRole('button', { name: /건축가/ }).click();
  const atlasResponse = page.waitForResponse(
    (response) => response.url().endsWith('/art/settlement/core-buildings-atlas.png')
  );
  await page.getByRole('button', { name: /검은 깃발을 올린다/ }).click();
  expect((await atlasResponse).ok()).toBe(true);
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
  await expect(page.locator('.settlement-host canvas')).toBeVisible({ timeout: 15_000 });
}

test('places a terrain-bound building and runs its physical construction flow', async ({
  page
}, testInfo) => {
  test.slow();
  await createSettlement(page);
  if (!(await page.getByTestId('build-water-collector').isVisible())) {
    await page.getByRole('button', { name: '건설 메뉴 열기' }).click();
  }
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
  await expect(page.getByText(/CONSTRUCTING|ACTIVE/)).toBeVisible({ timeout: 45_000 });
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
  await page.getByRole('button', { name: /항해 계속하기 · 모건 도시테스트/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
});
