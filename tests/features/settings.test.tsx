import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SettingsPage from "@/features/settings/SettingsPage";
import type { GoldlistDatabase } from "@/data/db";
import { getSettings } from "@/data/settingsRepository";
import { makeServices, renderProviders } from "../helpers";

let database: GoldlistDatabase;

beforeEach(() => {
  database = makeServices().database;
});

afterEach(async () => {
  await database.delete();
});

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

  it("does not expose forbidden settings", async () => {
    renderSettings();
    await screen.findByText("Make it comfortable");
    expect(screen.queryByText(/cutoff/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/freeze/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /language/i })).not.toBeInTheDocument();
  });
});
