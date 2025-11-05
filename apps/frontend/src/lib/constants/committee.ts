export const COMMITTEE_CONSTANTS = {
  MAX_MEMBERS: 4,
  ROCHESTER_CITY: "ROCHESTER",
} as const;

export const COMMITTEE_MESSAGES = {
  ALREADY_MEMBER: "Already in this committee",
  DIFFERENT_COMMITTEE: "Already in a different committee",
  COMMITTEE_FULL: "Committee Full",
  ADD_TO_COMMITTEE: "Add to Committee",
  SELECT_COMMITTEE: "Select a committee to view members.",
  NO_PERMISSION:
    "You don't have permission to view committee member details. Contact an administrator for access.",
  NO_MEMBERS: "No committee members found.",
} as const;
