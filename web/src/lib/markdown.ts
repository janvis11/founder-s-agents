import { Marked } from "marked";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Drafts are written by models and playbooks by the founder. Raw HTML in
// either is shown as text, never rendered.
const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }) {
      return escape(text);
    },
  },
});

export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false });
}
