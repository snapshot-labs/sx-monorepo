import { hexToRgb } from '@/helpers/utils';
import { SkinSettings } from '@/types';

function hexToCssRgb(hex: string) {
  const { r, g, b } = hexToRgb(hex.slice(1));
  return `${r},${g},${b}`;
}

export function useSkin() {
  const { css } = useStyleTag('', { id: 'skin' });
  const { setTheme } = useTheme();

  function getCssVariables(skinSettings: SkinSettings) {
    const colorVariables = Object.entries(skinSettings).reduce(
      (acc, [colorName, hex]) => {
        if (!hex || !colorName.includes('_color')) return acc;

        acc[`--${colorName.replace('_color', '')}`] = hexToCssRgb(hex);
        return acc;
      },
      {}
    );

    if (colorVariables['--content']) {
      colorVariables['--content'] = `rgb(${colorVariables['--content']})`;
    }
    return colorVariables;
  }

  function setSkin(skinSettings: SkinSettings) {
    if (!skinSettings) return;

    css.value = `:root { ${Object.entries(getCssVariables(skinSettings))
      .map(([key, val]) => `${key}:${val}`)
      .join(';')};  }`;

    setTheme(skinSettings.theme);
  }

  return { setSkin };
}
