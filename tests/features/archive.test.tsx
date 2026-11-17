import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ArchivePage from "@/features/archive/ArchivePage";
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

async function seed(word: string, status: CardStatus, day: number) {
  const card = await createCard(
    database,
    {
      word,
      translation: `${word} translation`,
      examples: [{ text: `An example with ${word}.`, source: "tatoeba" }],
    },
    new Date(2026, 2, day),
  );
  await database.cards.update(card.id, {
    status,
    scheduledFor: status === "learned" || status === "unlearned" ? null : new Date(2026, 2, day + 14).toISOString(),
    statusChangedAt: new Date(2026, 2, day).toISOString(),
  });
  return card;
}

function renderArchive() {
  return render(
    renderProviders({
      services: makeServices({ database }),
      initialEntries: ["/archive"],
      children: (
        <Routes>
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
        </Routes>
      ),
    }),
  );
}

describe("ArchivePage", () => {
  it("renders Learned, Unlearned, and Waiting in that order", async () => {
    await seed("learnedword", "learned", 1);
    await seed("unlearnedword", "unlearned", 2);
    await seed("waitingword", "gold", 3);
    renderArchive();

    expect(await screen.findByText("learnedword")).toBeInTheDocument();
    expect(screen.getByText("unlearnedword")).toBeInTheDocument();
    expect(screen.queryByText("waitingword")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Waiting gold card" })).toBeInTheDocument();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => text === "Learned" || text === "Unlearned" || text === "Waiting");
    expect(headings).toEqual(["Learned", "Unlearned", "Waiting"]);
  });

  it("renders word-only chips with wrapping markup", async () => {
    await seed("learnedword", "learned", 1);
    await seed("unlearnedword", "unlearned", 2);
    renderArchive();

    expect(await screen.findByRole("link", { name: "Open card learnedword" })).toHaveClass(
      "archive-chip",
    );
    expect(screen.getByRole("link", { name: "Open card unlearnedword" })).toHaveClass(
      "archive-chip",
    );
    expect(screen.queryByText("learnedword translation")).not.toBeInTheDocument();
    expect(screen.queryByText("unlearnedword translation")).not.toBeInTheDocument();
    expect(screen.queryByText("An example with learnedword.")).not.toBeInTheDocument();
    expect(document.querySelector(".archive-chip-list")).toBeInTheDocument();
  });

  it("keeps translation and examples available in card detail", async () => {
    await seed("unlearnedword", "unlearned", 2);
    renderArchive();

    await userEvent.click(
      await screen.findByRole("link", { name: "Open card unlearnedword" }),
    );
    expect(await screen.findByText("unlearnedword translation")).toBeInTheDocument();
    expect(screen.getByText("An example with unlearnedword.")).toBeInTheDocument();
  });

  it("keeps learned translations hidden in detail", async () => {
    await seed("learnedword", "learned", 1);
    renderArchive();
    await userEvent.click(
      await screen.findByRole("link", { name: "Open card learnedword" }),
    );
    expect(await screen.findByRole("heading", { level: 1, name: "learnedword" })).toBeInTheDocument();
    expect(screen.queryByText("learnedword translation")).not.toBeInTheDocument();
  });

  it("hides empty blocks", async () => {
    await seed("learnedword", "learned", 1);
    renderArchive();

    expect(await screen.findByRole("heading", { name: "Learned" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Unlearned" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Waiting" })).not.toBeInTheDocument();
  });

  it("shows an empty archive message", async () => {
    renderArchive();
    expect(await screen.findByText("The archive is empty")).toBeInTheDocument();
  });
});
