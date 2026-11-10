import { expect, test } from '@playwright/test';

test('whole-card archive hides card and restores it without losing contents',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  const card=page.locator('.dashboard-card:has(.todo-card-content)').first();
  await card.locator('.todo-add textarea').fill('보관해둘 할 일');
  await card.getByRole('button',{name:'추가'}).click();
  page.once('dialog',dialog=>dialog.accept());
  await card.getByRole('button',{name:'카드 보관'}).click();
  await expect(page.locator('.dashboard-card:has(.todo-card-content)')).toHaveCount(0);
  await expect(page.locator('.tabs').getByRole('button',{name:'할 일'})).toHaveCount(0);
  await page.getByRole('button',{name:'설정'}).click();
  await page.getByRole('button',{name:'보관함 열기'}).click();
  await expect(page.locator('.archive-modal')).toContainText('할 일');
  await page.locator('.archive-modal').getByRole('button',{name:'카드 복원'}).click();
  await page.locator('.archive-modal').getByRole('button',{name:'닫기'}).click();
  await expect(page.locator('.dashboard-card:has(.todo-card-content) .todo-item textarea')).toHaveValue('보관해둘 할 일');
  await page.reload();
  await expect(page.locator('.dashboard-card:has(.todo-card-content) .todo-item textarea')).toHaveValue('보관해둘 할 일');
});
