<script setup lang="ts">
import Skeleton from "~/components/core/skeleton.vue";
import RepositoryCard from "~/components/repositories/repository-card.vue";
import RepositoryCardSkeleton from "~/components/repositories/repository-card-skeleton.vue";
import { useRepositories } from "~/composables/repositories/use-repositories";
import { useRepositoryFilters } from "~/composables/repositories/use-repository-filters";
import { useRepositorySort } from "~/composables/repositories/use-repository-sort";
import { RepositorySortOptions } from "~/utils/repositories/repository-sort-options";

useHead({
  title: "Projects | Conor Egan",
  meta: [
    { name: "description", content: "Conor Egan's software projects" }
  ]
});

const { data: repositories, status } = useRepositories();

const { filteredRepositories, repositoryFilterOptions, selectedFilterOption } = useRepositoryFilters(repositories);
const { sortedRepositories, selectedSortOption } = useRepositorySort(filteredRepositories);

const skeletonCardCount = 3;
</script>

<template>
  <main v-if="status === 'pending'">
    <p class="visually-hidden" role="status">Loading projects...</p>
    <skeleton class="heading-skeleton"/>

    <div class="filters">
      <skeleton class="filter-skeleton"/>
      <skeleton class="filter-skeleton"/>
    </div>

    <div class="projects">
      <repository-card-skeleton v-for="card in skeletonCardCount" :key="card"/>
    </div>
  </main>
  <p v-else-if="status === 'error'">There was an error loading the projects.</p>
  <main v-else>
    <template v-if="repositories.length > 0">
      <h1>Here are some of my <span>projects</span></h1>

      <div class="filters">
        <label class="filter-control">
          <img class="filter-icon" src="~/assets/images/filter-icon.svg" alt="Filter"/>
          <select v-model="selectedFilterOption">
            <option v-for="filterOption in repositoryFilterOptions">
              {{ filterOption }}
            </option>
          </select>
        </label>

        <label class="filter-control">
          <img class="filter-icon" src="~/assets/images/sort-icon.svg" alt="Sort"/>
          <select v-model="selectedSortOption">
            <option v-for="sortOption in RepositorySortOptions">
              {{ sortOption }}
            </option>
          </select>
        </label>
      </div>

      <div class="projects">
        <repository-card v-for="repo in sortedRepositories"
                         :key="repo.url"
                         :repository="repo"/>
      </div>
    </template>
    <template v-else>
      <p>There are no projects at the moment.</p>
    </template>
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5em 1em;
  max-width: 1200px;
  margin: 0 auto;

  h1 {
    span {
      color: $colour-primary;
    }
  }

  h1,
  .heading-skeleton {
    font-size: 2em;
  }

  .heading-skeleton {
    width: 13em;
    max-width: 100%;
    height: 1.2em;
    margin: 0.67em 0;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5em 2em;
    width: 100%;
    margin-bottom: 0.5em;

    .filter-control {
      display: flex;
      align-items: center;
      gap: 0.5em;
    }

    .filter-icon {
      width: 1.1em;
      height: 1.1em;
      flex-shrink: 0;
    }

    .filter-skeleton {
      width: 13.6em;
      height: 2.8em;
    }
  }

  select {
    width: 12em;
    min-width: 0;
    padding: 0.75em 2.5em 0.75em 1em;
    color: $colour-text-primary;
    font-family: inherit;
    font-size: 1em;
    background-color: transparent;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3e%3cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23FFCD04' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 1em center;
    border: solid 1px $colour-border;
    border-radius: 0.5em;
    appearance: none;
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;

    &:hover,
    &:focus {
      border-color: $colour-border-hover;
      background-color: $colour-surface;
      outline: none;
    }

    option {
      color: $colour-text-primary;
      background-color: $colour-bg-end;
    }
  }

  .projects {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5em;
    width: 100%;
  }

  @media (min-width: 480px) {
    h1,
    .heading-skeleton {
      font-size: 2.5em;
    }
  }

  @media (min-width: 768px) {
    padding: 2em 1em;

    h1,
    .heading-skeleton {
      font-size: 3em;
    }
  }
}
</style>
