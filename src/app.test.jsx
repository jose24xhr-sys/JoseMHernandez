import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./app.jsx";

describe("application routes", () => {
  it("renders the portfolio home page", () => {
    render(<App />);

    expect(
      screen.getAllByText("Customer Success & Automation Specialist"),
    ).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Experience" })).toBeInTheDocument();
  });

  it("renders the operations tracker route", () => {
    window.history.pushState({}, "", "/ops-tracker");
    render(<App />);

    expect(screen.getByTitle("Ops Tracker")).toHaveAttribute(
      "src",
      "/ops-tracker.html",
    );
  });

  it("renders the weekly report route", () => {
    window.history.pushState({}, "", "/weekly-report");
    render(<App />);

    expect(screen.getByTitle("Weekly Report Routemize")).toHaveAttribute(
      "src",
      "/Weekly-Report.html",
    );
  });
});

describe("portfolio interactions", () => {
  it("persists the selected dark theme", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Toggle theme" })[0]);

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("does not render Routemize booking embeds", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: "Book Now" })).not.toBeInTheDocument();
    expect(document.querySelector('iframe[src*="maximumtest.routemize.com"]')).toBeNull();
    expect(document.querySelector('iframe[src*="gopremium.routemize.com"]')).toBeNull();
  });

  it("shows the expanded Routemize responsibilities", () => {
    render(<App />);

    expect(
      screen.getByText(/Automation & Zapier Workflows:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Product Quality & Feedback:/),
    ).toBeInTheDocument();
  });
});
