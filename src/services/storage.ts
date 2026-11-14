export interface StorageManagerLike {
  persist?: () => Promise<boolean>;
}

export async function requestPersistentStorage(
  storage?: StorageManagerLike,
): Promise<boolean> {
  const manager = storage ?? (typeof navigator !== "undefined" ? navigator.storage : undefined);
  if (!manager?.persist) {
    return false;
  }

  try {
    return await manager.persist();
  } catch {
    return false;
  }
}
