import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __captionflowSpikeE2e?: {
      seekTo: (sec: number) => void;
      play: () => void;
      pause: () => void;
    };
  }
}

/**
 * Pinned public-domain video (Big Buck Bunny) + inline VTT on the spike page.
 * @see src/web/spike/main.ts
 */
const SCENARIOS: { t: number; text: string }[] = [
  { t: 1, text: 'E2E cue one' },
  { t: 3, text: 'E2E cue two' },
  { t: 7, text: 'E2E cue three' },
  { t: 15, text: 'E2E cue four' },
  { t: 25, text: 'E2E cue five' },
  { t: 40, text: 'E2E cue six' },
];

test.describe('YouTube sync spike (pinned video)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('displays expected cue text at six timestamps', async ({ page }) => {
    await page.goto('/spike/index.html?e2e=1');

    await page.waitForFunction(() => window.__captionflowSpikeE2e != null, null, {
      timeout: 90_000,
    });

    const cue = page.locator('#cue');

    for (const { t, text } of SCENARIOS) {
      await page.evaluate(
        ({ sec }) => {
          const api = window.__captionflowSpikeE2e;
          if (!api) throw new Error('missing __captionflowSpikeE2e');
          api.seekTo(sec);
          api.play();
        },
        { sec: t },
      );

      await expect(cue).toContainText(text, { timeout: 30_000 });

      await page.evaluate(() => {
        window.__captionflowSpikeE2e?.pause();
      });
    }
  });
});
