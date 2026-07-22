// Same lightweight window-event pattern as lib/toast.ts — lets any component
// (e.g. a dashboard insight card's "Ask AI" button) open the real Copilot
// panel with a specific question/answer already in it, instead of firing a
// toast that just repeats text and vanishes.
export type CopilotAsk = { question: string; answer: string };

export function askCopilot(question: string, answer: string) {
  window.dispatchEvent(new CustomEvent<CopilotAsk>("fuse:copilot-ask", { detail: { question, answer } }));
}
