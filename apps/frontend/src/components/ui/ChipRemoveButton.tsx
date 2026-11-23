import * as React from "react";
import { Cross2Icon } from "@radix-ui/react-icons";

interface ChipRemoveButtonProps {
  /** The chip's visible text, used for the button's accessible name. */
  label: string;
  onRemove: () => void;
}

/**
 * The "×" at the end of a value chip.
 *
 * The button is a 24×24px target (WCAG 2.2 SC 2.5.8) but the negative margins
 * cancel the extra size in layout, so the chip stays the same height and the
 * visible circle stays the size of the icon.
 */
export function ChipRemoveButton({ label, onRemove }: ChipRemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
      className="group -my-1 -mr-1.5 ml-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="rounded-full p-0.5 group-hover:bg-destructive group-hover:text-destructive-foreground">
        <Cross2Icon className="h-3 w-3" aria-hidden="true" />
      </span>
    </button>
  );
}
