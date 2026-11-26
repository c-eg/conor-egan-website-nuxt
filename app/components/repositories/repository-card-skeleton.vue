<script setup lang="ts">
import Card from "~/components/core/containers/card.vue";
import Skeleton from "~/components/core/skeleton.vue";
</script>

<template>
  <card class="repository-card-skeleton">
    <skeleton class="repository-name"/>
    <div class="repository-description">
      <skeleton class="repository-description-line"/>
      <skeleton class="repository-description-line"/>
    </div>
    <skeleton class="repository-star"/>
    <div class="repository-languages">
      <skeleton class="repository-pill"/>
      <skeleton class="repository-pill"/>
    </div>
  </card>
</template>

<style scoped lang="scss">
.repository-card-skeleton {
  .repository-name {
    width: 8em;
    max-width: 100%;
    height: 1.2em;
    font-size: 2em;
  }

  .repository-description {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin: 1em 0;
    font-size: 1.3em;

    .repository-description-line {
      height: 1em;

      &:last-child {
        width: 60%;
      }
    }
  }

  .repository-star {
    width: 3em;
    height: 1.2em;
    margin: 1em 0;
    font-size: 1.3em;
  }

  .repository-languages {
    display: flex;
    gap: 0.5em;

    .repository-pill {
      width: 5.5em;
      height: 2.4em;
      border-radius: 2em;
    }
  }
}
</style>
