#!/usr/bin/env node
/**
 * Mock LMS for testing CaptionFlow LTI 1.3 integration locally
 * 
 * This simulates Canvas/Blackboard/Moodle launching CaptionFlow.
 * Run: node test-lms-mock.cjs
 * Then visit: http://localhost:4000
 */

const express = require('express');
const { createRequire } = require('node:module');
const require2 = createRequire(__filename);
const lti = require2('ltijs').Provider;
const Database = require2('ltijs-sequelize');

const PORT = 4000;
const MOCK_LMS_URL = `http://localhost:${PORT}`;
const CAPTIONFLOW_URL = process.env.CAPTIONFLOW_URL || 'http://localhost:3000';

// Create Express app for the mock LMS UI
const app = express();

// Setup ltijs as a platform (not a tool)
const seq = new Database('lti_mock_lms', 'user', 'pass', {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

lti.setup(
  'MOCK_LMS_SECRET_KEY_12345678901234567890',
  { plugin: seq },
  {
    appRoute: '/lms/launch',
    loginRoute: '/lms/login',
    keysetRoute: '/lms/.well-known/jwks',
    devMode: true,
  }
);

async function setupMockLMS() {
  await lti.deploy({ serverless: true });

  // Register CaptionFlow as a tool in this mock LMS
  await lti.registerPlatform({
    url: MOCK_LMS_URL,
    name: 'Mock LMS',
    clientId: 'mock-lms-client-123',
    authenticationEndpoint: `${MOCK_LMS_URL}/lms/auth`,
    accesstokenEndpoint: `${MOCK_LMS_URL}/lms/token`,
    authConfig: {
      method: 'JWK_SET',
      key: `${MOCK_LMS_URL}/lms/.well-known/jwks`,
    },
  });

  // Serve a simple UI
  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Mock LMS - Testing CaptionFlow</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { margin-top: 0; color: #333; }
    h2 { color: #555; font-size: 1.2rem; margin-bottom: 12px; }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      border: none;
      font-size: 16px;
      cursor: pointer;
      margin-right: 12px;
      margin-top: 8px;
    }
    .button:hover {
      background: #0052a3;
    }
    .button.secondary {
      background: #666;
    }
    .button.secondary:hover {
      background: #444;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .info {
      background: #e3f2fd;
      padding: 12px;
      border-left: 4px solid #0066cc;
      margin: 16px 0;
    }
    .step {
      margin: 12px 0;
      padding-left: 28px;
      position: relative;
    }
    .step::before {
      content: "→";
      position: absolute;
      left: 8px;
      color: #0066cc;
      font-weight: bold;
    }
    pre {
      background: #f8f8f8;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🏫 Mock LMS - CaptionFlow Testing</h1>
    <p>This simulates Canvas/Blackboard/Moodle launching CaptionFlow via LTI 1.3.</p>
  </div>

  <div class="card">
    <h2>📋 Setup Instructions</h2>
    <div class="step">Make sure CaptionFlow is running on <code>${CAPTIONFLOW_URL}</code></div>
    <div class="step">Register this mock LMS as a platform in CaptionFlow's admin UI:</div>
    <div class="info">
      <strong>Platform Configuration:</strong><br>
      <strong>Name:</strong> Mock LMS (Test)<br>
      <strong>Issuer URL:</strong> <code>${MOCK_LMS_URL}</code><br>
      <strong>Client ID:</strong> <code>mock-lms-client-123</code><br>
      <strong>Auth Endpoint:</strong> <code>${MOCK_LMS_URL}/lms/auth</code><br>
      <strong>Token Endpoint:</strong> <code>${MOCK_LMS_URL}/lms/token</code><br>
      <strong>JWKS URL:</strong> <code>${MOCK_LMS_URL}/lms/.well-known/jwks</code><br>
      <strong>Deployment IDs:</strong> <code>1</code>
    </div>
    <div class="step">After registering, restart CaptionFlow</div>
    <div class="step">Come back here and test the launch buttons below</div>
  </div>

  <div class="card">
    <h2>🚀 Test Scenarios</h2>
    
    <h3>1. Deep Linking (Instructor Picks Content)</h3>
    <p>Simulates an instructor adding CaptionFlow to a course module:</p>
    <form action="/launch-deep-link" method="POST">
      <button type="submit" class="button">Launch Content Picker</button>
    </form>
    <p style="margin-top: 8px; color: #666; font-size: 0.9em;">
      This will open CaptionFlow's content picker. Select a resource and it will return here with the deep link.
    </p>

    <h3>2. Regular Launch (Student Views Content)</h3>
    <p>Simulates a student clicking an embedded CaptionFlow link:</p>
    <form action="/launch-student" method="POST">
      <input type="text" name="resourceId" placeholder="Resource ID (from deep link)" 
             style="padding: 8px; width: 300px; margin-right: 8px; border: 1px solid #ccc; border-radius: 4px;">
      <button type="submit" class="button secondary">Launch as Student</button>
    </form>
    <p style="margin-top: 8px; color: #666; font-size: 0.9em;">
      Paste a resource ID from a deep link above, or leave blank to test stub creation.
    </p>
  </div>

  <div class="card">
    <h2>✅ Testing Checklist</h2>
    <div class="step">Register this mock LMS in CaptionFlow admin UI</div>
    <div class="step">Test deep linking: pick a resource from the content picker</div>
    <div class="step">Verify the resource loads correctly in the caption surface</div>
    <div class="step">Test student launch with the resource ID from deep link</div>
    <div class="step">Verify CSP allows iframe embedding</div>
  </div>
</body>
</html>
    `);
  });

  // Deep linking launch (instructor mode)
  app.post('/launch-deep-link', async (req, res) => {
    try {
      const launchUrl = await lti.appUrl();
      const token = await lti.generateToken({
        iss: MOCK_LMS_URL,
        sub: 'instructor-123',
        name: 'Test Instructor',
        email: 'instructor@mocklms.test',
        roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingRequest',
        'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
          deep_link_return_url: `${MOCK_LMS_URL}/deep-link-return`,
          accept_types: ['ltiResourceLink'],
          accept_presentation_document_targets: ['iframe', 'window'],
        },
      });

      // Redirect to CaptionFlow's login/launch flow
      res.redirect(`${CAPTIONFLOW_URL}/lti/login?iss=${encodeURIComponent(MOCK_LMS_URL)}&target_link_uri=${encodeURIComponent(CAPTIONFLOW_URL + '/lti/launch')}&login_hint=instructor-123`);
    } catch (err) {
      console.error('Deep link launch error:', err);
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // Regular student launch
  app.post('/launch-student', async (req, res) => {
    try {
      const resourceId = req.body?.resourceId || null;
      
      // Redirect to CaptionFlow's login/launch flow
      const custom = resourceId ? { captionflow_resource_id: resourceId } : {};
      res.redirect(`${CAPTIONFLOW_URL}/lti/login?iss=${encodeURIComponent(MOCK_LMS_URL)}&target_link_uri=${encodeURIComponent(CAPTIONFLOW_URL + '/lti/launch')}&login_hint=student-456${resourceId ? '&custom=' + encodeURIComponent(JSON.stringify(custom)) : ''}`);
    } catch (err) {
      console.error('Student launch error:', err);
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // Deep link return (receives content item from CaptionFlow)
  app.post('/deep-link-return', express.urlencoded({ extended: true }), async (req, res) => {
    console.log('Received deep link response:', req.body);
    
    try {
      const jwt = req.body.JWT;
      // In a real LMS, this would parse the JWT and extract the content item
      // For testing, we'll just show success
      
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Deep Link Success</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    .success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    code {
      background: #f8f8f8;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      display: block;
      margin: 12px 0;
      word-break: break-all;
    }
    a {
      display: inline-block;
      margin-top: 16px;
      padding: 12px 24px;
      background: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <h1>✅ Deep Link Successful!</h1>
  <div class="success">
    <p><strong>CaptionFlow returned a content item.</strong></p>
    <p>In a real LMS, this would be added to your course module.</p>
    <p>JWT Token (truncated):</p>
    <code>${jwt ? jwt.substring(0, 100) + '...' : 'No JWT received'}</code>
  </div>
  <a href="/">← Back to Mock LMS</a>
</body>
</html>
      `);
    } catch (err) {
      console.error('Deep link return error:', err);
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // Mount ltijs middleware
  app.use(lti.app);

  app.listen(PORT, () => {
    console.log('');
    console.log('🏫 Mock LMS running!');
    console.log('');
    console.log(`Open in browser: http://localhost:${PORT}`);
    console.log(`CaptionFlow URL: ${CAPTIONFLOW_URL}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure CaptionFlow is running');
    console.log('2. Register this mock LMS in CaptionFlow admin UI (#lms-config)');
    console.log('3. Restart CaptionFlow');
    console.log('4. Visit http://localhost:4000 and test launches');
    console.log('');
  });
}

setupMockLMS().catch(console.error);
