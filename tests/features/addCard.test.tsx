import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddCardDialog } from "@/features/add-card/AddCardDialog";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import type { ExampleDraft, ExampleSelectionMode } from "@/domain/types";
import { ServicesProvider, type AppServices } from "@/services/ServicesContext";
import type {
  TranslationService,
  TranslationStatus,
} from "@/services/translation/types";
import { makeServices } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

function renderDialog({
  onClose = vi.fn(),
  translation,
  examples,
  exampleSelectionMode = "auto",
}: {
  onClose?: () => void;
  translation?: TranslationService;
  examples?: AppServices["examples"];
  exampleSelectionMode?: ExampleSelectionMode;
} = {}) {
  const services = makeServices({ database, translation, examples });
  render(
    <ServicesProvider services={services}>
      <AddCardDialog
        open
        onClose={onClose}
        exampleSelectionMode={exampleSelectionMode}
      />
    </ServicesProvider>,
  );
  return { onClose };
}

function makeControllableTranslation(initial: TranslationStatus) {
  let status = initial;
  const listeners = new Set<(next: TranslationStatus) => void>();
  let resolveTranslation: ((translation: string) => void) | undefined;
  const service: TranslationService = {
    translate: vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveTranslation = resolve;
        }),
    ),
    getStatus: () => status,
    subscribeStatus(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      listeners.clear();
    },
  };
  return {
    service,
    setStatus(next: TranslationStatus) {
      status = next;
      for (const listener of listeners) {
        listener(next);
      }
    },
    resolve(translation = "любопытный") {
      resolveTranslation?.(translation);
    },
  };
}

describe("AddCardDialog", () => {
  it("translates, shows examples, and saves a card", async () => {
    const { onClose } = renderDialog();
    await userEvent.type(
      screen.getByLabelText("English word or phrase"),
      "curious",
    );
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));

    const translation = await screen.findByLabelText("Russian translation");
    await waitFor(() => expect(translation).toHaveValue("curious (перевод)"));

    expect(await screen.findByText("An example sentence with curious.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const card = await database.cards.where("wordKey").equals("curious").first();
    expect(card).toBeDefined();
    expect(card?.status).toBe("copper");
    expect(await database.examples.where("cardId").equals(card!.id).count()).toBe(1);
  });

  it("lets manual selection store only chosen candidates", async () => {
    const candidates: ExampleDraft[] = [
      { text: "A curious cat.", source: "tatoeba" },
      { text: "A curious dog.", source: "tatoeba" },
      { text: "A curious bird.", source: "tatoeba" },
    ];
    const { onClose } = renderDialog({
      exampleSelectionMode: "manual",
      examples: async () => candidates,
    });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    expect(
      await screen.findByText(/Choose your own examples for better control/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "A curious cat." }));
    await userEvent.click(screen.getByRole("button", { name: "A curious bird." }));
    await userEvent.click(screen.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const card = await database.cards.where("wordKey").equals("curious").first();
    const stored = await database.examples.where("cardId").equals(card!.id).toArray();
    expect(stored.map((example) => example.text).sort()).toEqual([
      "A curious bird.",
      "A curious cat.",
    ]);
  });

  it("allows manual selection to save without examples and caps at three", async () => {
    const candidates: ExampleDraft[] = [
      { text: "A curious cat.", source: "tatoeba" },
      { text: "A curious dog.", source: "tatoeba" },
      { text: "A curious bird.", source: "tatoeba" },
      { text: "A curious fish.", source: "tatoeba" },
    ];
    const { onClose } = renderDialog({
      exampleSelectionMode: "manual",
      examples: async () => candidates,
    });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    await screen.findByText(/Choose your own examples for better control/);

    for (const candidate of candidates) {
      await userEvent.click(screen.getByRole("button", { name: candidate.text }));
    }
    expect(screen.getByRole("alert")).toHaveTextContent("up to three");

    await userEvent.click(screen.getByRole("button", { name: "Save card" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const card = await database.cards.where("wordKey").equals("curious").first();
    expect(await database.examples.where("cardId").equals(card!.id).count()).toBe(3);
  });

  it("allows saving a manual card with no Tatoeba examples", async () => {
    const { onClose } = renderDialog({
      exampleSelectionMode: "manual",
      examples: async () => [],
    });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    await screen.findByText(/No Tatoeba candidates/);
    await userEvent.click(screen.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const card = await database.cards.where("wordKey").equals("curious").first();
    expect(await database.examples.where("cardId").equals(card!.id).count()).toBe(0);
  });

  it("adds a custom example during card creation", async () => {
    const { onClose } = renderDialog({ examples: async () => [] });
    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    await screen.findByLabelText("Russian translation");

    await userEvent.type(
      screen.getByLabelText("Add your own example"),
      "  My own sentence.  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add example" }));
    expect(await screen.findByText("My own sentence.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const card = await database.cards.where("wordKey").equals("curious").first();
    const stored = await database.examples.where("cardId").equals(card!.id).toArray();
    expect(stored).toEqual([
      expect.objectContaining({ text: "My own sentence.", source: "user" }),
    ]);
  });

  it("blocks a duplicate word", async () => {
    await createCard(database, {
      word: "curious",
      translation: "любопытный",
      examples: [],
    });
    renderDialog();

    await userEvent.type(screen.getByLabelText("English word or phrase"), "  CURIOUS ");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("you already knew that");
    expect(await database.cards.count()).toBe(1);
  });

  it("shows one shared status bar with the percentage above the bar", async () => {
    const controllable = makeControllableTranslation({ phase: "queued" });
    renderDialog({ translation: controllable.service });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    act(() => {
      controllable.setStatus({ phase: "downloading", progress: 42 });
    });

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Downloading the translation model");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const percent = screen.getByText("42%");
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(
      percent.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps one status bar while the WebGPU fallback initializes", async () => {
    const controllable = makeControllableTranslation({ phase: "queued" });
    renderDialog({ translation: controllable.service });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    act(() => {
      controllable.setStatus({ phase: "downloading", progress: 80 });
      controllable.setStatus({
        phase: "initializing",
        progress: 80,
        message: "WebGPU is unavailable. Falling back to WebAssembly.",
      });
    });

    expect(await screen.findByText("80%")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "WebGPU is unavailable. Falling back to WebAssembly.",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);

    act(() => {
      controllable.setStatus({ phase: "downloading", progress: 85 });
    });
    expect(await screen.findByText("85%")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("falls back to a manual translation when automatic translation fails", async () => {
    const status: TranslationStatus = { phase: "queued" };
    const translation: TranslationService = {
      translate: vi.fn(async () => {
        throw new Error("model missing");
      }),
      getStatus: () => status,
      subscribeStatus: () => () => {},
      dispose() {},
    };
    const { onClose } = renderDialog({ translation });

    await userEvent.type(screen.getByLabelText("English word or phrase"), "curious");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));

    expect(
      await screen.findByText(/Automatic translation failed/),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Russian translation");
    await userEvent.type(input, "любопытный");
    await userEvent.click(screen.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((await database.cards.where("wordKey").equals("curious").first())?.translation).toBe(
      "любопытный",
    );
  });

  it("requires a word", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter an English word or phrase.",
    );
  });

  it("closes on cancel", async () => {
    const { onClose } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
