import { describe, expect, it, vi } from "vitest";
import { requestPersistentStorage } from "@/services/storage";

describe("requestPersistentStorage", () => {
  it("returns true when persistence is granted", async () => {
    await expect(
      requestPersistentStorage({ persist: vi.fn(async () => true) }),
    ).resolves.toBe(true);
  });

  it("returns false when persistence is denied", async () => {
    await expect(
      requestPersistentStorage({ persist: vi.fn(async () => false) }),
    ).resolves.toBe(false);
  });

  it("returns false when the browser does not support it", async () => {
    await expect(requestPersistentStorage({})).resolves.toBe(false);
  });

  it("returns false when the request throws", async () => {
    await expect(
      requestPersistentStorage({
        persist: vi.fn(async () => {
          throw new Error("denied");
        }),
      }),
    ).resolves.toBe(false);
  });
});
