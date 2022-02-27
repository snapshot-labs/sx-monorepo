<template>
  <div>
    <div class="border-b py-7 mb-6">
      <Container class="max-w-screen-md">
        <div class="eyebrow mb-3">Snapshot X</div>
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
      </Container>
    </div>
    <Container class="max-w-screen-md">
      <router-link :to="{ name: 'overview', params: { id: 'pasta' } }">
        <h3 class="mb-2">Space</h3>
      </router-link>
      <router-link :to="{ name: 'playground' }">
        <h3 class="mb-2">Playground</h3>
      </router-link>
    </Container>
  </div>
</template>
