/**
 * Density sizes come from CSS variables (globals.css), so a caller's ordinary sizing class
 * replaces the primitive's variable class through tailwind-merge, in any density.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

function classesOf(el: HTMLElement): string[] {
  return el.className.split(/\s+/);
}

describe("density primitives", () => {
  it("default and icon Buttons read --control-h and yield to a caller height", () => {
    render(
      <div data-density="comfortable">
        <Button>Plain</Button>
        <Button className="h-12">Tall</Button>
        <Button size="icon" aria-label="Icon" className="h-8 w-8" />
      </div>,
    );
    expect(classesOf(screen.getByRole("button", { name: "Plain" }))).toContain(
      "h-[var(--control-h)]",
    );
    const tall = classesOf(screen.getByRole("button", { name: "Tall" }));
    expect(tall).toContain("h-12");
    expect(tall).not.toContain("h-[var(--control-h)]");
    const icon = classesOf(screen.getByRole("button", { name: "Icon" }));
    expect(icon).toEqual(expect.arrayContaining(["h-8", "w-8"]));
    expect(icon).not.toContain("h-[var(--control-h)]");
    expect(icon).not.toContain("w-[var(--control-h)]");
  });

  it("Input and SelectTrigger yield to a caller height", () => {
    render(
      <>
        <Input aria-label="Field" className="h-12" />
        <Select>
          <SelectTrigger aria-label="Pick" className="h-8">
            <SelectValue />
          </SelectTrigger>
        </Select>
      </>,
    );
    const input = classesOf(screen.getByRole("textbox", { name: "Field" }));
    expect(input).toContain("h-12");
    expect(input).not.toContain("h-[var(--control-h)]");
    const trigger = classesOf(screen.getByRole("combobox", { name: "Pick" }));
    expect(trigger).toContain("h-8");
    expect(trigger).not.toContain("h-[var(--control-h)]");
  });

  it("TableHead and TableCell padding yields to caller padding", () => {
    render(
      <Table density="comfortable">
        <TableHeader>
          <TableRow>
            <TableHead className="h-12 px-2">Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="p-0">All</TableCell>
            <TableCell className="py-0">Vertical</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const head = classesOf(screen.getByRole("columnheader", { name: "Head" }));
    expect(head).toEqual(expect.arrayContaining(["h-12", "px-2"]));
    expect(head).not.toContain("h-[var(--table-head-h)]");
    expect(head).not.toContain("px-[var(--table-head-px)]");

    const all = classesOf(screen.getByRole("cell", { name: "All" }));
    expect(all).toContain("p-0");
    expect(all).not.toContain("px-[var(--table-cell-px)]");
    expect(all).not.toContain("py-[var(--table-cell-py)]");

    const vertical = classesOf(screen.getByRole("cell", { name: "Vertical" }));
    expect(vertical).toEqual(
      expect.arrayContaining(["py-0", "px-[var(--table-cell-px)]"]),
    );
    expect(vertical).not.toContain("py-[var(--table-cell-py)]");
  });

  it("Table sets data-density only when the prop is given", () => {
    const { container } = render(
      <>
        <Table data-testid="none" />
        <Table data-testid="compact" density="compact" />
        <Table data-testid="comfortable" density="comfortable" />
      </>,
    );
    const wrapperOf = (id: string) =>
      container.querySelector(`[data-testid="${id}"]`)!.parentElement!;
    expect(wrapperOf("none")).not.toHaveAttribute("data-density");
    expect(wrapperOf("compact")).toHaveAttribute("data-density", "compact");
    expect(wrapperOf("comfortable")).toHaveAttribute(
      "data-density",
      "comfortable",
    );
  });
});
