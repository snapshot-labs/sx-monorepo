import { lsGet, lsSet } from '@/helpers/utils';

const NOT_SET = 'none';
const DARK_MODE = 'dark';
const LIGHT_MODE = 'light';

const currenSkin = lsGet('skin', NOT_SET);
// const osSkin = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT_MODE : DARK_MODE;
const osSkin = DARK_MODE;

const userSkin = ref(currenSkin === NOT_SET ? osSkin : currenSkin);
const getMode = () => (userSkin.value === LIGHT_MODE ? LIGHT_MODE : DARK_MODE);
const _toggleSkin = skin => {
  if (skin === LIGHT_MODE) {
    lsSet('skin', DARK_MODE);
    userSkin.value = DARK_MODE;
  } else {
    lsSet('skin', LIGHT_MODE);
    userSkin.value = LIGHT_MODE;
  }
};

export function useUserSkin() {
  function toggleSkin() {
    const currentSkin = lsGet('skin', NOT_SET);
    if (currentSkin === NOT_SET) {
      _toggleSkin(osSkin);
    } else {
      _toggleSkin(currentSkin);
    }
  }

  watch(
    userSkin,
    () => {
      document.documentElement.setAttribute(
        'data-color-scheme',
        userSkin.value === LIGHT_MODE ? 'light' : 'dark'
      );
    },
    { immediate: true }
  );

  return {
    userSkin,
    getMode,
    toggleSkin
  };
}
