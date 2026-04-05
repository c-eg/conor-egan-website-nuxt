<script setup lang="ts">
interface Props {
  text: string,
}

const props = defineProps<Props>();
</script>

<template>
<span class="pill">
  {{ props.text }}
</span>
</template>

<style scoped lang="scss">
.pill {
  display: inline-block;
  background-color: $colour-secondary-subtle;
  border-radius: 2em;
  padding: 0.6em 1em;
  color: $colour-secondary;
  font-weight: 600;

  &:hover {
    background-color: $colour-secondary-subtle-hover;
  }
}
</style>
