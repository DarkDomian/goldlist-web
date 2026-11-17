import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { makeServices, renderProviders } from "../helpers";

function TodayActions() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/next")}>
        Next
      </button>
      <button type="button" onClick={() => navigate("/next", { replace: true })}>
        Replace next
      </button>
    </>
  );
}

function NextActions() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Back
    </button>
  );
}

function renderNavigation(initialEntries = ["/today"]) {
  return render(
    renderProviders({
      services: makeServices(),
      initialEntries,
      children: (
        <Routes>
          <Route element={<AppShell><Outlet /></AppShell>}>
            <Route
              path="/today"
              element={
                <>
                  <TodayActions />
                  <p>Today page</p>
                </>
              }
            />
            <Route
              path="/next"
              element={
                <>
                  <NextActions />
                  <p>Next page</p>
                </>
              }
            />
          </Route>
        </Routes>
      ),
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route effects", () => {
  it("scrolls and focuses the main region on push navigation", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNavigation();
    const main = await screen.findByRole("main");
    expect(document.activeElement).not.toBe(main);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Next page")).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(main));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("scrolls and focuses the main region on replace navigation", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNavigation();
    const main = await screen.findByRole("main");

    await userEvent.click(screen.getByRole("button", { name: "Replace next" }));

    expect(await screen.findByText("Next page")).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(main));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("leaves POP scrolling to the browser while focusing main", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderNavigation();
    const main = await screen.findByRole("main");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Next page");
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByText("Today page")).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(main));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
