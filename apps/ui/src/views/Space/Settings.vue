<script setup>
defineProps({ space: Object });
</script>

<template>
  <Container slim>
    <div class="x-block mb-3">
      <router-link
        :to="{ name: 'profile' }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-user class="inline-block mr-2" />
          Profile
        </h4>
      </router-link>
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-key class="inline-block mr-2" />
        Controller
      </h4>
      <router-link
        :to="{ name: 'voting' }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-adjustments class="inline-block mr-2" />
          Voting
        </h4>
      </router-link>
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-puzzle class="inline-block mr-2" />
        Strategie(s)
      </h4>
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-check-circle class="inline-block mr-2" />
        Auth(s)
      </h4>
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-code class="inline-block mr-2" />
        Execution(s)
      </h4>
    </div>
  </Container>
</template>
