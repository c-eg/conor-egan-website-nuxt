<script setup lang="ts">
import type { Repository } from "~/shared/types/github";
import Card from "~/components/core/containers/card.vue";
import Pill from "~/components/core/containers/pill.vue";

interface Props {
  repository: Repository,
}

defineProps<Props>();
</script>

<template>
  <card class="repository-card">
    <h2>
      <a :href="repository.url" target="_blank" rel="noopener noreferrer">
        {{ repository.name }}
        <img src="~/assets/images/external-link-icon.svg" alt="Opens in a new tab"/>
      </a>
    </h2>
    <p>{{ repository.description }}</p>
    <div class="repository-star">
      <img src="~/assets/images/star.svg" alt="GitHub stars"/>
      <span>{{ repository.stars }}</span>
    </div>
    <pill class="repository-pill" v-for="language in repository.languages"
          :key="language"
          :text="language"/>
  </card>
</template>

<style scoped lang="scss">
.repository-card {
  text-align: left;

  h2 {
    margin: 0;
    font-size: 2em;
    font-weight: normal;

    a {
      color: $colour-primary;
      text-decoration: none;

      &:hover,
      &:focus {
        text-decoration: underline;
      }
    }
  }

  p {
    color: $colour-text-primary;
  }

  .repository-star {
    display: flex;
    gap: 0.5em;
    margin: 1em 0;
    font-size: 1.3em;
    color: $colour-text-primary;
  }

  .repository-pill {
    margin-right: 0.5em;

    &:last-child {
      margin-right: 0;
    }
  }
}
</style>
