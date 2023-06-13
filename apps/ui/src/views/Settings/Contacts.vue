<script setup lang="ts">
import { useContactsStore } from '@/stores/contacts';
import { shorten, shortenAddress } from '@/helpers/utils';

useTitle('Contacts');
const contactsStore = useContactsStore();

const modalState: Ref<{
  editContact?: any;
}> = ref({});
const modalOpen = ref({
  editContact: false
});

function openModal(type: 'editContact') {
  modalOpen.value[type] = true;
  modalState.value[type] = null;
}

function handleContactEdit(contact) {
  modalState.value.editContact = contact;
  modalOpen.value.editContact = true;
}
</script>

<template>
  <div>
    <div class="flex">
      <div class="flex-auto" />
      <div class="pt-4 px-4 space-x-2">
        <a>
          <UiButton class="!px-0 w-[46px]" @click="openModal('editContact')">
            <IH-plus-sm class="inline-block" />
          </UiButton>
        </a>
      </div>
    </div>
    <Label label="Contacts" />
    <div
      v-for="contact in contactsStore.contacts"
      :key="contact.address"
      class="mx-4 py-3 border-b flex group"
    >
      <div class="flex-auto flex items-center min-w-0">
        <Stamp :id="contact.address" type="avatar" :size="32" />
        <div class="flex flex-col ml-3 leading-[22px] min-w-0 pr-2 md:pr-0">
          <h4 class="text-skin-link" v-text="shorten(contact.name, 24)" />
          <div class="text-sm truncate" v-text="shortenAddress(contact.address)" />
        </div>
      </div>
      <div class="flex flex-row items-center content-center gap-x-3">
        <a class="invisible group-hover:visible" @click="handleContactEdit(contact)">
          <IH-pencil />
        </a>
        <a
          class="invisible group-hover:visible"
          @click="contactsStore.deleteContact(contact.address)"
        >
          <IH-trash />
        </a>
      </div>
    </div>
    <div v-if="!contactsStore.contacts.length" class="px-4 py-3 text-skin-link">
      <IH-exclamation-circle class="inline-block mr-2" />
      <span v-text="'There are no contacts here.'" />
    </div>
  </div>
  <teleport to="#modal">
    <ModalEditContact
      :open="modalOpen.editContact"
      :initial-state="modalState.editContact"
      @close="modalOpen.editContact = false"
    />
  </teleport>
</template>
