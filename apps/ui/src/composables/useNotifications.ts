import { ref } from 'vue';

interface Notification {
  id: number;
  message: string;
  type: string;
  remove(): any;
}

const items = ref<Notification[]>([]);

export function useNotifications() {
  function notify(type: string, message: any, duration = 4000) {
    const item: Notification = {
      id: Math.floor(Date.now() * Math.random()),
      message,
      type,
      remove() {
        items.value.splice(
          items.value.findIndex(i => i.id === this.id),
          1
        );
      }
    };
    items.value.push(item);
    setTimeout(() => item.remove(), duration);
  }

  return { notify, items };
}
