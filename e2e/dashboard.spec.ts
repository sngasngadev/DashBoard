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


test('auto compact off keeps cards still while dragging, then pushes only on drop', async ({ page }) => {
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
  await page.waitForTimeout(350);

  const todoAfter = await todoCard.boundingBox();
  const boardAfter = await boardCard.boundingBox();
  if (!todoAfter || !boardAfter) throw new Error('cards disappeared after drag');

  // No live pushing while hovering, but the occupied card is displaced after drop.
  expect(Math.abs(todoAfter.x - todoBefore.x) + Math.abs(todoAfter.y - todoBefore.y)).toBeGreaterThan(5);

  const overlap = boardAfter.x < todoAfter.x + todoAfter.width - 1
    && boardAfter.x + boardAfter.width > todoAfter.x + 1
    && boardAfter.y < todoAfter.y + todoAfter.height - 1
    && boardAfter.y + boardAfter.height > todoAfter.y + 1;
  expect(overlap).toBe(false);
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
  await page.waitForTimeout(300);
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

  // Reproduce the real-world layout with three normal cards plus the add tile.
  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();

  const targetHandle = page.locator('.dashboard-card:has(input.card-title[value="자유메모"])').getByRole('button', { name: '카드 이동' });
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
  await page.waitForTimeout(300);
  await assertNoOverlap();
});


test('memo-board post-its reorder by drag and always repack without overlap', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();

  const board = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  for (let i = 0; i < 3; i += 1) {
    await board.getByRole('button', { name: '포스트잇', exact: true }).click();
  }

  const notes = board.locator('.postit');
  await expect(notes).toHaveCount(3);
  await notes.nth(0).locator('textarea').fill('첫째');
  await notes.nth(1).locator('textarea').fill('둘째');
  await notes.nth(2).locator('textarea').fill('셋째');

  const assertPacked = async () => {
    const canvas = await board.locator('.postit-canvas').boundingBox();
    const boxes = await board.locator('.postit').evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      })
    );
    if (!canvas) throw new Error('post-it canvas not visible');
    expect(Math.abs(boxes[0].x - canvas.x)).toBeLessThan(3);
    expect(Math.abs(boxes[0].y - canvas.y)).toBeLessThan(3);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
        expect(overlap, `post-its ${i} and ${j} overlap`).toBe(false);
      }
    }
  };

  await assertPacked();

  const thirdHandle = board.locator('.postit').nth(2).getByRole('button', { name: '포스트잇 이동' });
  const firstNote = board.locator('.postit').nth(0);
  const handleBox = await thirdHandle.boundingBox();
  const firstBox = await firstNote.boundingBox();
  if (!handleBox || !firstBox) throw new Error('post-it drag targets not visible');

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + 12, firstBox.y + 12, { steps: 12 });
  await page.waitForTimeout(120);

  const preview = board.locator('.postit-drop-preview');
  await expect(preview).toBeVisible();
  const previewBox = await preview.boundingBox();
  if (!previewBox) throw new Error('post-it drop preview is not visible');

  await page.mouse.up();
  await page.waitForTimeout(300);

  await expect(board.locator('.postit textarea').first()).toHaveValue('셋째');
  const movedBox = await board.locator('.postit').first().boundingBox();
  if (!movedBox) throw new Error('moved post-it is not visible');
  expect(Math.abs(movedBox.x - previewBox.x)).toBeLessThan(3);
  expect(Math.abs(movedBox.y - previewBox.y)).toBeLessThan(3);
  await assertPacked();

  await page.waitForTimeout(500);
  await page.reload();

  const reloaded = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  await expect(reloaded.locator('.postit textarea').first()).toHaveValue('셋째');
});


test('free memo preserves Enter line breaks in main and detail views', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const memoCard = page.locator('.dashboard-card:has(input.card-title[value="자유메모"])');
  const simple = memoCard.locator('.simple-memo');

  await simple.fill('첫줄');
  await simple.press('Enter');
  await simple.type('둘째줄');
  await expect(simple).toHaveJSProperty('innerText', '첫줄\n둘째줄');

  await page.waitForTimeout(500);
  await page.reload();

  const reloadedSimple = page.locator('.dashboard-card:has(input.card-title[value="자유메모"]) .simple-memo');
  await expect(reloadedSimple).toHaveJSProperty('innerText', '첫줄\n둘째줄');

  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const rich = page.locator('.detail-card .rich-editor');
  await expect(rich).toBeVisible();
  await rich.click();
  await rich.press('End');
  await rich.press('Enter');
  await rich.type('셋째줄');

  await expect(rich).toContainText('첫줄');
  await expect(rich).toContainText('둘째줄');
  await expect(rich).toContainText('셋째줄');

  await page.waitForTimeout(500);
  await page.reload();
  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const richReloaded = page.locator('.detail-card .rich-editor');
  await expect(richReloaded).toContainText('셋째줄');
});


