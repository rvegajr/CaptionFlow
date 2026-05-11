import { test, expect } from '@playwright/test';

// Must match the MACHINE_TRANSLATED_LABEL constant exported from
// src/web/caption-surface/CaptionSurface.tsx exactly. The L1 unit/contract for
// that constant is enforced by re-using the same literal here.
const MACHINE_TRANSLATED_LABEL =
  'Machine-translated from source — not certified for accessibility compliance.';

const FAKE_PAYLOAD = {
  resourceId: '00000000-0000-0000-0000-000000000123',
  youtubeVideoId: 'dQw4w9WgXcQ',
  defaultCaptionId: 'cap-en',
  tracks: [
    {
      id: 'cap-en',
      languageCode: 'en',
      isMachineTranslated: false,
      sourceCaptionId: null,
      cues: [{ start: 0, end: 1, text: 'hello' }],
    },
    {
      id: 'cap-es',
      languageCode: 'es',
      isMachineTranslated: true,
      sourceCaptionId: 'cap-en',
      cues: [{ start: 0, end: 1, text: 'hola' }],
    },
  ],
};

test.describe('translation label visibility', () => {
  test.describe.configure({ timeout: 60_000 });

  test('switching to a machine-translated track shows the required disclosure label', async ({ page }) => {
    await page.route('**/api/public/resources/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_PAYLOAD),
      });
    });

    await page.goto('/caption-surface.html?resource=00000000-0000-0000-0000-000000000123');
    await expect(page.getByLabel('Caption track')).toBeVisible({ timeout: 30_000 });

    // Default is the base track; the label must not be present yet.
    await expect(page.getByText(MACHINE_TRANSLATED_LABEL)).toHaveCount(0);

    await page.getByLabel('Caption track').selectOption('cap-es');
    await expect(page.getByText(MACHINE_TRANSLATED_LABEL)).toBeVisible();
  });
});
