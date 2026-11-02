/**
 * The requests page's heading id. The heading renders in the same place
 * whether or not anything is still pending, so it survives the refresh that
 * removes a decided Exit Report (and possibly its committee); decisions land
 * focus on it. Kept out of the client module so the server page can read it.
 */
export const REQUESTS_HEADING_ID = "pending-requests-heading";
