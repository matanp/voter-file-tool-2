import { HeroSection } from "~/components/home/HeroSection";
import { FeaturesGrid } from "~/components/home/FeaturesGrid";
import { QuickActions } from "~/components/home/QuickActions";
import { Footer } from "~/components/home/Footer";
import { auth } from "~/auth";
import { findValidUnusedInvite } from "~/lib/applyPendingInvite";
import { PrivilegeLevel } from "@prisma/client";
import { redirect } from "next/navigation";

/**
 * Main homepage component that composes all sections
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const skipInviteClaim = params.skipInviteClaim != null;
  const session = await auth();
  const email = session?.user?.email;
  const privilegeLevel = session?.user?.privilegeLevel;

  if (
    !skipInviteClaim &&
    email &&
    privilegeLevel === PrivilegeLevel.ReadAccess
  ) {
    const invite = await findValidUnusedInvite(email);
    if (invite) {
      redirect(`/auth/invite/${encodeURIComponent(invite.token)}`);
    }
  }

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <HeroSection />
        <FeaturesGrid />
        {/* <KeyCapabilities /> */}
        <QuickActions />
        <Footer />
      </div>
    </div>
  );
}
