type ReloadListener = () => void;

const channels = new Map<string, Set<ReloadListener>>();

const bc: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("table:reload")
    : null;

if (bc) {
  bc.onmessage = (ev: MessageEvent) => {
    const { type, name } = ev.data || {};
    if (type === "table:reload" && typeof name === "string") {
      notify(name);
    }
  };
}

function notify(name: string) {
  const set = channels.get(name);
  if (!set || set.size === 0) return;
  for (const fn of Array.from(set)) {
    try { fn(); } catch (err) { console.error("[table:reload] listener error", err); }
  }
}

export function reloadTable(name: string) {
  notify(name);
  bc?.postMessage({ type: "table:reload", name });
}

export function subscribeTableReload(name: string, listener: ReloadListener): () => void {
  let set = channels.get(name);
  if (!set) {
    set = new Set();
    channels.set(name, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) channels.delete(name);
  };
}
