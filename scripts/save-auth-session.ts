/**
 * Helper script to save authentication session for automated scripts
 * 
 * Run this once after signing in manually to save your session:
 * npx tsx scripts/save-auth-session.ts
 */

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

async function saveAuthSession() {
  console.log('🔐 Opening browser to save authentication session...\n');
  console.log('Please sign in to CaptionFlow in the browser that opens.');
  console.log('Once you see your dashboard, this script will save your session.\n');

  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'  // Use regular Chrome if available
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto('https://captionflow.link/#login');

    console.log('⏳ Waiting for you to sign in...');
    console.log('   1. Enter your email');
    console.log('   2. Click "Send sign-in link"');
    console.log('   3. Check your email and click the link');
    console.log('   4. Wait for dashboard to load\n');

    // Wait for navigation to dashboard (any hash route that's not login)
    await page.waitForURL((url) => {
      const hash = url.hash;
      return hash !== '#login' && hash !== '' && hash !== '#';
    }, { timeout: 5 * 60 * 1000 }); // 5 minute timeout

    console.log('✅ Signed in successfully!\n');

    // Wait a bit to ensure session is established
    await page.waitForTimeout(2000);

    // Save storage state
    const authDir = join(process.cwd(), 'playwright', '.auth');
    await mkdir(authDir, { recursive: true });
    
    const authFile = join(authDir, 'user.json');
    await context.storageState({ path: authFile });

    console.log('💾 Session saved to:', authFile);
    console.log('\n✨ You can now run automated scripts like:');
    console.log('   npx tsx scripts/register-demo-lms.ts\n');

  } catch (error) {
    console.error('❌ Error saving session:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

saveAuthSession().catch(console.error);
