<template>
  <Container>
    <h2 class="mb-3">Profile</h2>
    <SIString
      :definition="{
        type: 'string',
        title: 'Name'
      }"
    />
    <SIString
      :definition="{
        type: 'string',
        title: 'About'
      }"
    />
  </Container>
</template>
