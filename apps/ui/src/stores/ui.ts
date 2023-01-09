import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: false
  }),
  actions: {
    async toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }
});
