// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LandingScreen } from "@/components/game/landing-screen";

describe("LandingScreen", () => {
  it("exposes stable, accessible create and join controls", () => {
    render(
      <LandingScreen
        isSubmitting={false}
        error={null}
        onClearError={vi.fn()}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Create a room" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("create-name-input")).toHaveAccessibleName(
      "What should we call you?",
    );
    expect(screen.getByTestId("create-adult-consent")).toHaveAccessibleName(
      /I'm 18 or older/i,
    );
    expect(screen.getByTestId("create-ai-consent")).toHaveAccessibleName(
      /I agree to private AI processing/i,
    );
    expect(screen.getByTestId("create-room-submit")).toBeDisabled();

    fireEvent.click(screen.getByTestId("landing-join-tab"));

    expect(screen.getByTestId("room-code-input")).toHaveAccessibleName(
      "Six-character room code",
    );
    expect(screen.getByTestId("join-room-submit")).toBeDisabled();
  });
});
