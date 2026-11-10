import { expect, test } from '@playwright/test';

test('Excel clipboard table has priority over bitmap image preview', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const editor = page.locator('.detail-card .advanced-content .tiptap');
  await editor.click();
  await editor.evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html','<table><tbody><tr><td>이름</td><td>금액</td></tr><tr><td>테스트</td><td>1200</td></tr></tbody></table>');
    clipboardData.setData('text/plain','이름\t금액\n테스트\t1200');
    clipboardData.items.add(new File([new Uint8Array([137,80,78,71])],'preview.png',{type:'image/png'}));
    element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData}));
  });
  await expect(editor.locator('table tr')).toHaveCount(2);
  await expect(editor.locator('table td')).toHaveCount(4);
  await expect(editor.locator('img')).toHaveCount(0);
  await expect(editor.locator('table')).toContainText('테스트');
});

test('tab-separated clipboard values are pasted as an editable table', async ({page})=>{
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.tabs').getByRole('button',{name:'자유메모'}).click();
  const editor=page.locator('.detail-card .advanced-content .tiptap');
  await editor.click();
  await editor.evaluate(element=>{
    const clipboardData=new DataTransfer();
    clipboardData.setData('text/plain','A\tB\n1\t2');
    element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData}));
  });
  await expect(editor.locator('table tr')).toHaveCount(2);
  await expect(editor.locator('table td')).toHaveCount(4);
});
