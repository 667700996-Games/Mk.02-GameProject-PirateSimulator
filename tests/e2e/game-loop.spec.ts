import { expect, test } from '@playwright/test';

async function createCaptain(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: '새로운 전설 시작' }).click();
  await page.locator('#captain-name').fill('검은수염 테스트');
  await page.locator('#crew-name').fill('자동화 해적단');
  await page.locator('#ship-name').fill('테스트 슬루프');
  await page.getByRole('button', { name: /포술가/ }).click();
  await page.getByRole('button', { name: /검은 깃발을 올린다/ }).click();
  await expect(page.getByRole('heading', { name: '검은물결 은신처' })).toBeVisible();
}

test('creates a captain and reaches the live sea scene', async ({ page }, testInfo) => {
  await createCaptain(page);
  await page.screenshot({ path: testInfo.outputPath('haven.png'), fullPage: true });

  await page.getByRole('button', { name: '⚓ 출항 준비', exact: true }).click();
  await expect(page.getByRole('heading', { name: '검은 해도' })).toBeVisible();
  await page.getByRole('button', { name: '이 해역으로 출항' }).click();

  await expect(page.locator('.phaser-host canvas')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/W\/S로 돛을 펼치고/)).toBeVisible({ timeout: 10_000 });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: testInfo.outputPath('sea.png'), fullPage: true });
});

test('persists and restores a save through IndexedDB', async ({ page }) => {
  await createCaptain(page);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ })).toBeVisible();
  await page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ }).click();
  await expect(page.getByRole('heading', { name: '검은물결 은신처' })).toBeVisible();
});
