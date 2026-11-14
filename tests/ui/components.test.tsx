import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddCardButton } from "@/ui/AddCardButton";
import { CardView, WaitingCard } from "@/ui/CardView";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { EmptyState } from "@/ui/EmptyState";
import { StatusIndicator } from "@/ui/StatusIndicator";
import type { Card } from "@/domain/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    word: "curious",
    wordKey: "curious",
    translation: "любопытный",
    status: "copper",
    createdAt: new Date().toISOString(),
    statusChangedAt: new Date().toISOString(),
    scheduledFor: null,
    ...overrides,
  };
}

describe("UI primitives", () => {
  it("labels status with an accessible name", () => {
    render(<StatusIndicator status="gold" showLabel />);
    expect(screen.getByRole("img", { name: "Status: Gold" })).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("renders a waiting card without content", () => {
    render(<WaitingCard status="silver" />);
    expect(screen.getByRole("img", { name: "Waiting silver card" })).toBeInTheDocument();
    expect(screen.queryByText("curious")).not.toBeInTheDocument();
  });

  it("renders full card content", () => {
    render(
      <CardView
        card={makeCard()}
        examples={[
          {
            id: "example-1",
            cardId: "card-1",
            text: "A curious cat.",
            source: "tatoeba",
          },
        ]}
      />,
    );
    expect(screen.getByText("curious")).toBeInTheDocument();
    expect(screen.getByText("любопытный")).toBeInTheDocument();
    expect(screen.getByText("A curious cat.")).toBeInTheDocument();
  });

  it("exposes the add card action", async () => {
    const onClick = vi.fn();
    render(<AddCardButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Add a word" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    render(<EmptyState title="All quiet" description="Nothing to do." />);
    expect(screen.getByRole("heading", { name: "All quiet" })).toBeInTheDocument();
    expect(screen.getByText("Nothing to do.")).toBeInTheDocument();
  });

  it("confirms and cancels a dialog", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete this card?"
        description="Permanent."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Delete this card?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
