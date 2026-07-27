import { useEffect } from 'react';
import { applyInlineStyntax, completeTheme, toCSSVariableCase, Theme } from '../themes/config';

const VARIABLE_CONTAINER_DEFINITION_ID = 'app-css-variable-definition';

export const useThemeVariables = (theme: Theme, mode?: 'dark' | 'light') => {
    useEffect(() => {
        let cssVariableDefinition = document.getElementById(VARIABLE_CONTAINER_DEFINITION_ID);

        if (cssVariableDefinition === null) {
            cssVariableDefinition = document.createElement('style');
            cssVariableDefinition.id = VARIABLE_CONTAINER_DEFINITION_ID;
            document.head.insertBefore(cssVariableDefinition, document.head.querySelector('style'));
        }

        let themeColors = '';
        const inlineTheme = applyInlineStyntax(completeTheme(theme));

        for (const colorName in inlineTheme) {
            const color = inlineTheme[colorName];
            if (typeof color === 'string') {
                const cssColorName = toCSSVariableCase(colorName);
                themeColors += cssColorName + ': ' + color + ';\n';
            }
        }

        cssVariableDefinition.innerHTML = `
        :root {
            ${themeColors}
        }
        `;

        if (mode) {
            document.documentElement.dataset.theme = mode;
        }
    }, [theme, mode]);
};
