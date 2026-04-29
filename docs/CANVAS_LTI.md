# Canvas LTI (STOP S5)

1. In Canvas developer keys, register an LTI 1.3 tool.
2. Launch URL: `{BASE_URL}/lti/login` (follow Canvas ltijs placement docs).
3. Capture `iss`, `client_id`, and deployment id; optionally seed `institution` via SQL or first launch auto-provisions.
4. First student launch creates a placeholder resource if none exists — instructor replaces video/captions in the dashboard.
