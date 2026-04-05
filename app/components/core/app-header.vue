<script setup lang="ts">
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const route = useRoute()
watch(() => route.fullPath, closeMenu)
</script>

<template>
  <header>
    <nav>
      <button class="burger"
              :class="{ 'is-open': isMenuOpen }"
              :aria-expanded="isMenuOpen"
              aria-label="Toggle navigation menu"
              aria-controls="primary-navigation"
              @click="toggleMenu"
      >
        <!-- Three bars form the burger icon; they animate into an X when open -->
        <span/>
        <span/>
        <span/>
      </button>
      <ul id="primary-navigation" :class="{ 'is-open': isMenuOpen }">
        <li>
          <NuxtLink to="/" @click="closeMenu">Home</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/projects" @click="closeMenu">Projects</NuxtLink>
        </li>
      </ul>
    </nav>
  </header>
</template>

<style scoped lang="scss">
nav {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  min-height: 60px;

  ul {
    list-style-type: none;
    display: flex;
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin: 0;
    padding: 1.5rem;
    background-color: $colour-bg-end;
    border-top: 1px solid $colour-border;
    transform: translateY(-10px);
    opacity: 0;
    pointer-events: none;

    &.is-open {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
  }

  li > a {
    font-size: 24px;
    font-weight: 500;
    color: $colour-text-primary;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
      text-decoration-color: $colour-primary;
    }

    &.router-link-exact-active {
      color: $colour-primary;
    }
  }
}

.burger {
  display: block;
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  padding: 10px;
  background: transparent;
  border: none;
  cursor: pointer;

  span {
    display: block;
    width: 100%;
    height: 2px;
    margin: 5px 0;
    background-color: $colour-text-primary;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  &.is-open span {
    &:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }

    &:nth-child(2) {
      opacity: 0;
    }

    &:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
  }
}

@media (min-width: 768px) {
  nav {
    justify-content: center;
    min-height: auto;

    ul {
      position: static;
      flex-direction: row;
      align-items: stretch;
      gap: 2.5rem;
      margin: revert;
      padding: 0;
      background-color: transparent;
      border-top: none;
      transform: none;
      opacity: 1;
      pointer-events: auto;

      &.is-open {
        transform: none;
      }
    }

    li > a {
      font-size: 32px;
    }
  }

  .burger {
    display: none;
  }
}
</style>
