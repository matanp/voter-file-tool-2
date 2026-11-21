/**
 * ui-page-consistency 02: pages share one container, but the Reports dashboard's side-by-side
 * lists need a wider cap than the default. Wide is still bounded — unbounded width was the
 * original complaint.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PageContainer } from "~/components/layout/PageContainer";

function contentColumn() {
  return screen.getByText("content").parentElement!;
}

describe("PageContainer", () => {
  it("caps content at max-w-6xl by default", () => {
    render(
      <PageContainer>
        <span>content</span>
      </PageContainer>,
    );
    expect(contentColumn()).toHaveClass("max-w-6xl", "mx-auto");
  });

  it("uses a larger but still bounded cap for width='wide'", () => {
    render(
      <PageContainer width="wide">
        <span>content</span>
      </PageContainer>,
    );
    expect(contentColumn()).toHaveClass("max-w-screen-2xl", "mx-auto");
    expect(contentColumn()).not.toHaveClass("max-w-6xl");
  });
});
