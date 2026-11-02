import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Pick an option in a Radix `Select` (`~/components/ui/select`): open the
 * trigger, then click the option by its visible label. Radix renders the
 * options in a portal, so they are looked up on the whole screen.
 */
export async function chooseSelectOption(
  trigger: HTMLElement,
  optionName: string,
): Promise<void> {
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole("option", { name: optionName }));
}
