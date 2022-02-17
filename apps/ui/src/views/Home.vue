<template>
  <Layout>
    <h1 class="mb-3">Home</h1>
	  <router-link :to="{ name: 'org', params: { id: 'pasta' } }">
		  <h3>Organization</h3>
	  </router-link>
    <router-link :to="{ name: 'playground' }">
      <h3>Playground</h3>
    </router-link>
  </Layout>
</template>
