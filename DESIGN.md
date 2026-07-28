# Design tokens

## Radius

| Tier | Value | Use |
|------|-------|-----|
| small | 4px | inputs, keycaps |
| medium | 8px | settings group, board |
| full | 999px | pill meters (level) only |

## Spacing (idle chrome)

| Token | Value | Use |
|-------|-------|-----|
| gap- Tight | 6px | within a control |
| gap-group | 10px | between settings |
| gap-section | 28px | board ↔ prompt |
| pad-frame-y / pad-frame-x | 28px / 32px | base chrome insets |
| frame-* | `max(pad-frame, safe-area-inset)` | topbar, footer, HUDs, settings (`--frame-top` etc. in `App.scss`) |

Shell height: `min-height: 100vh` with `100dvh` override. Viewport meta includes `viewport-fit=cover`.

## Motion

| Token | Value | Use |
|-------|-------|-----|
| settle | 180ms cubic-bezier(0.22, 1, 0.36, 1) | hover / focus |
| stimulus | 420ms cubic-bezier(0.22, 1, 0.36, 1) | square fade |

## Color roles

Existing CSS variables from theme: `--background`, `--primary`, `--textForeground`, `--textBackground`, `--border`, board tokens. Accent (`--primary`) is used sparingly — active level meter only; chrome borders stay muted.
