/** Longest body a Note may hold. */
export const NOTE_BODY_MAX = 20_000;
export const NOTE_TITLE_MAX = 120;
export const STARTER_NOTEBOOK = "Notes";

/** What a Note is called when it has no title. */
export const noteTitle = (title: string) => title.trim() || "Untitled";

/** One block of a Note's Markdown, as the reader and the checkbox toggle see it. */
export type NoteBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string; line: number }
  | { kind: "bullet"; text: string; line: number }
  | { kind: "check"; checked: boolean; text: string; line: number }
  | { kind: "paragraph"; text: string; line: number }
  | { kind: "blank"; line: number };

const HEADING = /^(#{1,3})\s+(.*)$/;
const CHECK = /^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;

/** Reads the small Markdown subset Notes support: headings, bullets, checkboxes and paragraphs. */
export function parseNote(body: string): NoteBlock[] {
  return body.split("\n").map((raw, line): NoteBlock => {
    const text = raw.replace(/\r$/, "");
    if (text.trim() === "") return { kind: "blank", line };
    const check = CHECK.exec(text);
    if (check) return { kind: "check", checked: check[1] !== " ", text: check[2], line };
    const heading = HEADING.exec(text);
    if (heading) return { kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2], line };
    const bullet = BULLET.exec(text);
    if (bullet) return { kind: "bullet", text: bullet[1], line };
    return { kind: "paragraph", text, line };
  });
}

/** The body with the checkbox on one line ticked or unticked; every other line is left exactly as it was. */
export function toggleCheckbox(body: string, line: number): string {
  const lines = body.split("\n");
  const current = lines[line];
  if (current === undefined) return body;
  lines[line] = current.replace(/\[( |x|X)\]/, (_, mark: string) => (mark === " " ? "[x]" : "[ ]"));
  return lines.join("\n");
}

/** A short plain-text preview of a body for the list: Markdown marks stripped, one line. */
export function excerpt(body: string, max = 140): string {
  const plain = body
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+\[( |x|X)\]\s?/, "").replace(/^\s*[-*]\s+/, "").replace(/^#{1,3}\s+/, "").trim())
    .filter(Boolean)
    .join(" · ");
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

type Dated = { title: string; body: string; createdAt: Date; updatedAt: Date };

const day = (d: Date) => d.toISOString().slice(0, 10);

/** One Note as plain text to paste elsewhere: its title, when it was written and last edited, then the body. */
export function noteAsText(note: Dated): string {
  const dates = day(note.createdAt) === day(note.updatedAt) ? day(note.createdAt) : `${day(note.createdAt)}, edited ${day(note.updatedAt)}`;
  return [`${noteTitle(note.title)} (${dates})`, note.body.trim()].filter(Boolean).join("\n\n");
}
