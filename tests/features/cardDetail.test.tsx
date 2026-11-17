import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CardDetailPage from "@/features/card-detail/CardDetailPage";
import { createCard, submitDistillation } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import type { CardStatus } from "@/domain/types";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

async function seed(status: CardStatus) {
  const card = await createCard(database, {
    word: "curious",
    translation: "любопытный",
    examples: [{ text: "A curious cat.", source: "tatoeba" }],
  });
  await database.cards.update(card.id, { status });
  return card;
}

async function renderDetail(id: string) {
  return render(
    renderProviders({
      services: makeServices({ database }),
      initialEntries: [`/card/${id}`],
      children: (
        <Routes>
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/today" element={<div>Today page</div>} />
          <Route path="/archive" element={<div>Archive page</div>} />
        </Routes>
      ),
    }),
  );
}

describe("CardDetailPage", () => {
  it("hides the translation for learned cards and re-learns them", async () => {
    const card = await seed("copper");
    await submitDistillation(database, card.id, "wrong", new Date());
    await database.cards.update(card.id, {
      status: "learned",
      scheduledFor: null,
    });
    await renderDetail(card.id);

    expect(
      await screen.findByRole("heading", { level: 1, name: "curious" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "curious" }).closest("article"),
    ).not.toHaveClass("card--preview");
    expect(screen.queryByText("любопытный")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Re-learn this card" }),
    );

    expect(await screen.findByText("Today page")).toBeInTheDocument();
    const updated = await database.cards.get(card.id);
    expect(updated?.status).toBe("copper");
    expect(updated?.scheduledFor).toBeNull();
    expect(await database.examples.where("cardId").equals(card.id).count()).toBe(1);
    expect(await database.attempts.where("cardId").equals(card.id).count()).toBe(1);
  });

  it("shows the translation for unlearned cards", async () => {
    const card = await seed("unlearned");
    await renderDetail(card.id);
    expect(await screen.findByText("любопытный")).toBeInTheDocument();
  });

  it("re-learns an unlearned card", async () => {
    const card = await seed("unlearned");
    await renderDetail(card.id);
    await userEvent.click(
      await screen.findByRole("button", { name: "Re-learn this card" }),
    );
    expect(await screen.findByText("Today page")).toBeInTheDocument();
    expect((await database.cards.get(card.id))?.status).toBe("copper");
  });

  it("adds, edits, and deletes custom examples", async () => {
    const card = await seed("unlearned");
    await renderDetail(card.id);

    const input = await screen.findByLabelText("Add a custom example");
    await userEvent.type(input, "  My own curious sentence.  ");
    await userEvent.click(screen.getByRole("button", { name: "Add example" }));
    expect(await screen.findByText("My own curious sentence.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit example: A curious cat." }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Edit example: My own curious sentence." }),
    );
    const editInput = screen.getByLabelText("Example text");
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "An edited custom sentence.");
    await userEvent.click(screen.getByRole("button", { name: "Save example" }));
    expect(await screen.findByText("An edited custom sentence.")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete example: An edited custom sentence." }),
    );
    await waitFor(() =>
      expect(screen.queryByText("An edited custom sentence.")).not.toBeInTheDocument(),
    );
    expect(await database.examples.where("cardId").equals(card.id).count()).toBe(1);
  });

  it("rejects duplicate and empty custom examples", async () => {
    const card = await seed("unlearned");
    await renderDetail(card.id);

    const input = await screen.findByLabelText("Add a custom example");
    await userEvent.click(screen.getByRole("button", { name: "Add example" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An example cannot be empty.",
    );

    await userEvent.type(input, "A CURIOUS CAT.");
    await userEvent.click(screen.getByRole("button", { name: "Add example" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That example already exists.",
    );
    expect(await database.examples.where("cardId").equals(card.id).count()).toBe(1);
  });

  it("does not offer Re-learn for active cards", async () => {
    const card = await seed("copper");
    await renderDetail(card.id);
    await screen.findByRole("heading", { level: 1, name: "curious" });
    expect(
      screen.queryByRole("button", { name: "Re-learn this card" }),
    ).not.toBeInTheDocument();
  });

  it("cancels and confirms deletion with cascade", async () => {
    const card = await seed("unlearned");
    await renderDetail(card.id);
    await screen.findByRole("heading", { level: 1, name: "curious" });

    await userEvent.click(screen.getByRole("button", { name: "Delete card" }));
    expect(screen.getByRole("dialog", { name: "Delete this card?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await database.cards.get(card.id)).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Delete card" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Archive page")).toBeInTheDocument();
    await waitFor(async () => expect(await database.cards.get(card.id)).toBeUndefined());
    expect(await database.examples.where("cardId").equals(card.id).count()).toBe(0);
  });

  it("shows a not-found state", async () => {
    await renderDetail("missing");
    expect(await screen.findByText("Card not found")).toBeInTheDocument();
  });
});
