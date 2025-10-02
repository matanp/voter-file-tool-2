import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import { Search, Users } from "lucide-react";

/**
 * Hero section component displaying the main title, description, and primary action buttons
 */
export function HeroSection() {
  return (
    <div className="text-center mb-16">
      <div className="flex justify-center gap-2 mb-4">
        <Badge variant="secondary" hoverable={false}>
          Political Campaign Tool
        </Badge>
        <Badge
          variant="secondary"
          hoverable={false}
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          title="Thank you for trying out our early access version! Your feedback helps us improve the platform."
        >
          BETA
        </Badge>
      </div>
      <h1 className="text-5xl font-bold text-foreground mb-6">
        Open Source Politics
      </h1>
      <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
        A comprehensive platform for political campaigns, committees, and
        activists to manage voter data, organize committee structures, and
        generate professional political documents. Currently in beta - your
        feedback helps us improve!
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg" className="text-lg px-8 py-3">
          <Link href="/recordsearch">
            <Search className="mr-2 h-5 w-5" />
            Start Searching Voters
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="text-lg px-8 py-3"
        >
          <Link href="/committees">
            <Users className="mr-2 h-5 w-5" />
            Manage Committees
          </Link>
        </Button>
      </div>
    </div>
  );
}
