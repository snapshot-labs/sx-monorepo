<script setup lang="ts">
import { shorten, shortenAddress } from '@/helpers/utils';
import { Contact } from '@/types';

const props = withDefaults(
  defineProps<{
    searchValue: string;
    loading: boolean;
    extraContacts?: Contact[];
  }>(),
  {
    extraContacts: () => []
  }
);

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const { account } = useAccount();
const contactsStore = useContactsStore();

const allContacts = computed(() => {
  const contactsList = [...contactsStore.contacts, ...props.extraContacts];

  if (!account) return contactsList;
  if (contactsStore.contacts.find(contact => contact.address === account)) {
    return contactsList;
  }

  return [
    {
      name: 'You',
      address: account
    },
    ...contactsList
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
        class="px-3 py-2.5 border-b last:border-0 flex justify-between"
        @click="emit('pick', contact.address)"
      >
        <div class="flex items-center max-w-full">
          <UiStamp :id="contact.address" type="avatar" :size="32" />
          <div class="flex flex-col ml-3 leading-5 overflow-hidden">
            <div class="text-skin-link" v-text="shorten(contact.name, 24)" />
            <div
              class="text-[17px] text-ellipsis overflow-hidden"
              v-text="shortenAddress(contact.address)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
