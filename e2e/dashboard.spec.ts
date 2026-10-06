import { expect, test } from '@playwright/test';

test('desktop user can manage the dashboard naturally', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const title = page.getByLabel('대시보드 제목');
  await expect(title).toHaveValue('나의 대시보드');
  await title.fill('업무 대시보드');
  await page.getByLabel('대시보드 설명').fill('오늘 필요한 일만 한눈에');

  const todoCard = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const todoDraft = todoCard.locator('.todo-add textarea');
  await todoDraft.fill('첫 줄\n둘째 줄');
  await todoCard.getByRole('button', { name: '추가' }).click();
  await expect(todoCard.locator('.todo-item textarea').first()).toHaveValue('첫 줄\n둘째 줄');

  await todoCard.locator('.todo-check').first().check();
  await expect(todoCard.locator('.todo-summary')).toContainText('0');
  await expect(todoCard.locator('.completed-toggle')).toContainText('완료 1');

  const favorite = todoCard.getByLabel('즐겨찾기');
  const deleteCard = todoCard.getByLabel('카드 삭제');
  await favorite.click();
  await expect(deleteCard).toBeDisabled();
  await favorite.click();
  await expect(deleteCard).toBeEnabled();

  await page.locator('.add-card-tile').click();
  await page.getByRole('button', { name: /메모보드/ }).click();
  await expect(page.locator('.tabs').getByRole('button', { name: '메모보드' })).toBeVisible();

  const boardCard = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  await boardCard.getByRole('button', { name: '포스트잇' }).click();
  await boardCard.locator('.postit textarea').fill('확인할 메모');
  await boardCard.getByRole('button', { name: '포스트잇 색상 변경' }).click();
  await expect(boardCard.locator('.color-palette')).toBeVisible();
  await boardCard.getByRole('button', { name: 'pink 색상' }).click();
  await expect(boardCard.locator('.postit')).toHaveClass(/pink/);

  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const richEditor = page.locator('.detail-card .rich-editor');
  await expect(richEditor).toBeVisible();
  await richEditor.fill('상세 메모');
  await richEditor.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.getByLabel('굵게').click();
  await expect(richEditor).toHaveJSProperty('innerText', '상세 메모');

  await page.getByRole('button', { name: '설정' }).click();
  const autoCompact = page.locator('.switch input[type="checkbox"]');
  await expect(autoCompact).toBeChecked();
  await autoCompact.uncheck();
  await expect(autoCompact).not.toBeChecked();
  await page.locator('.settings-modal').getByLabel('닫기').click();

  await page.locator('.tabs').getByRole('button', { name: '메인' }).click();
  const boardDelete = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])').getByLabel('카드 삭제');
  await boardDelete.click();
  await expect(page.getByRole('dialog')).toContainText('카드를 삭제할까요?');
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.locator('.dashboard-card:has(input.card-title[value="메모보드"])')).toBeVisible();

  await boardDelete.click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.locator('.dashboard-card:has(input.card-title[value="메모보드"])')).toHaveCount(0);

  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByLabel('대시보드 제목')).toHaveValue('업무 대시보드');
  const reloadedTodo = page.locator('.dashboard-card:has(.todo-card-content)').first();
  await expect(reloadedTodo.locator('.completed-toggle')).toContainText('완료 1');
});

test('mobile keeps the desktop layout safe and stacks cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.mobile-card-stack')).toBeVisible();
  await expect(page.locator('.react-grid-layout')).toHaveCount(0);
  await expect(page.locator('.mobile-card-stack .dashboard-card')).toHaveCount(2);
  await page.locator('.tabs').getByRole('button', { name: '할 일' }).click();
  await expect(page.locator('.detail-card .todo-card-content')).toBeVisible();
});
