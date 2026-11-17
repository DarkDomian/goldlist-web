import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/features/settings/SettingsPage";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import type { Snapshot } from "@/data/portability";
import { getSettings } from "@/data/settingsRepository";
import { DEFAULT_SETTINGS } from "@/domain/types";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:snapshot"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await database.delete();
});

const timestamp = "2026-11-15T12:00:00.000Z";

function makeSnapshot(word = "imported"): Snapshot {
  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    appVersion: "0.1.0",
    payload: {
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      cards: [
        {
          id: `card-${word}`,
          word,
          wordKey: word,
          translation: `${word} translation`,
          status: "copper",
          createdAt: timestamp,
          statusChangedAt: timestamp,
          scheduledFor: null,
        },
      ],
      examples: [
        {
          id: `example-${word}`,
          cardId: `card-${word}`,
          text: `An example with ${word}.`,
          source: "tatoeba",
        },
      ],
      attempts: [
        {
          id: `attempt-${word}`,
          cardId: `card-${word}`,
          attemptedAt: timestamp,
          userAnswer: `${word} translation`,
          expectedAnswer: `${word} translation`,
          isCorrect: true,
          previousStatus: "copper",
          resultingStatus: "silver",
        },
      ],
    },
  };
}

function fileFor(snapshot: Snapshot): File {
  return new File([JSON.stringify(snapshot)], "goldlist-export.json", {
    type: "application/json",
  });
}

async function upload(snapshot: Snapshot) {
  await userEvent.upload(screen.getByLabelText("Import data file"), fileFor(snapshot));
  expect(await screen.findByText("Ready to import")).toBeInTheDocument();
}

function renderSettings() {
  return render(
    renderProviders({
      services: makeServices({ database }),
      initialEntries: ["/settings"],
      children: <SettingsPage />,
    }),
  );
}

describe("SettingsPage", () => {
  it("shows the app version and fixed language pair", async () => {
    renderSettings();
    expect(await screen.findByText("Make it comfortable")).toBeInTheDocument();
    expect(screen.getByText("test-version")).toBeInTheDocument();
    expect(screen.getByText("Russian")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("changes and persists the theme", async () => {
    const view = renderSettings();
    await screen.findByText("Make it comfortable");

    await userEvent.click(screen.getByRole("button", { name: "Dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect((await getSettings(database)).theme).toBe("dark");

    view.unmount();
    renderSettings();
    await screen.findByText("Make it comfortable");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  });

  it("offers a system theme that follows the device", async () => {
    const listeners = new Set<() => void>();
    const mediaState = {
      matches: false,
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        listeners.add(listener);
      }),
      removeEventListener: vi.fn((_type: string, listener: () => void) => {
        listeners.delete(listener);
      }),
    };
    const media = mediaState as unknown as MediaQueryList;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => media);

    try {
      const view = renderSettings();
      await screen.findByText("Make it comfortable");
      await userEvent.click(screen.getByRole("button", { name: "System" }));

      await waitFor(() =>
        expect(document.documentElement.dataset.theme).toBe("light"),
      );
      expect((await getSettings(database)).theme).toBe("system");
      expect(localStorage.getItem("goldlist-theme")).toBe("system");

      mediaState.matches = true;
      for (const listener of listeners) {
        listener();
      }
      await waitFor(() =>
        expect(document.documentElement.dataset.theme).toBe("dark"),
      );

      view.unmount();
      expect(media.removeEventListener).toHaveBeenCalled();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("changes and persists the example selection mode", async () => {
    renderSettings();
    await screen.findByText("Make it comfortable");

    const automatic = screen.getByRole("button", { name: "Automatic" });
    const manual = screen.getByRole("button", { name: "Manual" });
    expect(automatic).toHaveAttribute("aria-pressed", "true");
    expect(manual).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(manual);
    await waitFor(async () =>
      expect((await getSettings(database)).exampleSelectionMode).toBe("manual"),
    );
    await waitFor(() => expect(manual).toHaveAttribute("aria-pressed", "true"));
  });



  it("exports a snapshot with a downloadable JSON file", async () => {
    await createCard(database, {
      word: "curious",
      translation: "любопытный",
      examples: [],
    });
    renderSettings();
    await screen.findByText("Make it comfortable");

    await userEvent.click(screen.getByRole("button", { name: "Export data" }));

    expect(
      await screen.findByText(/Exported 1 settings, 1 cards, 0 examples, 0 attempts/),
    ).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("previews and cancels an import without changing data", async () => {
    renderSettings();
    await screen.findByText("Make it comfortable");

    await upload(makeSnapshot());
    expect(screen.getByText("Cards")).toBeInTheDocument();
    expect(screen.getByText("Attempts")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel import" }));

    expect(screen.queryByText("Ready to import")).not.toBeInTheDocument();
    expect(await database.cards.count()).toBe(0);
  });

  it("merges imported data", async () => {
    await database.settings.put({ ...DEFAULT_SETTINGS, onboardingCompleted: true });
    await createCard(database, {
      word: "existing",
      translation: "существующий",
      examples: [],
    });
    renderSettings();
    await screen.findByText("Make it comfortable");

    await upload(makeSnapshot());
    await userEvent.click(screen.getByRole("button", { name: "Merge data" }));

    expect(await screen.findByText(/Imported 0 settings, 1 cards, 1 examples, 1 attempts/)).toBeInTheDocument();
    expect(await database.cards.count()).toBe(2);
    expect(
      await database.cards.where("wordKey").equals("imported").first(),
    ).toBeDefined();
  });

  it("requires confirmation and downloads a backup before replacing data", async () => {
    await createCard(database, {
      word: "existing",
      translation: "существующий",
      examples: [],
    });
    renderSettings();
    await screen.findByText("Make it comfortable");
    await upload(makeSnapshot());

    await userEvent.click(screen.getByRole("button", { name: "Replace all data" }));
    expect(screen.getByRole("alertdialog", { name: "Replace all data?" })).toBeInTheDocument();
    expect(await database.cards.count()).toBe(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Replace and download backup" }),
    );

    expect(await screen.findByText(/Imported 1 settings, 1 cards, 1 examples, 1 attempts/)).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(await database.cards.count()).toBe(1);
    expect(
      await database.cards.where("wordKey").equals("imported").first(),
    ).toBeDefined();
  });

  it("does not replace data when the backup download fails", async () => {
    await createCard(database, {
      word: "existing",
      translation: "существующий",
      examples: [],
    });
    renderSettings();
    await screen.findByText("Make it comfortable");
    await upload(makeSnapshot());
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error("download blocked");
    });

    await userEvent.click(screen.getByRole("button", { name: "Replace all data" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Replace and download backup" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("download blocked");
    expect(await database.cards.count()).toBe(1);
    expect(
      await database.cards.where("wordKey").equals("existing").first(),
    ).toBeDefined();
  });

  it("does not expose forbidden settings", async () => {
    renderSettings();
    await screen.findByText("Make it comfortable");
    expect(screen.queryByText(/cutoff/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/freeze/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /language/i })).not.toBeInTheDocument();
  });
});
