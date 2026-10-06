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


test('dragging a card forward pushes the others and auto-fills gaps naturally', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();

  const boardCard = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  const todoCard = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const boardHandle = boardCard.getByRole('button', { name: '카드 이동' });

  const boardBoxBefore = await boardCard.boundingBox();
  const todoBoxBefore = await todoCard.boundingBox();
  const handleBox = await boardHandle.boundingBox();
  if (!boardBoxBefore || !todoBoxBefore || !handleBox) throw new Error('drag targets are not visible');

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(todoBoxBefore.x + 35, todoBoxBefore.y + 25, { steps: 12 });
  await page.waitForTimeout(120);

  const todoDuring = await todoCard.boundingBox();
  if (!todoDuring) throw new Error('todo card disappeared during drag');
  expect(Math.abs(todoDuring.x - todoBoxBefore.x)).toBeLessThan(2);
  expect(Math.abs(todoDuring.y - todoBoxBefore.y)).toBeLessThan(2);

  await page.mouse.up();
  await page.waitForTimeout(250);

  const boardBoxAfter = await boardCard.boundingBox();
  const todoBoxAfter = await todoCard.boundingBox();
  if (!boardBoxAfter || !todoBoxAfter) throw new Error('cards disappeared after drag');

  expect(boardBoxAfter.y).toBeLessThanOrEqual(todoBoxAfter.y + 2);
  expect(boardBoxAfter.x).toBeLessThan(todoBoxAfter.x);

  const gridBox = await page.locator('.react-grid-layout').boundingBox();
  if (!gridBox) throw new Error('grid is not visible');
  expect(Math.abs(boardBoxAfter.x - gridBox.x)).toBeLessThan(8);

  await page.waitForTimeout(500);
  await page.reload();

  const boardReloaded = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  const todoReloaded = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const boardReloadedBox = await boardReloaded.boundingBox();
  const todoReloadedBox = await todoReloaded.boundingBox();
  if (!boardReloadedBox || !todoReloadedBox) throw new Error('reloaded cards are not visible');

  expect(boardReloadedBox.x).toBeLessThan(todoReloadedBox.x);
  const reloadedGridBox = await page.locator('.react-grid-layout').boundingBox();
  if (!reloadedGridBox) throw new Error('reloaded grid is not visible');
  expect(Math.abs(boardReloadedBox.x - reloadedGridBox.x)).toBeLessThan(8);
});


test('auto compact off keeps other cards fixed during collisions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();

  await page.getByRole('button', { name: '설정' }).click();
  const autoCompact = page.locator('.switch input[type="checkbox"]');
  await autoCompact.uncheck();
  await page.locator('.settings-modal').getByLabel('닫기').click();

  const todoCard = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const boardCard = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  const boardHandle = boardCard.getByRole('button', { name: '카드 이동' });

  const todoBefore = await todoCard.boundingBox();
  const handleBox = await boardHandle.boundingBox();
  if (!todoBefore || !handleBox) throw new Error('drag targets are not visible');

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(todoBefore.x + todoBefore.width / 2, todoBefore.y + todoBefore.height / 2, { steps: 12 });
  await page.waitForTimeout(150);

  const todoDuring = await todoCard.boundingBox();
  if (!todoDuring) throw new Error('todo card disappeared during drag');
  expect(Math.abs(todoDuring.x - todoBefore.x)).toBeLessThan(2);
  expect(Math.abs(todoDuring.y - todoBefore.y)).toBeLessThan(2);

  await page.mouse.up();
  await page.waitForTimeout(150);

  const todoAfter = await todoCard.boundingBox();
  if (!todoAfter) throw new Error('todo card disappeared after drag');
  expect(Math.abs(todoAfter.x - todoBefore.x)).toBeLessThan(2);
  expect(Math.abs(todoAfter.y - todoBefore.y)).toBeLessThan(2);
});


test('final layout never overlaps, including the add-card tile', async ({ page }) => {
  const assertNoOverlap = async () => {
    const boxes = await page.locator('.react-grid-layout > div').evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      })
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps = a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
        expect(overlaps, `items ${i} and ${j} overlap`).toBe(false);
      }
    }
  };

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();
  await assertNoOverlap();

  const todoCard = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const todoBox = await todoCard.boundingBox();
  const addHandle = page.getByRole('button', { name: '카드 추가 타일 이동' });
  const addHandleBox = await addHandle.boundingBox();
  if (!todoBox || !addHandleBox) throw new Error('add tile drag targets are not visible');

  await page.mouse.move(addHandleBox.x + addHandleBox.width / 2, addHandleBox.y + addHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(todoBox.x + todoBox.width / 2, todoBox.y + todoBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await assertNoOverlap();

  const boardCard = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  const boardHandle = boardCard.getByRole('button', { name: '카드 이동' });
  const memoCard = page.locator('.dashboard-card:has(input.card-title[value="자유메모"])');
  const boardHandleBox = await boardHandle.boundingBox();
  const memoBox = await memoCard.boundingBox();
  if (!boardHandleBox || !memoBox) throw new Error('card drag targets are not visible');

  await page.mouse.move(boardHandleBox.x + boardHandleBox.width / 2, boardHandleBox.y + boardHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(memoBox.x + memoBox.width / 2, memoBox.y + memoBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await assertNoOverlap();

  await page.waitForTimeout(500);
  await page.reload();
  await assertNoOverlap();
});


test('dropping add-card tile exactly on a card handle never overlaps', async ({ page }) => {
  const assertNoOverlap = async () => {
    const boxes = await page.locator('.react-grid-layout > div').evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      })
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
        expect(overlap, `items ${i} and ${j} overlap`).toBe(false);
      }
    }
  };

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const targetHandle = page.locator('.dashboard-card').first().getByRole('button', { name: '카드 이동' });
  const targetHandleBox = await targetHandle.boundingBox();
  const addHandle = page.getByRole('button', { name: '카드 추가 타일 이동' });
  const addHandleBox = await addHandle.boundingBox();
  if (!targetHandleBox || !addHandleBox) throw new Error('drag handles are not visible');

  await page.mouse.move(addHandleBox.x + addHandleBox.width / 2, addHandleBox.y + addHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetHandleBox.x + targetHandleBox.width / 2, targetHandleBox.y + targetHandleBox.height / 2, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  await assertNoOverlap();

  await page.waitForTimeout(500);
  await page.reload();
  await assertNoOverlap();
});
