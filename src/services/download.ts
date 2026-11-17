import type { Snapshot } from "@/data/portability";

export function snapshotFilename(snapshot: Snapshot): string {
  const date = snapshot.exportedAt.slice(0, 10);
  return `goldlist-${date}.json`;
}

export function downloadSnapshotFile(snapshot: Snapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = snapshotFilename(snapshot);
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
