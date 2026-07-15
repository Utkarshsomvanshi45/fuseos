// Tiny toast bus — decoupled from any UI framework. Toaster component listens.
export type ToastKind = "info" | "success" | "warn" | "error";
export type ToastPayload = { id: number; kind: ToastKind; text: string };

let seq = 1;
export function toast(text: string, kind: ToastKind = "info") {
  const detail: ToastPayload = { id: seq++, kind, text };
  window.dispatchEvent(new CustomEvent<ToastPayload>("fuse:toast", { detail }));
}
