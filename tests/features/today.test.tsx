import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import TodayPage from "@/features/today/TodayPage";
import type { GoldlistDatabase } from "@/data/db";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

function renderToday() {
  const services = makeServices({ database });
  return render(
    renderProviders({
      services,
      initialEntries: ["/today"],
      children: (
        <Routes>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/card/:id" element={<div>Card detail</div>} />
        </Routes>
      ),
    }),
  );
}

async function addWord(word: string) {
  await userEvent.click(screen.getByRole("button", { name: "Add a word" }));
  await userEvent.type(screen.getByLabelText("English word or phrase"), word);
  await userEvent.click(screen.getByRole("button", { name: "Translate" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Russian translation")).toHaveValue(
      `${word} (перевод)`,
    ),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
}

describe("TodayPage", () => {
  it("shows the empty state before any cards exist", async () => {
    renderToday();
    expect(await screen.findByText("A blank page")).toBeInTheDocument();
  });

  it("adds a card and shows it immediately", async () => {
    renderToday();
    await screen.findByText("Words from today");
    await addWord("curious");

    expect(await screen.findByText("curious")).toBeInTheDocument();
    expect(screen.getByText("curious (перевод)")).toBeInTheDocument();
    expect(
      screen.getByText("An example sentence with curious."),
    ).toBeInTheDocument();
    expect(await database.cards.count()).toBe(1);
  });

  it("blocks duplicate words from the Current Day", async () => {
    renderToday();
    await screen.findByText("Words from today");
    await addWord("curious");

    await userEvent.click(screen.getByRole("button", { name: "Add a word" }));
    await userEvent.type(screen.getByLabelText("English word or phrase"), "CURIOUS");
    await userEvent.click(screen.getByRole("button", { name: "Translate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("you already knew that");
    expect(await database.cards.count()).toBe(1);
  });
});
