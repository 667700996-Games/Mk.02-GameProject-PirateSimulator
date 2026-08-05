import { expect, test } from '@playwright/test';

async function createSettlement(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '새로운 전설 시작' }).click();
  await page.locator('#captain-name').fill('모건 도시테스트');
  await page.locator('#crew-name').fill('절벽의 망치단');
  await page.locator('#ship-name').fill('난파된 왕관');
  await page.getByRole('button', { name: /건축가/ }).click();
  await page.getByRole('button', { name: /검은 깃발을 올린다/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
  await expect(page.locator('.settlement-host canvas')).toBeVisible({ timeout: 15_000 });
}

test('places a terrain-bound building and runs its physical construction flow', async ({ page }, testInfo) => {
  await createSettlement(page);
  await page.getByTestId('build-water-collector').click();
  const canvas = page.locator('.settlement-host canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: Math.floor(box!.width * 0.5), y: Math.floor(box!.height * 0.5) } });
  await expect(page.getByText('빗물 집수장 계획 배치')).toBeVisible();
  await page.getByRole('button', { name: '3×', exact: true }).click();
  await expect(page.getByText(/CONSTRUCTING|ACTIVE/)).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: testInfo.outputPath('settlement-city.png'), fullPage: true });
});

test('shows the logistics overlay and persists settlement schema v3', async ({ page }) => {
  await createSettlement(page);
  await page.getByRole('button', { name: '⇄물류', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();
  const storedVersion = await page.evaluate(async () => {
    return await new Promise<number>((resolve, reject) => {
      const open = indexedDB.open('blackwake-pirate-simulator', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('saves', 'readonly');
        const all = tx.objectStore('saves').getAll();
        all.onerror = () => reject(all.error);
        all.onsuccess = () => resolve((all.result[0] as { state: { version: number; settlement: { schemaVersion: number } } }).state.version * 10 + (all.result[0] as { state: { version: number; settlement: { schemaVersion: number } } }).state.settlement.schemaVersion);
      };
    });
  });
  expect(storedVersion).toBe(31);
  await page.reload();
  await page.getByRole('button', { name: /항해 계속하기 · 모건 도시테스트/ }).click();
  await expect(page.getByTestId('settlement-screen')).toBeVisible();
});
