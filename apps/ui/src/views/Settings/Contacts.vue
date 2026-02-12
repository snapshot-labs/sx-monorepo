<script setup lang="ts">
import { shorten } from '@/helpers/utils';

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
    <div class="flex justify-end p-4">
      <UiButton uniform @click="openModal('editContact')">
        <IH-plus-sm />
      </UiButton>
    </div>
    <UiSectionHeader label="Contacts" />
    <div
      v-for="contact in contactsStore.contacts"
      :key="contact.address"
      class="mx-4 py-3 border-b flex group"
      tabindex="0"
    >
      <div class="flex-auto flex items-center min-w-0">
        <UiStamp :id="contact.address" type="avatar" :size="32" />
        <div class="flex flex-col ml-3 leading-[22px] min-w-0 pr-2 md:pr-0">
          <h4 class="text-skin-link" v-text="shorten(contact.name, 24)" />
          <UiAddress :address="contact.address" class="text-[17px] truncate" />
        </div>
      </div>
      <div class="flex flex-row items-center content-center gap-x-3">
        <button
          type="button"
          class="invisible group-hover:visible group-focus-within:visible"
          @click="handleContactEdit(contact)"
        >
          <IH-pencil />
        </button>
        <button
          type="button"
          class="invisible group-hover:visible group-focus-within:visible"
          @click="contactsStore.deleteContact(contact.address)"
        >
          <IH-trash />
        </button>
      </div>
    </div>
    <UiStateWarning v-if="!contactsStore.contacts.length" class="px-4 py-3">
      There are no contacts here.
    </UiStateWarning>
    <teleport to="#modal">
      <ModalEditContact
        :open="modalOpen.editContact"
        :initial-state="modalState.editContact"
        @close="modalOpen.editContact = false"
      />
    </teleport>
  </div>
</template>
