<script setup lang="ts">
import LightningBoltIcon from '~icons/heroicons-outline/lightning-bolt';
</script>

<template>
  <Story :layout="{ type: 'grid', width: 220 }">
    <Variant title="primary">
      <div class="space-y-3">
        <UiButton variant="primary"> Button </UiButton>
        <UiButton circle variant="primary">
          <LightningBoltIcon />
        </UiButton>
        <UiButton variant="primary" loading class="block"> Button </UiButton>
        <UiButton variant="primary" disabled> Button </UiButton>
      </div>
    </Variant>

    <Variant title="outlined">
      <div class="space-y-3">
        <UiButton variant="outlined"> Button </UiButton>
        <UiButton circle variant="outlined">
          <LightningBoltIcon />
        </UiButton>
        <UiButton variant="outlined" loading class="block"> Button </UiButton>
        <UiButton variant="outlined" disabled> Button </UiButton>
      </div>
    </Variant>

    <Variant title="danger">
      <div class="space-y-3">
        <UiButton variant="danger"> Button </UiButton>
        <UiButton circle variant="danger">
          <LightningBoltIcon />
        </UiButton>
        <UiButton variant="danger" loading class="block"> Button </UiButton>
        <UiButton variant="danger" disabled> Button </UiButton>
      </div>
    </Variant>

    <Variant title="positive">
      <div class="space-y-3">
        <UiButton variant="success"> Button </UiButton>
        <UiButton circle variant="success">
          <LightningBoltIcon />
        </UiButton>
        <UiButton variant="success" loading class="block"> Button </UiButton>
        <UiButton variant="success" disabled> Button </UiButton>
      </div>
    </Variant>
  </Story>
</template>
