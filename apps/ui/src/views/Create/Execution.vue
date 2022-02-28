<template>
  <Container class="pt-5">
    <h1 class="mb-4">Add execution</h1>
    <SIString
      :definition="{
        type: 'string',
        title: 'Contract address'
      }"
    />
    <div class="s-label">ABI</div>
    <textarea class="s-input mb-3 h-[120px]" />
    <SIBoolean
      :definition="{
        type: 'boolean',
        title: 'Use custom data (hex encoded)'
      }"
    />
  </Container>
</template>
