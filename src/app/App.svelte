<script lang="ts">
  import { ENGINE, VERSION, shown } from "./version";
</script>

<main>
  <h1>Zemp Lite {shown(VERSION)}</h1>
  <p>The code-first workspace for the Zeff language, on the engine Zeff {ENGINE}.</p>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    margin: 4rem auto;
    max-width: 40rem;
    padding: 0 1rem;
  }
</style>
