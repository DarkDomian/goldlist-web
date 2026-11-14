import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CardDetailPage from "@/features/card-detail/CardDetailPage";
import { createCard } from "@/data/cardRepository";
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
    const card = await seed("learned");
    await renderDetail(card.id);

    expect(
      await screen.findByRole("heading", { level: 1, name: "curious" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("любопытный")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Re-learn this card" }),
    );

    expect(await screen.findByText("Today page")).toBeInTheDocument();
    const updated = await database.cards.get(card.id);
    expect(updated?.status).toBe("copper");
    expect(updated?.scheduledFor).toBeNull();
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
