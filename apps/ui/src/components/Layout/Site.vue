<template>
  <SiteTopnav />
  <router-view />
  <SiteFooter />
  <div class="sticky bottom-0 inset-x-0 z-[101]">
    <UiBottomMenuFloating />
  </div>
</template>
