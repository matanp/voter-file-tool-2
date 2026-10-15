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
  /** Accessible name for the trigger, e.g. "Actions for seat 2". */
  label: string;
  items: RosterRowActionItem[];
  onAction: CommitteeActionHandler;
};

/**
 * A row's action menu. Choosing an item only dispatches its action, with the
 * trigger as the place to return focus to (the menu item is gone by the time
 * the drawer closes). The menu never opens a dialog or drawer itself; the
 * workspace does.
 */
export function RosterRowActionMenu({
  label,
  items,
  onAction,
}: RosterRowActionMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="ghost" size="icon" aria-label={label}>
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
