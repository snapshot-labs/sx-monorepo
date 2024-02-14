<script setup lang="ts"></script>

<template>
  <Story :layout="{ type: 'grid', width: 680 }">
    <div class="space-y-[22px]">
      <Variant title="warning">
        <UiAlert type="warning">
          The contracts have not yet undergone an audit. Use at own risk.
        </UiAlert>
      </Variant>
      <Variant title="error">
        <UiAlert type="error">
          The contracts have not yet undergone an audit. Use at own risk.
        </UiAlert>
      </Variant>
      <Variant title="success">
        <UiAlert type="success">
          The contracts have not yet undergone an audit. Use at own risk.
        </UiAlert>
      </Variant>
    </div>
  </Story>
</template>
