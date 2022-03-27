<template>
  <Container class="pt-5">
    <h1 v-text="'Add execution'" class="mb-4" />
    <div class="s-compact">
      <SIString
        :definition="{
          type: 'string',
          title: 'Contract address'
        }"
      />
      <div class="s-base">
        <div v-text="'ABI'" class="s-label" />
        <textarea class="s-input mb-3 h-[140px]" />
      </div>
    </div>
    <SIBoolean
      :definition="{
        type: 'boolean',
        title: 'Use custom data (hex encoded)'
      }"
    />
  </Container>
</template>
