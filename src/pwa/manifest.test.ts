import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('web app manifest', () => {
    const manifest = JSON.parse(
        readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
    ) as Record<string, unknown>;

    it('declares standalone install identity and required icons', () => {
        expect(manifest.name).toBe('Working Memory Trainer');
        expect(manifest.short_name).toBe('Memory Trainer');
        expect(manifest.start_url).toBe('/');
        expect(manifest.scope).toBe('/');
        expect(manifest.display).toBe('standalone');
        expect(manifest.theme_color).toBe('#2c2e31');
        expect(manifest.background_color).toBe('#2c2e31');

        const icons = manifest.icons as Array<{ src: string; sizes: string }>;
        expect(icons.some((icon) => icon.sizes === '192x192')).toBe(true);
        expect(icons.some((icon) => icon.sizes === '512x512')).toBe(true);
    });
});
