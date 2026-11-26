<template>
  <div class="notice">
    <slot/>
  </div>
</template>

<style scoped lang="scss">
.notice {
  max-width: 36em;
  padding: 1.5em;
  border: solid 1px $colour-border;
  border-radius: 0.5em;
  background-color: $colour-surface;

  :slotted(:first-child) {
    margin-top: 0;
  }

  :slotted(:last-child) {
    margin-bottom: 0;
  }

  :slotted(p) {
    color: $colour-text-muted;
    line-height: 1.5;
  }
}
</style>
