import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import OnboardingPage from "@/features/onboarding/OnboardingPage";
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

function renderOnboarding() {
  const services = makeServices({ database });
  return render(
    renderProviders({
      services,
      initialEntries: ["/onboarding"],
      children: (
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/today" element={<div>Today page</div>} />
        </Routes>
      ),
    }),
  );
}

describe("OnboardingPage", () => {
  it("explains the method and shows the fixed setup", async () => {
    renderOnboarding();

    expect(await screen.findByText("A quieter way to grow your English.")).toBeInTheDocument();
    expect(screen.getByText("Add", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Russian")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("14 calendar days")).toBeInTheDocument();
    expect(screen.getByText("00:00 local time")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("persists completion and navigates to Current Day", async () => {
    renderOnboarding();
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Start learning" }));

    expect(await screen.findByText("Today page")).toBeInTheDocument();
    expect((await getSettings(database)).onboardingCompleted).toBe(true);
  });

  it("can go back to the method explanation", async () => {
    renderOnboarding();
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("A quieter way to grow your English.")).toBeInTheDocument();
  });
});
