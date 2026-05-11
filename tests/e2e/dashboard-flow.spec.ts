import { test, expect, type Page } from '@playwright/test';

const VTT = `WEBVTT

00:00:00.000 --> 00:00:02.000
hello dashboard

00:00:02.000 --> 00:00:04.000
flow test
`;

async function loginViaMagicLink(page: Page, email: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send link' }).click();
  await expect(page.getByText(/Check your email/i)).toBeVisible();

  // Test-only endpoint exposed when EXPOSE_LAST_MAGIC_LINK=1.
  const link = await page.evaluate(async () => {
    const r = await fetch('/__test__/last-magic-link');
    const j = (await r.json()) as { link?: string };
    return j.link ?? null;
  });
  if (!link) throw new Error('test endpoint /__test__/last-magic-link returned null');
  await page.goto(link);
  await expect(page).toHaveURL(/#captions$/);
}

test.describe('dashboard flow', () => {
  test.describe.configure({ timeout: 120_000 });

  test('login -> upload -> list -> resource -> surface render', async ({ page }) => {
    const email = `dash+${Date.now()}@example.com`;
    await loginViaMagicLink(page, email);

    await expect(page.getByRole('heading', { name: 'Captions' })).toBeVisible();

    await page.locator('nav.nav a[href="#upload"]').click();
    await expect(page.getByRole('heading', { name: 'Upload caption' })).toBeVisible();

    await page.getByLabel('YouTube URL or video ID').fill('dQw4w9WgXcQ');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'sample.vtt',
      mimeType: 'text/vtt',
      buffer: Buffer.from(VTT),
    });
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByText(/Uploaded caption/)).toBeVisible({ timeout: 15_000 });

    await page.locator('nav.nav a[href="#captions"]').click();
    await expect(page.getByRole('cell', { name: 'dQw4w9WgXcQ' }).first()).toBeVisible();

    await page.locator('nav.nav a[href="#resources"]').click();
    await expect(page.getByRole('heading', { name: 'Captioned resources' })).toBeVisible();
    await page.getByLabel('YouTube URL or ID').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: 'Create' }).click();

    const resourceRow = page.locator('table.table tbody tr', {
      has: page.getByRole('cell', { name: 'dQw4w9WgXcQ' }),
    }).first();
    await expect(resourceRow).toBeVisible();

    await resourceRow.locator('select').selectOption({ index: 1 });

    const surfaceLink = await resourceRow.getByRole('link', { name: 'Open surface' }).getAttribute('href');
    expect(surfaceLink).toBeTruthy();

    await page.goto(surfaceLink!);
    await expect(page.getByLabel('Caption track')).toBeVisible({ timeout: 30_000 });
    const optionsCount = await page.locator('#track option').count();
    expect(optionsCount).toBeGreaterThan(0);
  });
});
