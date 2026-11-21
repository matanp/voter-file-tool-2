/**
 * Home heading order (QA sweep 2026-11-18, A10): the feature cards sit directly under the page h1,
 * so their titles are h2s rather than CardTitle's default h3.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FeaturesGrid } from "~/components/home/FeaturesGrid";
import { CardTitle } from "~/components/ui/card";

describe("FeaturesGrid", () => {
  it("renders each feature title as an h2", () => {
    render(<FeaturesGrid />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Voter Search",
      "Committee Management",
      "Document Generation",
    ]);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("defaults to h3", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "Title" })).toBeInTheDocument();
  });
});
