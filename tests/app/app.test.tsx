import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { AppShell } from "@/app/AppShell";
import { createCard } from "@/data/cardRepository";
import type { GoldlistDatabase } from "@/data/db";
import { updateSettings } from "@/data/settingsRepository";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

function renderApp(initialEntries: string[]) {
  return render(
    renderProviders({
      services: makeServices({ database }),
      initialEntries,
      children: <App />,
    }),
  );
}

describe("App routing", () => {
  it("sends a new user to onboarding", async () => {
    renderApp(["/today"]);
    expect(
      await screen.findByText("A quieter way to grow your English."),
    ).toBeInTheDocument();
  });

  it("shows Current Day for a completed user", async () => {
    await updateSettings(database, { onboardingCompleted: true });
    renderApp(["/today"]);
    expect(await screen.findByText("Words from today")).toBeInTheDocument();
    expect(
      screen.queryByText("A quieter way to grow your English."),
    ).not.toBeInTheDocument();
  });

  it("redirects a completed user away from onboarding", async () => {
    await updateSettings(database, { onboardingCompleted: true });
    renderApp(["/onboarding"]);
    expect(await screen.findByText("Words from today")).toBeInTheDocument();
  });

  it("redirects unknown routes to Current Day", async () => {
    await updateSettings(database, { onboardingCompleted: true });
    renderApp(["/does-not-exist"]);
    expect(await screen.findByText("Words from today")).toBeInTheDocument();
  });

  it("renders the archive and settings routes", async () => {
    await updateSettings(database, { onboardingCompleted: true });
    const view = renderApp(["/archive"]);
    expect(await screen.findByText("Everything you have gathered")).toBeInTheDocument();
    view.unmount();

    renderApp(["/settings"]);
    expect(await screen.findByText("Make it comfortable")).toBeInTheDocument();
  });
});

describe("AppShell", () => {
  it("shows and clears the due badge", async () => {
    const card = await createCard(database, {
      word: "curious",
      translation: "любопытный",
      examples: [],
    });
    await database.cards.update(card.id, {
      status: "copper",
      scheduledFor: new Date(2020, 0, 1).toISOString(),
    });

    render(
      renderProviders({
        services: makeServices({ database }),
        initialEntries: ["/today"],
        children: (
          <AppShell>
            <div>Page content</div>
          </AppShell>
        ),
      }),
    );

    expect(await screen.findByTestId("due-badge")).toHaveTextContent("1");
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();

    await database.cards.update(card.id, { status: "learned" });
    await waitFor(() => expect(screen.queryByTestId("due-badge")).not.toBeInTheDocument());
  });
});
