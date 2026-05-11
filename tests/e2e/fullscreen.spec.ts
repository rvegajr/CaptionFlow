import { test, expect } from '@playwright/test';

const FAKE_PAYLOAD = {
  resourceId: '00000000-0000-0000-0000-0000000000fs',
  youtubeVideoId: 'dQw4w9WgXcQ',
  defaultCaptionId: 'cap-en',
  tracks: [
    {
      id: 'cap-en',
      languageCode: 'en',
      isMachineTranslated: false,
      sourceCaptionId: null,
      cues: [{ start: 0, end: 1, text: 'hi' }],
    },
  ],
};

test.describe('fullscreen toggle on caption surface', () => {
  test.describe.configure({ timeout: 60_000 });

  test('clicking the fullscreen button promotes the surface wrapper to document.fullscreenElement', async ({ page }) => {
    await page.route('**/api/public/resources/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_PAYLOAD),
      });
    });

    await page.goto('/caption-surface.html?resource=00000000-0000-0000-0000-0000000000fs');
    await expect(page.getByLabel('Caption track')).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /Fullscreen/i }).click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const fs = document.fullscreenElement as HTMLElement | null;
            return fs ? fs.classList.contains('surface') : false;
          }),
        { timeout: 5_000, intervals: [200, 500, 1000] },
      )
      .toBe(true);
  });
});
