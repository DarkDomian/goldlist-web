import { expect, test, type Page } from "@playwright/test";

async function addWord(page: Page, word: string) {
  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("English word or phrase").fill(word);
  await page.getByRole("button", { name: "Translate" }).click();
  await expect(page.getByLabel("Russian translation")).toHaveValue(`${word} (ru)`);
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: word })).toBeVisible();
}

async function makeDue(page: Page, word: string) {
  await page.evaluate(async (target) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("goldlist");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cards", "readwrite");
      const store = transaction.objectStore("cards");
      const request = store.getAll();
      request.onsuccess = () => {
        const card = (request.result as Array<Record<string, unknown>>).find(
          (entry) => entry.wordKey === target,
        );
        if (!card) {
          reject(new Error(`missing card ${target}`));
          return;
        }
        card.scheduledFor = new Date(Date.now() - 86_400_000).toISOString();
        store.put(card);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, word);
}

test("adds, distills, and browses the archive offline", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page.getByRole("heading", { name: "Words from today" })).toBeVisible();

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
      });
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Words from today" })).toBeVisible();

  await addWord(page, "offline");
  await makeDue(page, "offline");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Words from today" })).toBeVisible();

  await page.getByRole("link", { name: /^Distill/ }).click();
  await expect(page.getByRole("heading", { name: "Recall the Russian" })).toBeVisible();
  await page.getByLabel("Your Russian translation").fill("offline (ru)");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("heading", { name: "Learned." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("link", { name: "Archive" }).click();
  await expect(
    page.getByRole("heading", { name: "Everything you have gathered" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open card offline" })).toBeVisible();
  await expect(page.getByText("offline (ru)")).not.toBeVisible();
});
