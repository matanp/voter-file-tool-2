"use client";
import React, { useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { CommitteeActionHandler } from "../../committeeAction";
import type { RosterRowActionItem } from "./rowActions";

export type VacantSeatButtonProps = {
  /** Accessible name, e.g. "Add member for seat 2". */
  label: string;
  /**
   * Identifies the row (e.g. "seat-2"), so focus can find the row's control
   * again when a refresh swaps this button for the row's menu or back.
   */
  rowKey: string;
  item: RosterRowActionItem;
  onAction: CommitteeActionHandler;
};

/**
 * A vacant seat's action (Add member, or Submit candidate below Admin), shown
 * in the row's empty Contact cell (or beside the vacancy text without one) so
 * it is visible without a menu and leaves the pinned Actions column icon-wide.
 * Like the row menu, it only dispatches its action with itself as the place to
 * return focus to.
 */
export function VacantSeatButton({
  label,
  rowKey,
  item,
  onAction,
}: VacantSeatButtonProps) {
  const button = useRef<HTMLButtonElement>(null);
  return (
    <Button
      ref={button}
      variant="ghost"
      size="sm"
      aria-label={label}
      data-row-action={rowKey}
      className="h-8 gap-1 px-2 text-foreground"
      onClick={() => onAction(item.action, button.current)}
    >
      <Plus className="h-4 w-4" aria-hidden />
      {item.label}
    </Button>
  );
}
