import prisma from "~/lib/prisma";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { pendingItemsWhere } from "~/app/api/lib/pendingExitReports";
import type { AdminNavCounts } from "~/config/adminNav";

/**
 * Live counts for the Admin sidebar, read with the viewer's actual privilege.
 * Non-Admins get no counts; a missing active term leaves the count off rather
 * than failing every Admin page.
 */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const access = await getAdminPageAccess();
  if (!access.ok) return {};

  let activeTermId: string;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    return {};
  }

  // Same count as the committees page banner: submissions plus Exit Reports.
  const pendingRequests = await prisma.committeeMembership.count({
    where: pendingItemsWhere(activeTermId),
  });
  return { "pending-requests": pendingRequests };
}
