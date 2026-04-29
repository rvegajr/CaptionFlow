import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('axe — dashboard shell', () => {
  test('login shell has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(bad).toEqual([]);
  });
});