test('rich memo formatting survives a later main-view edit', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const rich = page.locator('.detail-card .rich-editor');
  await rich.fill('서식 유지');
  await rich.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.getByLabel('굵게').click();
  await expect(rich.locator('b, strong')).toContainText('서식 유지');

  await page.locator('.tabs').getByRole('button', { name: '메인' }).click();
  const simple = page.locator('.dashboard-card:has(input.card-title[value="자유메모"]) .simple-memo');
  await simple.click();
  await simple.press('End');
  await simple.type(' 확인');

  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const richAgain = page.locator('.detail-card .rich-editor');
  await expect(richAgain.locator('b, strong')).toContainText('서식 유지');
  await expect(richAgain).toContainText('확인');
});


test('todo draft survives card movement before it is added', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const todo = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const draft = todo.locator('.todo-add textarea');
  await draft.fill('아직 추가하지 않은 초안');

  const memo = page.locator('.dashboard-card:has(input.card-title[value="자유메모"])');
  const handle = memo.getByRole('button', { name: '카드 이동' });
  const todoBox = await todo.boundingBox();
  const handleBox = await handle.boundingBox();
  if (!todoBox || !handleBox) throw new Error('card drag targets are not visible');

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(todoBox.x + 20, todoBox.y + 20, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  await expect(page.locator('.dashboard-card:has(.todo-card-content)').first().locator('.todo-add textarea'))
    .toHaveValue('아직 추가하지 않은 초안');
});


test('schedule card sorts by date, highlights urgency, and collapses completed items', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /일정/ }).click();

  const card = page.locator('.dashboard-card:has(input.card-title[value="일정"])');
  await expect(card).toBeVisible();

  const dates = await page.evaluate(() => {
    const fmt = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const shift = (days: number) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + days);
      return fmt(date);
    };
    return { overdue: shift(-1), soon: shift(3), normal: shift(4) };
  });

  const dateInput = card.getByLabel('새 일정 날짜');
  const textInput = card.getByLabel('새 일정 내용');
  const addButton = card.getByRole('button', { name: '추가' });

  await expect(addButton).toBeDisabled();

  for (const item of [
    { date: dates.normal, text: '나중 일정' },
    { date: dates.overdue, text: '지난 일정' },
    { date: dates.soon, text: '임박 일정' }
  ]) {
    await dateInput.fill(item.date);
    await textInput.fill(item.text);
    await addButton.click();
  }

  const rows = card.locator('.schedule-item:not(.done)');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).getByLabel('일정 내용')).toHaveValue('지난 일정');
  await expect(rows.nth(1).getByLabel('일정 내용')).toHaveValue('임박 일정');
  await expect(rows.nth(2).getByLabel('일정 내용')).toHaveValue('나중 일정');

  await expect(rows.nth(0)).toHaveClass(/overdue/);
  await expect(rows.nth(1)).toHaveClass(/soon/);
  await expect(rows.nth(2)).toHaveClass(/normal/);

  await rows.nth(1).getByLabel('일정 완료').click();

  await expect(card.locator('.schedule-item:not(.done)')).toHaveCount(2);
  const completedToggle = card.locator('.schedule-completed .completed-toggle');
  await expect(completedToggle).toContainText('완료 1');
  await expect(card.locator('.schedule-completed .schedule-item')).toHaveCount(0);

  await completedToggle.click();
  await expect(card.locator('.schedule-completed .schedule-item')).toHaveCount(1);
  await expect(card.locator('.schedule-completed .schedule-item').getByLabel('일정 내용')).toHaveValue('임박 일정');

  await page.waitForTimeout(500);
  await page.reload();

  const reloaded = page.locator('.dashboard-card:has(input.card-title[value="일정"])');
  await expect(reloaded.locator('.schedule-item:not(.done)')).toHaveCount(2);
  await expect(reloaded.locator('.schedule-completed .completed-toggle')).toContainText('완료 1');
});
