<script lang="ts">
  // A project open, until the workspace of step 6 takes this page's place: its files, its
  // script in a box that is saved as it is typed, Run and Cancel, and what was printed.
  import type { Engine } from "../engine/engine";
  import { ProjectError, type Project, type TreeNode } from "../project/projects";
  import { Session } from "../project/session";

  let { project, engine, onclose }: { project: Project; engine: Engine; onclose: () => void } =
    $props();

  const SCRIPT = "scripts/main.zeff";
  // One project to a window: this page is made anew for each project it shows.
  // svelte-ignore state_referenced_locally
  const session = new Session(project, engine);

  let text = $state("");
  let loaded = $state(false);
  let saved = $state(true);
  let tree = $state<TreeNode[]>([]);
  let output = $state("");
  let messages = $state("");
  let status = $state("starting the engine");
  let running = $state(false);
  let step = $state("");
  let problem = $state("");

  // svelte-ignore state_referenced_locally
  engine.start().then(
    (version) => (status = `engine Zeff ${version} ready`),
    (error: Error) => (status = error.message),
  );
  // svelte-ignore state_referenced_locally
  void project.readText(SCRIPT).then((read) => {
    text = read ?? "";
    loaded = true;
  });
  void refresh();

  async function refresh(): Promise<void> {
    tree = await project.tree();
  }

  // The script is saved as it is typed, each save waiting for the one before it.
  let saving: Promise<void> = Promise.resolve();
  function save(): void {
    saved = false;
    const now = text;
    saving = saving
      .then(() => project.writeText(SCRIPT, now))
      .then(() => {
        session.changed(SCRIPT);
        if (now === text) saved = true;
      });
  }

  async function run(): Promise<void> {
    running = true;
    output = "";
    messages = "";
    step = "";
    try {
      await saving;
      const outcome = await session.run(SCRIPT, text, (event) => {
        if (event.type === "output") {
          output += event.stdout;
          messages += event.stderr;
        } else if (event.type === "started") {
          step = `statement ${event.statement} of ${event.of}, line ${event.line}`;
        } else if (event.type === "pass") {
          step = `pass ${event.pass}, line ${event.line}`;
        }
      });
      status = outcome.stopped
        ? "stopped"
        : outcome.exitCode === 0
          ? "done"
          : `ended with exit code ${outcome.exitCode}`;
    } catch (error) {
      status = (error as Error).message;
    } finally {
      running = false;
    }
  }

  function cancel(): void {
    if (!engine.cancel()) {
      engine.stop();
    }
  }

  async function addData(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    problem = "";
    for (const file of input.files ?? []) {
      try {
        const path = await project.addData(file.name, new Uint8Array(await file.arrayBuffer()));
        session.changed(path);
      } catch (error) {
        problem = error instanceof ProjectError ? error.message : String(error);
      }
    }
    input.value = "";
    await refresh();
  }

  function flat(nodes: TreeNode[], depth = 0): { node: TreeNode; depth: number }[] {
    return nodes.flatMap((node) => [{ node, depth }, ...flat(node.children, depth + 1)]);
  }
</script>

<main>
  <header>
    <button class="plain" onclick={onclose}>Projects</button>
    <h1>{project.info.name}</h1>
    <span class="path mono">{SCRIPT}{saved ? "" : " · saving"}</span>
  </header>

  <div class="columns">
    <aside aria-label="Project files">
      <ul>
        {#each flat(tree) as { node, depth } (node.path)}
          <li style:padding-left="{depth * 14}px" class:folder={node.kind === "folder"}>
            {node.name}{node.kind === "folder" ? "/" : ""}
            {#if node.kind === "file"}<small>{node.size.toLocaleString("en-GB")} B</small>{/if}
          </li>
        {/each}
      </ul>
      <label class="add">
        Add a data file…
        <input type="file" multiple onchange={addData} />
      </label>
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    </aside>

    <section>
      <label for="script">The script</label>
      <textarea
        id="script"
        class="mono"
        bind:value={text}
        oninput={save}
        disabled={!loaded}
        rows="14"
        spellcheck="false"></textarea>
      <div class="bar">
        <button class="filled" onclick={run} disabled={running || !loaded}>Run</button>
        <button class="plain" onclick={cancel} disabled={!running}>Cancel</button>
        <span role="status">{status}</span>
        {#if running}<span data-testid="step">{step}</span>{/if}
      </div>
      <h2>Output</h2>
      <pre class="mono" data-testid="output">{output}</pre>
      <h2>Warnings, notes and errors</h2>
      <pre class="mono" data-testid="messages">{messages}</pre>
    </section>
  </div>
</main>

<style>
  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
    padding: 14px 18px;
  }
  header {
    align-items: baseline;
    display: flex;
    gap: 14px;
  }
  h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  h2 {
    color: var(--ink-2);
    font-size: 13.5px;
    font-weight: 500;
    margin: 14px 0 4px;
  }
  .path {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .columns {
    display: grid;
    gap: 18px;
    grid-template-columns: 240px 1fr;
    margin-top: 12px;
  }
  aside ul {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
  }
  aside li {
    padding-bottom: 3px;
    padding-top: 3px;
  }
  aside li.folder {
    color: var(--ink-2);
  }
  aside small {
    color: var(--ink-3);
    float: right;
    font-size: 12.5px;
  }
  .add {
    color: var(--accent);
    cursor: pointer;
  }
  .add input {
    height: 1px;
    opacity: 0;
    position: absolute;
    width: 1px;
  }
  textarea,
  pre {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-sizing: border-box;
    font-size: 14px;
    margin: 0;
    padding: 10px 12px;
    width: 100%;
  }
  textarea {
    background: var(--window);
    border-color: var(--line-strong);
    line-height: 1.75;
    resize: vertical;
  }
  pre {
    min-height: 2.2em;
    overflow: auto;
  }
  label[for="script"] {
    color: var(--ink-2);
    display: block;
    margin-bottom: 4px;
  }
  .bar {
    align-items: center;
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .filled,
  .plain {
    border-radius: 7px;
    padding: 4px 14px;
  }
  .filled {
    background: var(--button);
    border: 1px solid var(--button);
    color: var(--button-ink);
  }
  .filled:disabled {
    opacity: 0.55;
  }
  .plain {
    background: var(--window);
    border: 1px solid var(--line-strong);
  }
  .problem {
    color: var(--warning);
  }
</style>
