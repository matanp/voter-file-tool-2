"use client";
import React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { RosterRowAction, RosterRowActionItem } from "./rowActions";

export type RosterRowActionMenuProps = {
  /** Accessible name for the trigger, e.g. "Actions for seat 2". */
  label: string;
  items: RosterRowActionItem[];
  onAction: (action: RosterRowAction) => void;
};

/**
 * A row's action menu. Choosing an item only dispatches its action; the menu
 * never opens a dialog or drawer itself (that is the workspace's job, ticket
 * 13).
 */
export function RosterRowActionMenu({
  label,
  items,
  onAction,
}: RosterRowActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.action.kind}
            onSelect={() => onAction(item.action)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
