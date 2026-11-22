/** What cannot be done with a project or its files, as a sentence for the reader that says what to do. */
export class ProjectError extends Error {
  override name = "ProjectError";
}
