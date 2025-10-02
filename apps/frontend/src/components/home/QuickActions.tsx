import { Button } from "~/components/ui/button";
import Link from "next/link";
import { Search, Users, FileText, BarChart3 } from "lucide-react";

/**
 * Quick action buttons data structure
 */
const quickActions = [
  {
    icon: Search,
    title: "Search Voters",
    description: "Find voter records",
    href: "/recordsearch",
  },
  {
    icon: Users,
    title: "Committees",
    description: "Manage committees",
    href: "/committees",
  },
  {
    icon: FileText,
    title: "Petitions",
    description: "Generate petitions",
    href: "/petitions",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description: "View all reports",
    href: "/reports",
  },
];

/**
 * Quick actions section component
 */
export function QuickActions() {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-8 text-foreground">Get Started</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.title}
              asChild
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
            >
              <Link href={action.href}>
                <IconComponent className="h-8 w-8" />
                <span className="font-semibold">{action.title}</span>
                <span className="text-sm text-gray-500">
                  {action.description}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
