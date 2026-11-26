<template>
  <div class="skeleton"/>
</template>

<style scoped lang="scss">
.skeleton {
  border-radius: 0.5em;
  background: linear-gradient(90deg, $colour-skeleton 40%, $colour-skeleton-highlight 50%, $colour-skeleton 60%);
  background-size: 300% 100%;
  animation: shimmer 1.5s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}
</style>
