import { hexToRgb } from '@/helpers/utils';
import { SkinSettings } from '@/types';

function hexToCssRgb(hex: string) {
  const { r, g, b } = hexToRgb(hex.slice(1));
  return `${r},${g},${b}`;
}

const B64U_LOOKUP = {
  '/': '_',
  _: '/',
  '+': '-',
  '-': '+',
  '=': '.',
  '.': '='
};

const encode = (str: string) =>
  btoa(str).replace(/(\+|\/|=)/g, m => B64U_LOOKUP[m]);
const decode = (str: string) =>
  atob(str.replace(/(-|_|\.)/g, m => B64U_LOOKUP[m]));

const encodeSkin = (skin: SkinSettings) => encode(JSON.stringify(skin));
const decodeSkin = (str: string) => JSON.parse(decode(str));

const logo = ref<string | null>(null);

export function useSkin() {
  const { css } = useStyleTag('');
  const { previewTheme } = useTheme();
  const route = useRoute();

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

    const skinVariables = Object.entries(getCssVariables(skinSettings));

    css.value = `:root { ${skinVariables
      .map(([key, val]) => `${key}:${val}`)
      .join(';')};  }`;

    previewTheme(skinSettings.theme);
    logo.value = skinSettings.logo;
  }

  watch(
    () => route.query['skin-preview'],
    previewQuery => {
      if (!previewQuery) return;

      try {
        const skinSettings = decodeSkin(previewQuery as string);
        setSkin(skinSettings);
      } catch (e) {
        console.error('Unable to decode skin preview', e);
      }
    },
    { immediate: true }
  );

  return { logo, setSkin, encodeSkin };
}
