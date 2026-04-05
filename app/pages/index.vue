<script setup lang="ts">
useHead({
  title: "Home | Conor Egan",
  meta: [
    { name: "description", content: "Portfolio website for Conor Egan, a Software Engineer" }
  ]
});
</script>

<template>
  <main>
    <h1>I'm <span>Conor Egan</span></h1>
    <h2>a Software Engineer, passionate about crafting digital solutions.</h2>

    <div class="images">
      <img src="~/assets/images/profile-picture.jpg" id="profile-picture" alt="Picture of Conor Egan"/>

      <div class="icons">
        <a href="https://www.linkedin.com/in/c-eg/" target="_blank">
          <img src="~/assets/images/linkedin-icon.svg" alt="LinkedIn icon"/>
        </a>

        <a href="https://github.com/c-eg" target="_blank">
          <img src="~/assets/images/github-icon.svg" alt="GitHub icon"/>
        </a>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5em 1em;
  max-width: 1200px;
  margin: 0 auto;

  h1 {
    font-size: 2.25em;

    span {
      color: $colour-primary;
    }
  }

  h2 {
    font-size: 1.25em;
    font-weight: normal;
    color: $colour-text-muted;
  }

  .images {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5em;

    img#profile-picture {
      width: 8em;
      max-width: 100%;
      border: 3px solid $colour-primary;
      border-radius: 50%;
      padding: 0.5em;
    }

    .icons {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 1em;
    }
  }

  @media (min-width: 480px) {
    h1 {
      font-size: 3em;
    }

    h2 {
      font-size: 1.75em;
    }

    .images img#profile-picture {
      width: 10em;
    }
  }

  @media (min-width: 768px) {
    padding: 2em 1em;

    h1 {
      font-size: 5em;
    }

    h2 {
      font-size: 3em;
    }

    .images {
      flex-direction: row;
      gap: 2em;

      img#profile-picture {
        width: 15em;
      }

      .icons {
        flex-direction: column;
      }
    }
  }
}
</style>
