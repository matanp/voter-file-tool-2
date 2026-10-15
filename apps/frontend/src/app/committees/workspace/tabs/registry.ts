import type { ComponentType } from "react";

import type { WorkspaceTab } from "../workspaceUrlState";
import { HistoryTab } from "./HistoryTab";
import { PendingTab } from "./PendingTab";
import { RosterTab } from "./RosterTab";
import { SeatsWeightTab } from "./SeatsWeightTab";
import type { CommitteeTabProps } from "./types";

export type CommitteeTabDefinition = {
  label: string;
  Component: ComponentType<CommitteeTabProps>;
};

/**
 * One entry per `WORKSPACE_TABS` value, in display order. Tickets 09–12 replace
 * the component files, never this registry.
 */
export const COMMITTEE_TABS: Record<WorkspaceTab, CommitteeTabDefinition> = {
  roster: { label: "Roster", Component: RosterTab },
  pending: { label: "Pending", Component: PendingTab },
  seats: { label: "Seats & Weight", Component: SeatsWeightTab },
  history: { label: "History", Component: HistoryTab },
};
