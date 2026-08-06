import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './index';

afterEach(() => {
    cleanup();
});

describe('SettingsPanel', () => {
    it('restores focus to the settings trigger after close', () => {
        const onClose = vi.fn();
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'settings-trigger';
        trigger.textContent = 'Settings';
        document.body.appendChild(trigger);
        trigger.focus();

        const { rerender } = render(<SettingsPanel open={false} onClose={onClose} />);

        rerender(<SettingsPanel open={true} onClose={onClose} />);
        expect(document.activeElement).not.toBe(trigger);

        rerender(<SettingsPanel open={false} onClose={onClose} />);
        expect(document.activeElement).toBe(trigger);

        trigger.remove();
    });

    it('closes when Escape is pressed while open', () => {
        const onClose = vi.fn();
        render(<SettingsPanel open={true} onClose={onClose} />);

        fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

        expect(onClose).toHaveBeenCalledOnce();
    });

    it('sets data-modal-open on the panel while open', () => {
        const { container } = render(<SettingsPanel open={true} onClose={vi.fn()} />);
        const panel = container.querySelector('.settings-panel');
        expect(panel?.hasAttribute('data-modal-open')).toBe(true);
    });

    it('uses font-size at least 16px on the player-code input', () => {
        const scss = readFileSync(resolve(__dirname, 'SettingsPanel.scss'), 'utf8');
        const block = scss.match(/\.settings-player-code-input\s*\{[\s\S]*?\}/)?.[0] ?? '';
        expect(block).toMatch(/font-size:\s*16px/);

        render(<SettingsPanel open={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /sync/i }));
        const input = document.querySelector('.settings-player-code-input');
        expect(input).toBeTruthy();
    });
});
