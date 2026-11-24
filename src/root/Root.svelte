<script lang="ts">
  // The landing page, at the root of the address (release 0.2.4, step 8; open decision #220,
  // item 1; the design guide, section 9, "Landing page"): laid out as a language's home page
  // is. A top bar; the name large with one line and **Open Zemp Lite**; then bands, each headed
  // with a short rule under its title: why, an example run on the carried engine, what it is
  // made for, the release's counts, and where to learn and take part; a dark foot. Every
  // number, version and output on it is the build's own, taken from the engine it carries
  // (`facts.ts`; #211, item 12), and every link goes to an address that exists. The page
  // fetches nothing of the engine.
  import { FACTS, counted, megabytes } from "../app/facts";
  import { ENGINE, VERSION, shown } from "../app/version";
  import HexIcon from "../theme/HexIcon.svelte";
  import Logo from "../theme/Logo.svelte";
  import Name from "../theme/Name.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import { USING } from "../using/pages";
  import { coloured } from "./colour";
  import { APP } from "./forward";
  import { SOURCE, inHelp, inWords, notesOf, usingPage } from "./words";

  // A build always has the facts; the development server before the worker is built does not,
  // and then the page says so where a fact would stand.
  const engine = FACTS?.engine ?? ENGINE;
  const functions = FACTS === null ? "—" : counted(FACTS.functions);
  const packages = FACTS === null ? "—" : counted(FACTS.packages);
  const codes = FACTS === null ? "—" : counted(FACTS.codes);
  const travels = FACTS === null ? "—" : megabytes(FACTS.travels);
  const script = FACTS?.script ?? "";
  const printed = FACTS?.printed ?? "";
  /** The statement whose print is shown: the script's last. */
  const last = script.trimEnd().split("\n").at(-1) ?? "";
  const version = shown(VERSION);
</script>

<header class="top">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Zemp Lite, the front page">
      <Logo size={30} />
      <span class="name"><Name /></span>
    </a>
    <nav class="nav" aria-label="This page and the app">
      <a href={APP}>Open the app</a>
      <a href="#see">See it work</a>
      <a href="#help">Help</a>
      <a href={SOURCE}>Source</a>
    </nav>
    <ThemeButton />
  </div>
</header>

