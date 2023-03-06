import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import type { Contact } from '@/types';
import pkg from '../../package.json';

export const useContactsStore = defineStore('contacts', {
  state: () => ({
    contacts: useStorage(`${pkg.name}.contacts`, [] as Contact[])
  }),
  actions: {
    saveContact(payload: Contact) {
      const contact = this.contacts.find(contact => contact.address === payload.address);
      if (contact) {
        Object.entries(payload).map(([key, value]) => {
          contact[key] = value;
        });
      } else {
        this.contacts.unshift(payload);
      }
    },
    deleteContact(address: string) {
      this.contacts = this.contacts.filter(contact => contact.address !== address);
    }
  }
});
