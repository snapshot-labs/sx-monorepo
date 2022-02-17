<template>
  <Layout>
    <h1 class="mb-4">Create</h1>
    <SIString
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <SIString
      :definition="{
        type: 'string',
        title: 'Description'
      }"
    />
    <h3 class="mb-3">Execution</h3>
    <div class="border rounded-lg mb-4">
      <a class="px-4 py-3 block border-b">
        <h4>
          <Icon name="go" class="float-right mt-1" />
          Transfer funds
        </h4>
      </a>
      <a class="px-4 py-3 block border-b">
        <h4>
          <Icon name="go" class="float-right mt-1" />
          Transfer collectible
        </h4>
      </a>
      <a class="px-4 py-3 block">
        <h4>
          <Icon name="go" class="float-right mt-1" />
          Custom transaction
        </h4>
      </a>
    </div>
  </Layout>
</template>
