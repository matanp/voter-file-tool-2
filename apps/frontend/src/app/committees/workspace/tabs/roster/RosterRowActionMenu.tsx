"use client";
import React, { useRef } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { CommitteeActionHandler } from "../../committeeAction";
import type { RosterRowActionItem } from "./rowActions";

export type RosterRowActionMenuProps = {
  /**
   * Accessible name for the trigger, e.g. "Actions for seat 2", or for a
   * single action's button, e.g. "Add member for seat 2".
   */
  label: string;
  /**
   * Identifies the row (e.g. "seat-2"), so focus can find the row's control
   * again when a refresh swaps the button for a menu or back.
   */
  rowKey: string;
  items: RosterRowActionItem[];
  onAction: CommitteeActionHandler;
};

/**
 * A row's action menu. Choosing an item only dispatches its action, with the
 * trigger as the place to return focus to (the menu item is gone by the time
 * the drawer closes). The menu never opens a dialog or drawer itself; the
 * workspace does.
 *
 * A row with a single action (a vacant seat's add) shows it as a labelled
 * button instead, so it is visible without opening a menu.
 */
export function RosterRowActionMenu({
  label,
  rowKey,
  items,
  onAction,
}: RosterRowActionMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [only] = items;
  if (items.length === 1 && only) {
    return (
      <Button
        ref={trigger}
        variant="outline"
        size="sm"
        aria-label={label}
        data-row-action={rowKey}
        className="whitespace-nowrap"
        onClick={() => onAction(only.action, trigger.current)}
      >
        {only.label}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          variant="ghost"
          size="icon"
          aria-label={label}
          data-row-action={rowKey}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.action.kind}
            onSelect={() => onAction(item.action, trigger.current)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
