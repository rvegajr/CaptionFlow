import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VTT = `WEBVTT

00:00:00.000 --> 00:00:02.000
hi
`;

async function loginViaMagicLink(page: Page, email: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send link' }).click();
  await expect(page.getByText(/Check your email/i)).toBeVisible();
  const link = await page.evaluate(async () => {
    const r = await fetch('/__test__/last-magic-link');
    const j = (await r.json()) as { link?: string };
    return j.link ?? null;
  });
  if (!link) throw new Error('test endpoint /__test__/last-magic-link returned null');
  await page.goto(link);
  await expect(page).toHaveURL(/#captions$/);
}

async function expectNoSeriousA11y(page: Page, exclude: string[] = []): Promise<void> {
  const builder = new AxeBuilder({ page });
  for (const sel of exclude) builder.exclude(sel);
  const results = await builder.analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(
    bad,
    `axe violations:\n${bad.map((v) => `${v.id}: ${v.help}\n  nodes: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`).join('\n')}`,
  ).toEqual([]);
}

test.describe('axe — dashboard shell', () => {
  test('login shell has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expectNoSeriousA11y(page);
  });
});

test.describe('axe — authenticated dashboard routes', () => {
  test.describe.configure({ timeout: 120_000 });

  test('captions, upload, resources, admin pages all pass axe', async ({ page }) => {
    await loginViaMagicLink(page, `a11y+${Date.now()}@example.com`);

    await expect(page.getByRole('heading', { name: 'Captions' })).toBeVisible();
    await expectNoSeriousA11y(page);

    await page.locator('nav.nav a[href="#upload"]').click();
    await expect(page.getByRole('heading', { name: 'Upload caption' })).toBeVisible();
    await expectNoSeriousA11y(page);

    await page.locator('nav.nav a[href="#resources"]').click();
    await expect(page.getByRole('heading', { name: 'Captioned resources' })).toBeVisible();
    await expectNoSeriousA11y(page);

    await page.locator('nav.nav a[href="#admin"]').click();
    await expect(page.getByRole('heading', { name: 'Institution view counts' })).toBeVisible();
    await expectNoSeriousA11y(page);
  });
});

test.describe('axe — caption surface', () => {
  test.describe.configure({ timeout: 120_000 });

  test('caption surface (loaded) passes axe outside of the YouTube iframe', async ({ page }) => {
    await loginViaMagicLink(page, `surf+${Date.now()}@example.com`);

    await page.locator('nav.nav a[href="#upload"]').click();
    await page.getByLabel('YouTube URL or video ID').fill('dQw4w9WgXcQ');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.vtt',
      mimeType: 'text/vtt',
      buffer: Buffer.from(VTT),
    });
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByText(/Uploaded caption/)).toBeVisible({ timeout: 15_000 });

    await page.locator('nav.nav a[href="#resources"]').click();
    await page.getByLabel('YouTube URL or ID').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: 'Create' }).click();
    const row = page
      .locator('table.table tbody tr', { has: page.getByRole('cell', { name: 'dQw4w9WgXcQ' }) })
      .first();
    await row.locator('select').selectOption({ index: 1 });
    const href = await row.getByRole('link', { name: 'Open surface' }).getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await expect(page.getByLabel('Caption track')).toBeVisible({ timeout: 30_000 });

    // Exclude the YouTube iframe wrapper (third-party content we cannot fix here).
    await expectNoSeriousA11y(page, ['.surface__player-wrap', 'iframe']);
  });
});
