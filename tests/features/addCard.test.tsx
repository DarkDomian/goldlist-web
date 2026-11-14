import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddCardDialog } from "@/features/add-card/AddCardDialog";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import { ServicesProvider } from "@/services/ServicesContext";
import type { TranslationService } from "@/services/translation/types";
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
}: {
  onClose?: () => void;
  translation?: TranslationService;
} = {}) {
  const services = makeServices({ database, translation });
  render(
    <ServicesProvider services={services}>
      <AddCardDialog open onClose={onClose} />
    </ServicesProvider>,
  );
  return { onClose };
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

  it("falls back to a manual translation when automatic translation fails", async () => {
    const translation: TranslationService = {
      translate: vi.fn(async () => {
        throw new Error("model missing");
      }),
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
