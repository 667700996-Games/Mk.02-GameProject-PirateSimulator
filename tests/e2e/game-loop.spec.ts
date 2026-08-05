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

test('accepts a live contract and opens fleet, faction, and pause commands', async ({ page }) => {
  await createCaptain(page);
  await page.getByRole('button', { name: /임무/ }).click();
  await expect(page.getByRole('heading', { name: '임무와 소문' })).toBeVisible();
  const accept = page.getByRole('button', { name: '수락' }).first();
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page.getByText('활성 1 / 4')).toBeVisible();

  await page.getByRole('button', { name: /함대/ }).click();
  await expect(page.getByRole('heading', { name: '함대와 부하 선장' })).toBeVisible();
  await page.getByRole('button', { name: /세력/ }).click();
  await expect(page.getByRole('heading', { name: '세력과 현상금' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '일시정지' })).toBeVisible();
  await page.getByRole('button', { name: /항해 계속/ }).click();
  await expect(page.getByRole('heading', { name: '세력과 현상금' })).toBeVisible();
});

test('plays every stage of a haven defense and returns to the haven', async ({ page }) => {
  await createCaptain(page);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('항해 기록을 안전하게 보관했습니다.')).toBeVisible();

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('blackwake-pirate-simulator', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const all = store.getAll();
        all.onerror = () => reject(all.error);
        all.onsuccess = () => {
          const record = all.result[0] as { state: { screen: string; defense: Record<string, unknown> } };
          record.state.screen = 'defense';
          record.state.defense = {
            ...record.state.defense,
            active: true,
            attacker: 'red-tide',
            stage: 'warning',
            attackStrength: 180,
            attackerRemaining: 180,
            defenseStrength: 0,
            timeToAttack: Date.now() + 60_000,
            preparation: 0,
            civilianRisk: 55,
            selectedActions: [],
            log: []
          };
          const put = store.put(record);
          put.onerror = () => reject(put.error);
          put.onsuccess = () => resolve();
        };
      };
    });
  });

  await page.reload();
  await page.getByRole('button', { name: /항해 계속하기 · 검은수염 테스트/ }).click();
  await expect(page.getByRole('heading', { name: '검은 깃발을 지켜라' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: '검은물결 은신처' })).toBeVisible();
});
