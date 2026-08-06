# Design tokens

Radius tokens are defined on `:root` in `src/App.scss` as `--radius-sm`, `--radius-md`, and `--radius-full`.

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | inputs, keycaps |
| `--radius-md` | 8px | settings group, board |
| `--radius-full` | 999px | pill meters (level) only |

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

| Token | Default | Use |
|-------|---------|-----|
| `--session-end` | `#c45c4a` | Daily-progress dots session-end marker (fill + ring cue) |

## Z-index scale

Documented stacking order only — use literal `z-index` values in component SCSS; do **not** introduce a `--z-*` CSS variable matrix.

| z-index | Surface |
|---------|---------|
| 5 | session-status |
| 6 | topbar, footer, HUDs |
| 12 | adaptive HUD |
| 20 | notices |
| 30 | countdown, session-exit |
| 40 | settings, install |
| 45 | teach-opt-out warn (session modal) |
| 50 | strategy instruction |

## Type scale

IBM Plex Sans weights loaded: 400 (body), 500 (labels), 600 (titles). `font-synthesis: none` on `html` prevents faux bold.

| Role | Size | Line-height | Weight | Use |
|------|------|-------------|--------|-----|
| caption | 0.75rem (12px) | 1.33 | 500 | Minimum chrome labels (session-status, HUD phase/stage) |
| meta | 0.8rem | 1.4 | 500 | Secondary chrome, compact metadata |
| body | 1rem | 1.5 | 400 | Default UI copy |
| title | 1.1rem+ | 1.3 | 600 | Section / modal headings |

## Touch targets

| Token | Value | Use |
|-------|-------|-----|
| `--touch-min` | 44px | Minimum interactive hit area (CTAs, icon buttons, reset control) |

## Focus ring

Neutral chrome focus — border-based, not a `--primary` wash. Custom properties on `:root`:

| Token | Value |
|-------|-------|
| `--focus-ring-color` | `color-mix(in srgb, var(--textBackground) 55%, var(--border))` |
| `--focus-ring-width` | `2px` |
| `--focus-ring-offset` | `2px` |

Recipe (controls with a visible border):

```scss
&:focus-visible {
    outline: none;
    border-color: var(--focus-ring-color);
}
```

For borderless controls, use `outline: var(--focus-ring-width) solid var(--focus-ring-color)` with `outline-offset: var(--focus-ring-offset)` instead of a primary-tinted box-shadow.
