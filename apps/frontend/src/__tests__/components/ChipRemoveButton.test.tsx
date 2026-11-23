import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { MultiStringInput } from "~/components/ui/MultiStringInput";
import { MultiSelectCombobox } from "~/components/ui/MultiSelectCombobox";

describe("chip remove buttons", () => {
  it("names the value and removes it in MultiValueInputBase", async () => {
    const onChange = jest.fn();
    render(
      <MultiStringInput
        value={["MAIN ST", "ELM ST"]}
        onChange={onChange}
        placeholder="Street"
      />,
    );

    const remove = screen.getByRole("button", { name: "Remove MAIN ST" });
    // 24×24px target (WCAG 2.2 SC 2.5.8).
    expect(remove).toHaveClass("h-6", "w-6");

    await userEvent.click(remove);
    expect(onChange).toHaveBeenCalledWith(["ELM ST"]);
  });

  it("names the item's label, not its value, in MultiSelectCombobox", () => {
    render(
      <MultiSelectCombobox
        items={[{ value: "14607", label: "Rochester 14607" }]}
        initialValues={["14607"]}
        displayLabel="Zip"
        onSelect={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove Rochester 14607" }),
    ).toHaveClass("h-6", "w-6");
  });
});
