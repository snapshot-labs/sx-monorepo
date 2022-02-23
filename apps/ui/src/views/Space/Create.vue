<template>
  <Layout>
    <h1 class="mb-4">Create</h1>
    <SIString
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <div class="s-label">Description</div>
    <textarea class="s-input mb-3 h-[120px]" />

    <h3 class="mb-3">Execution</h3>
    <div class="border bg-skin-block-bg rounded-lg mb-4">
      <router-link :to="{ name: 'execution' }" class="px-4 py-3 block">
        <h4>
          <Icon name="go" class="float-right mt-1" />
          Add execution
        </h4>
      </router-link>
    </div>
  </Layout>
</template>
