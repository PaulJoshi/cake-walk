import { expect, test } from '@playwright/test';

test('loads, starts, walks for 3 s with no console errors and the timer decreasing', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Daily' })).toBeVisible();

  const timeLeft = () =>
    page.evaluate(
      () =>
        (window as unknown as { cakeWalk: { world: { timeLeft: number } } }).cakeWalk.world
          .timeLeft,
    );
  const state = () =>
    page.evaluate(
      () => (window as unknown as { cakeWalk: { stateName: string } }).cakeWalk.stateName,
    );

  await page.getByRole('button', { name: 'Play Daily' }).click();
  await expect.poll(state, { timeout: 8000 }).toBe('playing');
  const before = await timeLeft();

  await page.keyboard.down('Space');
  await page.waitForTimeout(3000);
  await page.keyboard.up('Space');

  const after = await timeLeft();
  // The clock stops if the unbalanced cake topples, so only require that it went down.
  expect(after).toBeLessThan(before);
  const x = await page.evaluate(
    () =>
      (window as unknown as { cakeWalk: { world: { waiter: { x: number } } } }).cakeWalk.world
        .waiter.x,
  );
  expect(x).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});
