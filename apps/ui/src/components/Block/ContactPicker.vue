<script setup lang="ts">
import { shorten, shortenAddress } from '@/helpers/utils';
import { useContactsStore } from '@/stores/contacts';

const props = defineProps<{
  searchValue: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const { account } = useAccount();
const contactsStore = useContactsStore();

const allContacts = computed(() => {
  if (!account) return contactsStore.contacts;
  if (contactsStore.contacts.find(contact => contact.address === account)) {
    return contactsStore.contacts;
  }

  return [
    {
      name: 'You',
      address: account
    },
    ...contactsStore.contacts
  ];
});

const filteredContacts = computed(() =>
  allContacts.value.filter(contact => {
    return (
      contact.name.toLocaleLowerCase().includes(props.searchValue.toLocaleLowerCase()) ||
      contact.address.toLocaleLowerCase() === props.searchValue.toLocaleLowerCase()
    );
  })
);
</script>

<template>
  <div>
    <div v-if="loading" class="px-4 py-3 flex justify-center">
      <UiLoading />
    </div>
    <template v-else>
      <div v-if="filteredContacts.length === 0" class="text-center py-3" v-text="'No results'" />
      <div
        v-for="contact in filteredContacts"
        :key="contact.address"
        role="button"
        class="px-3 py-[12px] border-b last:border-0 flex justify-between"
        @click="emit('pick', contact.address)"
      >
        <div class="flex items-center max-w-full">
          <Stamp :id="contact.address" type="avatar" :size="32" />
          <div class="flex flex-col ml-3 leading-[20px] overflow-hidden">
            <div class="text-skin-link" v-text="shorten(contact.name, 24)" />
            <div
              class="text-sm text-ellipsis overflow-hidden"
              v-text="shortenAddress(contact.address)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
