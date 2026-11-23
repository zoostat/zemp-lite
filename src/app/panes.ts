// The panes of each place, in words (open decision #203): the word of a pane's link, what the
// link says on resting over it, and the side it stands at. One table, so that the link over a
// pane, the pane's own heading and its command in ⌘K never say it differently.

import type { Snippet } from "svelte";
import type { Command } from "./commands";
import type { Pane } from "./Place.svelte";
import type { PaneName, PlaceName } from "./views";
import type { Workspace } from "./workspace-state.svelte";

interface Words {
  label: string;
  /** What the pane holds, after "Show or hide". */
  holds: string;
}

export const WORDS: { [P in PlaceName]: { [N in PaneName<P>]: Words } } = {
  script: {
    project: { label: "Project", holds: "the files of the project" },
    outline: { label: "Outline", holds: "the sections of the script" },
    notes: { label: "Notes", holds: "the notes beside the code" },
  },
  data: {
    frames: { label: "Frames of the run", holds: "the frames of the run" },
    variables: { label: "Variables", holds: "the variables of the frame" },
  },
  plots: {
    list: { label: "Plots of the run", holds: "the plots of the run" },
    about: { label: "The plot", holds: "the plot's statement and size" },
  },
  help: {
    topics: { label: "Topics", holds: "the topics of Help" },
    page: { label: "On this page", holds: "the sections of the page open" },
  },
};

/** The name of each place, as the top bar has it. */
export const PLACE: Record<PlaceName, string> = {
  script: "Script",
  data: "Data",
  plots: "Plots",
  help: "Help",
};

/** A pane of a place, for the frame: its words, whether it is open, and what it holds. */
export function paneOf<P extends PlaceName>(
  workspace: Workspace,
  place: P,
  name: PaneName<P>,
  content: Snippet | null,
): Pane {
  const words = WORDS[place][name] as Words;
  return {
    key: String(name),
    label: words.label,
    title: `Show or hide ${words.holds}`,
    open: (workspace.views.panes[place] as Record<string, boolean>)[String(name)] ?? false,
    set: (open) => workspace.setPane(place, name, open),
    content,
  };
}

/** The command of ⌘K that opens or closes a pane: "Script: show Project". */
export function paneCommand<P extends PlaceName>(
  workspace: Workspace,
  place: P,
  name: PaneName<P>,
): Command {
  const words = WORDS[place][name] as Words;
  const open = (workspace.views.panes[place] as Record<string, boolean>)[String(name)] ?? false;
  return {
    name: `${PLACE[place]}: ${open ? "hide" : "show"} ${words.label}`,
    hint: words.holds,
    run: () => workspace.setPane(place, name, !open),
  };
}
