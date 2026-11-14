import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DistillationPage from "@/features/distillation/DistillationPage";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import type { DistillableStatus } from "@/domain/types";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

async function seedDue(status: DistillableStatus) {
  const card = await createCard(
    database,
    {
      word: "curious",
      translation: "любопытный, интересующийся",
      examples: [{ text: "A curious cat watched us.", source: "tatoeba" }],
    },
    new Date(2026, 2, 1),
  );
  await database.cards.update(card.id, {
    status,
    scheduledFor: new Date(2026, 2, 1).toISOString(),
    statusChangedAt: new Date(2026, 2, 1).toISOString(),
  });
  return card;
}

function renderDistillation() {
  const services = makeServices({ database });
  return render(
    renderProviders({
      services,
      initialEntries: ["/distillation"],
      children: <DistillationPage />,
    }),
  );
}

describe("DistillationPage", () => {
  it("hides the translation until the answer is submitted", async () => {
    await seedDue("copper");
    renderDistillation();

    expect(await screen.findByText("Recall the Russian")).toBeInTheDocument();
    expect(screen.getByText("curious")).toBeInTheDocument();
    expect(screen.queryByText("любопытный, интересующийся")).not.toBeInTheDocument();
  });

  it("marks a recalled card as learned", async () => {
    const card = await seedDue("copper");
    renderDistillation();
    await screen.findByText("Recall the Russian");

    await userEvent.type(
      screen.getByLabelText("Your Russian translation"),
      "ЛЮБОПЫТНЫЙ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByText("Learned.")).toBeInTheDocument();
    expect((await database.cards.get(card.id))?.status).toBe("learned");
  });

  it.each([
    ["copper", "silver"],
    ["silver", "gold"],
  ] as const)("advances a missed %s card to %s", async (status, next) => {
    const card = await seedDue(status);
    renderDistillation();
    await screen.findByText("Recall the Russian");

    await userEvent.type(
      screen.getByLabelText("Your Russian translation"),
      "совсем неверно",
    );
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByText("Not yet.")).toBeInTheDocument();
    const updated = await database.cards.get(card.id);
    expect(updated?.status).toBe(next);
    expect(updated?.scheduledFor).not.toBeNull();
  });

  it("lets a missed gold card go unlearned and out of rotation", async () => {
    const card = await seedDue("gold");
    renderDistillation();
    await screen.findByText("Recall the Russian");

    await userEvent.type(
      screen.getByLabelText("Your Russian translation"),
      "совсем неверно",
    );
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByText("Not yet.")).toBeInTheDocument();
    const updated = await database.cards.get(card.id);
    expect(updated?.status).toBe("unlearned");
    expect(updated?.scheduledFor).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Nothing due right now")).toBeInTheDocument();
  });

  it("shows the empty state when nothing is due", async () => {
    renderDistillation();
    expect(await screen.findByText("Nothing due right now")).toBeInTheDocument();
  });

  it("keeps a card visible while an answer is empty", async () => {
    await seedDue("copper");
    renderDistillation();
    await screen.findByText("Recall the Russian");
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });
});
