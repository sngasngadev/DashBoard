import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const dir = 'test-results/usability';

test('capture representative desktop and mobile usage states', async ({ page }) => {
  fs.mkdirSync(dir, { recursive: true });

  await page.goto('/');
  await expect(page.getByLabel('대시보드 제목')).toBeVisible();
  await page.screenshot({ path: `${dir}/01-initial-desktop.png`, fullPage: true });

  const todo = page.locator('.dashboard-card:has(.todo-card-content)').first();
  const draft = todo.locator('.todo-add textarea');
  for (const text of [
    '고객사 주간회의 자료 정리',
    '개발팀 확인 사항\n- 인터페이스 오류\n- 일정 영향 검토',
    '금요일까지 결재 요청',
    '다음주 일정 확인'
  ]) {
    await draft.fill(text);
    await todo.getByRole('button', { name: '추가' }).click();
  }
  await todo.locator('.todo-check').nth(1).check();
  await expect(todo.locator('.completed-toggle')).toContainText('완료 1');

  await page.locator('.add-card-tile .add-card-action').click();
  await page.getByRole('button', { name: /메모보드/ }).click();

  const board = page.locator('.dashboard-card:has(input.card-title[value="메모보드"])');
  for (let i = 0; i < 4; i += 1) await board.getByRole('button', { name: '포스트잇', exact: true }).click();
  const notes = board.locator('.postit');
  await notes.nth(0).locator('textarea').fill('이번 주 핵심 이슈\n고객 요청사항 우선 확인');
  await notes.nth(1).locator('textarea').fill('회의에서 확인할 것');
  await notes.nth(2).locator('textarea').fill('장기 메모\n관련 부서 답변 대기\n다음 회의에서 다시 확인');
  await notes.nth(3).locator('textarea').fill('짧은 메모');

  const resize = notes.nth(0).getByRole('button', { name: '포스트잇 크기 조절' });
  const box = await resize.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 70, { steps: 8 });
    await page.mouse.up();
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${dir}/02-filled-dashboard.png`, fullPage: true });

  await page.locator('.tabs').getByRole('button', { name: '자유메모' }).click();
  const rich = page.locator('.detail-card .rich-editor');
  await rich.fill('프로젝트 메모\n\n중요한 내용은 상세 화면에서 정리하고, 메인에서는 빠르게 확인한다.');
  await rich.press('Control+A');
  await page.getByLabel('굵게').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${dir}/03-memo-detail.png`, fullPage: true });

  await page.getByRole('button', { name: '설정' }).click();
  await page.screenshot({ path: `${dir}/04-settings.png`, fullPage: true });
  await page.locator('.settings-modal').getByLabel('닫기').click();

  await page.locator('.tabs').getByRole('button', { name: '메인' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/05-mobile-main.png`, fullPage: true });
});
