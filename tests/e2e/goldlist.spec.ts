import { expect, test, type Page } from "@playwright/test";

async function mockExamples(page: Page) {
  await page.route("https://api.tatoeba.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    }),
  );
}

async function onboard(page: Page) {
  await mockExamples(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A quieter way to grow your English." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page.getByRole("heading", { name: "Words from today" })).toBeVisible();
}

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

test("onboarding, adding a word, duplicate blocking, and theme persistence", async ({
  page,
}) => {
  await onboard(page);
  await addWord(page, "curious");

  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("English word or phrase").fill("CURIOUS");
  await page.getByRole("button", { name: "Translate" }).click();
  await expect(page.getByRole("alert")).toHaveText("you already knew that");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Make it comfortable" })).toBeVisible();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Make it comfortable" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("distillation pass and fail, archive, re-learn, and delete", async ({ page }) => {
  await onboard(page);
  await addWord(page, "alpha");
  await addWord(page, "beta");
  await makeDue(page, "alpha");
  await makeDue(page, "beta");
  await page.reload();

  await page.getByRole("link", { name: /^Distill/ }).click();
  await expect(page.getByRole("heading", { name: "Recall the Russian" })).toBeVisible();
  await page.getByLabel("Your Russian translation").fill("alpha (ru)");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("heading", { name: "Learned." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Recall the Russian" })).toBeVisible();
  await page.getByLabel("Your Russian translation").fill("not the answer");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("heading", { name: "Not yet." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Nothing due right now" })).toBeVisible();

  await page.getByRole("link", { name: "Archive" }).click();
  await expect(
    page.getByRole("heading", { name: "Everything you have gathered" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learned" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waiting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "alpha" })).toBeVisible();
  await expect(page.getByText("alpha (ru)")).not.toBeVisible();
  await expect(page.getByRole("img", { name: "Waiting silver card" })).toBeVisible();

  await page.getByRole("link", { name: "Open card alpha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "alpha" })).toBeVisible();
  await page.getByRole("button", { name: "Re-learn this card" }).click();
  await expect(page.getByRole("heading", { name: "Words from today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "alpha" })).toBeVisible();

  await page.getByRole("link", { name: "Open card alpha" }).click();
  await page.getByRole("button", { name: "Delete card" }).click();
  await expect(page.getByRole("dialog", { name: "Delete this card?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Everything you have gathered" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "alpha" })).not.toBeVisible();
});

test("midnight cutoff moves the Current Day into the archive", async ({ page }) => {
  await mockExamples(page);
  await page.clock.install({ time: new Date("2026-03-07T23:59:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await addWord(page, "midnight");

  await page.clock.fastForward(120_000);
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.getByRole("heading", { name: "Waiting" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Waiting copper card" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "midnight" })).not.toBeVisible();
});

test("mobile layout keeps actions reachable and avoids horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  await addWord(page, "pocket");

  await expect(page.getByRole("button", { name: "Add a word" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(fits).toBe(true);
});
