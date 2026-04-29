# Internal accessibility pass (Phase 1.5 prep)

Before hiring an external WCAG 2.1 AA auditor:

1. Run `@axe-core/playwright` against `/`, `/caption-surface.html?resource=<test-uuid>`, and each dashboard hash route after `npm run build && npm start`.
2. Keyboard-only navigation: Tab through magic-link form, caption upload, resource table, track switcher, fullscreen control.
3. VoiceOver (macOS): verify `aria-live="polite"` on cue display announces cue changes at a reasonable rate.
4. Verify focus visibility on all interactive controls (`:focus-visible` in `components.css`).
