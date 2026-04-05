<script setup lang="ts">

</script>

<template>
  <div class="card">
    <slot/>
  </div>
</template>

<style scoped lang="scss">
.card {
  padding: 1.5em;
  border: solid 1px $colour-border;
  border-radius: 0.5em;

  &:hover {
    border-color: $colour-border-hover;
    background-color: $colour-surface;
  }
}
</style>
