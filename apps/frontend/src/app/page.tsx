import { HeroSection } from "~/components/home/HeroSection";
import { FeaturesGrid } from "~/components/home/FeaturesGrid";
import { QuickActions } from "~/components/home/QuickActions";
import { Footer } from "~/components/home/Footer";

/**
 * Main homepage component that composes all sections
 */
export default function HomePage() {
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
