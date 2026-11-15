// The command palette, ⌘K (Zemp Specification, section 5: "Everything else … is reached
// through ⌘K, so it adds no buttons"). A command is a name and what it does; the palette
// lists the commands whose names hold every word typed.

export interface Command {
  /** What the palette shows, with its group before a colon: "Layout: Panes". */
  name: string;
  /** A word or two at the right: the key that does the same, or what it is now. */
  hint?: string;
  run: () => void;
}

/** The commands whose names hold every word of what was typed, in their own order. */
export function matching(commands: Command[], typed: string): Command[] {
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  return commands.filter((command) => {
    const name = command.name.toLowerCase();
    return words.every((word) => name.includes(word));
  });
}
