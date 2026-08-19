/**
 * Cross-menu / cross-tab data change notifications.
 *
 * IndexedDB has no change events, so every write helper emits one of these
 * keys. `DataSyncContext` listens and reloads the affected slice, which keeps
 * every mounted menu (Incident, Import Excel, OLT, List Team Region) in sync
 * instantly without a page reload.
 */

export type DataSyncKey = "excel" | "olt" | "regional";

export const DATA_SYNC_EVENT = "noc-data-sync";

const CHANNEL_NAME = "noc-data-sync";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

/** Notify this tab (and every other open tab) that a data slice changed. */
export function emitDataSync(key: DataSyncKey): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<DataSyncKey>(DATA_SYNC_EVENT, { detail: key }));
  } catch {
    /* noop */
  }
  try {
    getChannel()?.postMessage(key);
  } catch {
    /* noop */
  }
}

/** Subscribe to data changes. Returns an unsubscribe function. */
export function onDataSync(listener: (key: DataSyncKey) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const localListener = (event: Event) => {
    const detail = (event as CustomEvent<DataSyncKey>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(DATA_SYNC_EVENT, localListener);

  const bc = getChannel();
  const bcListener = (event: MessageEvent) => {
    if (typeof event.data === "string") listener(event.data as DataSyncKey);
  };
  bc?.addEventListener("message", bcListener);

  return () => {
    window.removeEventListener(DATA_SYNC_EVENT, localListener);
    bc?.removeEventListener("message", bcListener);
  };
}
