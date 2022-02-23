<template>
  <Layout>
    <div class="eyebrow mb-3">Snapshot X</div>
    <h1 class="mb-3 mono">Testing UI</h1>
    <router-link :to="{ name: 'proposals', params: { id: 'pasta' } }">
      <h3 class="mb-2">Space</h3>
    </router-link>
    <router-link :to="{ name: 'playground' }">
      <h3 class="mb-2">Playground</h3>
    </router-link>
  </Layout>
</template>
