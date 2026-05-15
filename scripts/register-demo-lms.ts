/**
 * Playwright script to register Demo LMS platform in CaptionFlow admin UI
 * 
 * Prerequisites:
 * - Sign in to CaptionFlow once manually to establish session
 * - Run this script: npx tsx scripts/register-demo-lms.ts
 */

import { chromium } from '@playwright/test';

async function registerDemoLMS() {
  console.log('🚀 Starting Demo LMS platform registration...\n');

  // Launch browser with existing user data (preserves login session)
  const browser = await chromium.launch({ 
    headless: false,  // Show browser so you can see what's happening
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    // Use storage state if it exists (preserves cookies/session)
    storageState: 'playwright/.auth/user.json'
  }).catch(async () => {
    // If no saved session, create fresh context
    console.log('⚠️  No saved session found. You may need to sign in first.');
    return await browser.newContext();
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to CaptionFlow LMS Config page...');
    await page.goto('https://captionflow.link/#lms-config', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if we're on login page (not authenticated)
    const isLoginPage = await page.locator('text=Sign in').count() > 0;
    if (isLoginPage) {
      console.log('❌ Not authenticated. Please sign in first:');
      console.log('   1. Go to https://captionflow.link/#login');
      console.log('   2. Enter your email and click the sign-in link');
      console.log('   3. Run this script again\n');
      console.log('Or run with --save-session to save your session for next time.');
      await browser.close();
      return;
    }

    console.log('✅ Authenticated successfully\n');

    // Look for "Register New LMS" button
    console.log('🔍 Looking for "Register New LMS" button...');
    const registerButton = page.locator('button:has-text("Register New LMS")');
    
    await registerButton.waitFor({ timeout: 10000 });
    console.log('✅ Found register button, clicking...\n');
    
    await registerButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    console.log('📝 Filling out platform registration form...');
    
    // Fill in the form fields
    const platformData = {
      name: 'Demo LMS',
      issuerUrl: 'https://demo-lms.captionflow.link',
      clientId: 'mock-lms-client-123',
      authEndpoint: 'https://demo-lms.captionflow.link/lms/auth',
      tokenEndpoint: 'https://demo-lms.captionflow.link/lms/token',
      jwksUrl: 'https://demo-lms.captionflow.link/lms/.well-known/jwks',
      deploymentIds: '1'
    };

    // Fill each field
    await page.fill('input[name="name"]', platformData.name);
    console.log('  ✓ Name: Demo LMS');
    
    await page.fill('input[name="issuerUrl"]', platformData.issuerUrl);
    console.log('  ✓ Issuer URL: https://demo-lms.captionflow.link');
    
    await page.fill('input[name="clientId"]', platformData.clientId);
    console.log('  ✓ Client ID: mock-lms-client-123');
    
    await page.fill('input[name="authEndpoint"]', platformData.authEndpoint);
    console.log('  ✓ Auth Endpoint: https://demo-lms.captionflow.link/lms/auth');
    
    await page.fill('input[name="tokenEndpoint"]', platformData.tokenEndpoint);
    console.log('  ✓ Token Endpoint: https://demo-lms.captionflow.link/lms/token');
    
    await page.fill('input[name="jwksUrl"]', platformData.jwksUrl);
    console.log('  ✓ JWKS URL: https://demo-lms.captionflow.link/lms/.well-known/jwks');
    
    await page.fill('input[name="deploymentIds"]', platformData.deploymentIds);
    console.log('  ✓ Deployment IDs: 1\n');

    // Submit the form
    console.log('💾 Submitting registration...');
    const submitButton = page.locator('button:has-text("Register Platform"), button:has-text("Save")');
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Check for success message or error
    const errorText = await page.locator('[role="alert"]').textContent().catch(() => null);
    if (errorText) {
      console.log(`⚠️  Warning/Error: ${errorText}\n`);
    } else {
      console.log('✅ Platform registered successfully!\n');
    }

    console.log('📋 Next steps:');
    console.log('   1. Restart CaptionFlow service on Railway (platforms load on startup)');
    console.log('   2. Visit https://demo-lms.captionflow.link to test\n');

    // Take screenshot for verification
    await page.screenshot({ path: 'scripts/demo-lms-registered.png', fullPage: true });
    console.log('📸 Screenshot saved to scripts/demo-lms-registered.png');

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Error during registration:', error);
    await page.screenshot({ path: 'scripts/error-screenshot.png', fullPage: true });
    console.log('📸 Error screenshot saved to scripts/error-screenshot.png');
    throw error;
  } finally {
    await browser.close();
    console.log('\n✨ Done!');
  }
}

// Run it
registerDemoLMS().catch(console.error);
