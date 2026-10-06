import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('single HTML opens directly from disk and keeps data after reload', async ({ page }) => {
  const fileUrl = pathToFileURL(path.join(process.cwd(), 'dist', 'index.html')).href;
  await page.goto(fileUrl);

  const title = page.getByLabel('대시보드 제목');
  await expect(title).toHaveValue('나의 대시보드');
  await title.fill('오프라인 대시보드');

  await page.waitForTimeout(500);
  await page.reload();

  await expect(page.getByLabel('대시보드 제목')).toHaveValue('오프라인 대시보드');
  await expect(page.locator('.dashboard-card')).toHaveCount(2);
});