<main data-testid="front">
  <section class="hero">
    <Watermark />
    <div class="wrap">
      <div>
        <h1><Name /></h1>
        <p class="lede">
          <strong>Zeff in your browser.</strong> Write a script, run it and read the results, with nothing
          to install and nothing uploaded.
        </p>
      </div>
      <div class="cta">
        <a class="btn big" href={APP}>Open <Name filled /></a>
        <a class="ver" href={notesOf(VERSION)} data-testid="front-version"
          >Version {version}<span>on the Zeff {engine} engine</span></a
        >
      </div>
    </div>
  </section>

  <section class="band deep" aria-labelledby="why">
    <div class="wrap">
      <h2 id="why">Why <Name filled />?</h2>
      <div class="cols3">
        <div>
          <HexIcon name="here" size={58} />
          <h3>Nothing to install</h3>
          <p>
            The whole Zeff engine comes down once, <span data-testid="front-travels">{travels}</span
            >, and runs inside the tab. Open the address on any computer with a modern browser and
            start. The next visit opens at once.
          </p>
        </div>
        <div>
          <HexIcon name="lock" size={58} />
          <h3>Your data stays with you</h3>
          <p>
            Projects and data files are kept in your browser's own storage on this computer. No
            account, no sign-in, and no file is sent to a server. Even the help search runs in the
            page.
          </p>
        </div>
        <div>
          <HexIcon name="same" size={58} />
          <h3>The same answers as Zeff</h3>
          <p>
            It is the same engine as the Zeff command line, not a copy of it: the same functions,
            the same messages, and the same digits on every machine, checked against R and Stata.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="band" id="see" aria-labelledby="see-title">
    <div class="wrap">
      <h2 id="see-title">See it work</h2>
      <p class="intro">
        The Scratch project that opens with the app: three wage regressions on the panel that ships
        with Zeff, from plain robust errors to fixed effects with clustering, in one table.
      </p>
      <div class="run">
        <div>
          <div class="pane-h">
            <b>main.zeff</b> · Scratch project<span class="chip" aria-hidden="true">Run</span>
          </div>
          <pre data-testid="front-script">{#each coloured(script) as piece, at (at)}<span
                class={piece.kind}>{piece.text}</span
              >{/each}</pre>
        </div>
        <div class="out">
          <div class="pane-h"><b>Output</b> · <span class="mono">{last}</span></div>
          <pre data-testid="front-printed">{printed}</pre>
        </div>
      </div>
      <p class="caption">
        The output is the engine's own print for this script, as Zeff {engine} gives it.
      </p>
    </div>
  </section>

  <section class="band grey" aria-labelledby="made-for">
    <div class="wrap">
      <h2 id="made-for">Made for</h2>
      <div class="cols4">
        <div class="use">
          <HexIcon name="teach" size={58} />
          <h3>Teaching</h3>
          <p>
            One address for a whole class. No laboratory installs and no licences, and every
            student's numbers agree with yours.
          </p>
          <a class="btn small" href={usingPage("getting-started")}>Getting started</a>
        </div>
        <div class="use">
          <HexIcon name="search" size={58} />
          <h3>Learning Zeff</h3>
          <p>
            Point at a name to see its usage, press F1 for its page, or search by the R or Stata
            name you already know: <code>lm</code> finds <code>reg</code>.
          </p>
          <a class="btn small" href={usingPage("finding-help")}>Finding help</a>
        </div>
        <div class="use">
          <HexIcon name="bars" size={58} />
          <h3>Looking at data</h3>
          <p>
            Add a CSV from your computer, browse it in the data viewer with a histogram over each
            column, and draw plots that fit the window.
          </p>
          <a class="btn small" href={usingPage("the-data-place")}>The Data place</a>
        </div>
        <div class="use">
          <HexIcon name="out" size={58} />
          <h3>Taking work away</h3>
          <p>
            Export a project as one file to keep, send or open again on another computer, with its
            scripts, its data and its results.
          </p>
          <a class="btn small" href={usingPage("exporting-and-opening-a-project")}
            >Exporting a project</a
          >
        </div>
      </div>
    </div>
  </section>

  <section class="band" id="notes" aria-labelledby="in-version">
    <div class="wrap">
      <h2 id="in-version">In version {version}</h2>
      <div class="nums">
        <div class="num">
          <b data-testid="front-functions">{functions}</b>
          <span
            >functions in <span data-testid="front-packages">{packages}</span> packages, each with its
            help page</span
          >
        </div>
        <div class="num">
          <b data-testid="front-codes">{codes}</b>
          <span>error and warning codes, each explained</span>
        </div>
        <div class="num">
          <b>{travels}</b>
          <span>to download, once, for the whole engine</span>
        </div>
        <div class="num">
          <b>0</b>
          <span>accounts, sign-ins or uploads</span>
        </div>
      </div>
    </div>
  </section>

  <section class="band deep" id="help" aria-labelledby="learn">
    <div class="wrap">
      <h2 id="learn">Learn and take part</h2>
      <div class="cols3">
        <div class="use">
          <h3>Read the help</h3>
          <p>
            Help is inside the app: a page for every function and every message, {inWords(
              USING.length,
            )} pages on the app itself, and search as you type.
          </p>
          <a class="btn small" href={inHelp({ kind: "home" })}>Open Help</a>
        </div>
        <div class="use">
          <h3>Report a problem</h3>
          <p>
            A wrong number, a confusing message or a screen that misbehaves: tell us, with the
            script that shows it, and we will look.
          </p>
          <a class="btn small" href={usingPage("reporting-a-problem")}>Report a problem</a>
        </div>
        <div class="use">
          <h3>Read the source</h3>
          <p>
            <Name filled /> is open source under the Apache 2.0 licence. Every release, its notes and
            its measures are public.
          </p>
          <a class="btn small" href={SOURCE}>See the source</a>
        </div>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="cols3">
      <div>
        <h4>Get help</h4>
        <ul>
          <li><a href={inHelp({ kind: "home" })}>Help in the app</a></li>
          <li><a href={usingPage("reporting-a-problem")}>Report a problem</a></li>
          <li><a href={notesOf(VERSION)}>Release notes of {version}</a></li>
        </ul>
      </div>
      <div>
        <h4>Terms</h4>
        <ul>
          <li><a href="{SOURCE}/blob/main/LICENSE">Licence: Apache 2.0</a></li>
          <li><a href="{SOURCE}/blob/main/NOTICE">Notices</a></li>
          <li>
            <a href={usingPage("where-the-work-is-kept")}>Privacy: where your work is kept</a>
          </li>
          <li><a href="/counted.html">What is counted</a></li>
        </ul>
      </div>
      <div>
        <h4>Zeff</h4>
        <ul>
          <li><a href={inHelp({ kind: "packages" })}>The {functions} functions, in Help</a></li>
          <li>
            <a href={inHelp({ kind: "codes", family: null })}>Errors and warnings, in Help</a>
          </li>
          <li><a href={SOURCE}>Source of <Name filled /></a></li>
        </ul>
      </div>
    </div>
    <p class="fbase">
      <em>A statistics language for empirical and causal research.</em><br />
      <Name filled />
      {version} · Zeff {engine}
    </p>
  </div>
</footer>

<style>
  /* A page to read, not a screen of the app: its text is set at the reading size of the
     design guide, section 4, and the page scrolls as a document does. */
  :global(html),
  :global(body) {
    height: auto;
  }
  :global(body) {
    background: var(--window);
    font-size: 16.5px;
    line-height: 1.6;
    overflow-x: clip;
  }
  :global(#root) {
    display: block;
  }
  a {
    color: inherit;
  }
  .wrap {
    box-sizing: border-box;
    margin: 0 auto;
    max-width: 1120px;
    padding: 0 32px;
  }

  /* The top bar. */
  .top {
    backdrop-filter: blur(10px);
    background: color-mix(in srgb, var(--window) 88%, transparent);
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .top .wrap {
    align-items: center;
    display: flex;
    gap: 22px;
    height: 64px;
  }
  .brand {
    align-items: center;
    display: flex;
    gap: 10px;
    text-decoration: none;
  }
  .name {
    font:
      600 22px/1 "Newsreader",
      serif;
  }
  .name :global(.lite) {
    font-size: 11px;
    top: -0.4em;
  }
  .nav {
    display: flex;
    font-size: 15px;
    gap: 22px;
    margin-left: auto;
  }
  .nav a {
    color: var(--ink-2);
    text-decoration: none;
  }
  .nav a:hover {
    color: var(--accent);
  }

  /* The name, its line and the way in. */
  .hero {
    overflow: hidden;
    position: relative;
  }
  .hero .wrap {
    align-items: center;
    display: grid;
    gap: 48px;
    grid-template-columns: 1fr auto;
    padding-bottom: 104px;
    padding-top: 96px;
    position: relative;
    z-index: 1;
  }
  h1 {
    font:
      600 92px/1 "Newsreader",
      serif;
    letter-spacing: -0.01em;
    margin: 0 0 22px;
  }
  h1 :global(.lite) {
    font-size: 0.26em;
    margin-left: 0.08em;
    top: -0.35em;
  }
  .lede {
    color: var(--ink-2);
    font-size: 23px;
    line-height: 1.45;
    margin: 0;
    max-width: 560px;
  }
  .lede strong {
    color: var(--ink);
    font-weight: 600;
  }
  .cta {
    text-align: center;
  }
  .btn {
    border-radius: 6px;
    display: inline-block;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-decoration: none;
    text-transform: uppercase;
  }
  .btn :global(.lite) {
    text-transform: none;
  }
  .btn.big {
    background: var(--button);
    box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--button) 70%, transparent);
    color: var(--button-ink);
    font-size: 19px;
    padding: 20px 46px;
  }
  .btn.big:hover {
    filter: brightness(1.08);
  }
  .ver {
    color: var(--accent);
    display: block;
    font-size: 15px;
    margin-top: 14px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .ver span {
    color: var(--ink-3);
    display: block;
    font-size: 14px;
    margin-top: 2px;
  }

  /* The bands. */
  .band {
    padding: 72px 0 80px;
    position: relative;
    scroll-margin-top: 64px;
  }
  .band.deep {
    background: var(--deep);
    color: var(--deep-ink);
  }
  .band.grey {
    background: var(--soft);
  }
  h2 {
    border-bottom: 4px solid var(--rule);
    display: inline-block;
    font:
      600 34px/1.15 "Newsreader",
      serif;
    margin: 0 0 40px;
    padding-bottom: 10px;
  }
  .band.deep h2 {
    border-color: var(--violet-3);
  }
  h3 {
    font:
      700 21px/1.3 "Atkinson Hyperlegible Next",
      sans-serif;
    margin: 0 0 10px;
  }
  p {
    margin: 0;
  }
  .intro {
    color: var(--ink-2);
    margin: -18px 0 40px;
    max-width: 760px;
  }
  .cols3 {
    display: grid;
    gap: 44px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .cols4 {
    display: grid;
    gap: 32px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .band :global(svg) {
    margin-bottom: 14px;
  }
  .band.deep p,
  .band.deep :global(svg) {
    color: var(--deep-muted);
  }
  .use {
    display: flex;
    flex-direction: column;
  }
  .use p {
    color: var(--ink-2);
    flex: 1;
    margin: 0 0 20px;
  }
  .band.deep .use p {
    color: var(--deep-muted);
  }
  .use code {
    font:
      0.9em "JetBrains Mono",
      monospace;
  }
  .btn.small {
    border: 1.5px solid var(--accent);
    color: var(--accent);
    font-size: 13px;
    padding: 11px 14px;
    text-align: center;
  }
  .btn.small:hover {
    background: var(--button);
    color: var(--button-ink);
  }
  .band.deep .btn.small {
    border-color: var(--deep-muted);
    color: var(--deep-ink);
  }
  .band.deep .btn.small:hover {
    background: var(--deep-ink);
    color: var(--deep);
  }

  /* The script and what the engine prints for it. */
  .run {
    background: var(--tint);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow: 0 24px 48px -32px rgba(46, 26, 94, 0.45);
    overflow: hidden;
  }
  .run > div + div {
    border-top: 1px solid var(--line);
  }
  .pane-h {
    align-items: center;
    border-bottom: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    font-size: 13.5px;
    gap: 6px;
    padding: 10px 16px;
  }
  .pane-h b {
    color: var(--ink);
    font-weight: 600;
  }
  .chip {
    background: var(--button);
    border-radius: 5px;
    color: var(--button-ink);
    font-weight: 600;
    margin-left: auto;
    padding: 3px 12px;
  }
  .out {
    background: var(--window);
  }
  pre {
    color: var(--ink);
    font:
      13.5px/1.6 "JetBrains Mono",
      monospace;
    margin: 0;
    overflow-x: auto;
    padding: 18px 18px 22px;
  }
  .out pre {
    font-size: 12.5px;
  }
  .keyword {
    color: var(--code-keyword);
  }
  .function {
    color: var(--code-function);
  }
  .option {
    color: var(--code-option);
  }
  .operator {
    color: var(--code-operator);
  }
  .number {
    color: var(--code-number);
  }
  .comment {
    color: var(--code-comment);
    font-style: italic;
  }
  .caption {
    color: var(--ink-3);
    font-size: 14px;
    margin-top: 14px;
  }

  /* The release's counts. */
  .nums {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .num b {
    color: var(--accent);
    display: block;
    font:
      600 52px/1 "Newsreader",
      serif;
    margin-bottom: 8px;
  }
  .num span {
    color: var(--ink-2);
    font-size: 15px;
  }

  /* The foot. */
  footer {
    background: var(--foot);
    color: var(--foot-ink);
    font-size: 15px;
    padding: 56px 0 36px;
  }
  footer .cols3 {
    gap: 32px;
  }
  h4 {
    font-size: 17px;
    margin: 0 0 14px;
  }
  footer ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  footer li {
    margin: 0 0 8px;
  }
  footer a {
    color: var(--foot-muted);
    text-decoration: none;
  }
  footer a:hover {
    color: var(--foot-ink);
    text-decoration: underline;
  }
  .fbase {
    border-top: 1px solid color-mix(in srgb, var(--foot-muted) 25%, transparent);
    color: var(--foot-muted);
    font-size: 14px;
    margin-top: 44px;
    padding-top: 24px;
    text-align: center;
  }
  .fbase em {
    color: var(--foot-ink);
    font-family: "Newsreader", serif;
    font-size: 17px;
  }

  @media (max-width: 980px) {
    .cols4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .nums {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 760px) {
    .nav {
      display: none;
    }
    .top :global(.round) {
      margin-left: auto;
    }
    .hero .wrap {
      gap: 32px;
      grid-template-columns: minmax(0, 1fr);
      padding-bottom: 64px;
      padding-top: 56px;
    }
    .cta {
      text-align: left;
    }
  }
  @media (max-width: 640px) {
    .wrap {
      padding: 0 16px;
    }
    h1 {
      font-size: 58px;
    }
    .lede {
      font-size: 19px;
    }
    h2 {
      font-size: 27px;
    }
    .cols3,
    .cols4 {
      gap: 34px;
      grid-template-columns: minmax(0, 1fr);
    }
    .btn.big {
      display: block;
      padding: 18px 20px;
      text-align: center;
    }
    .band {
      padding: 52px 0 60px;
    }
    .num b {
      font-size: 40px;
    }
    footer .cols3 {
      grid-template-columns: minmax(0, 1fr);
    }
    pre {
      font-size: 12.5px;
    }
  }
</style>
