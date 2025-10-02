import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckCircle, Search, Users, FileText } from "lucide-react";

/**
 * Feature card data structure
 */
const features = [
  {
    icon: Search,
    title: "Voter Search",
    description: "Search and filter voter records with advanced criteria",
    items: [
      "Search by name, address, or voter ID",
      "Filter by district and demographics",
      "Export results to Excel",
    ],
  },
  {
    icon: Users,
    title: "Committee Management",
    description: "Organize and manage political committee structures",
    items: [
      "Geographic committee organization",
      "Add/remove committee members",
      "Approval workflow system",
    ],
  },
  {
    icon: FileText,
    title: "Document Generation",
    description: "Create professional political documents and reports",
    items: ["Designated petitions", "Committee reports", "Voter list exports"],
  },
];

/**
 * Features grid component displaying the main platform features
 */
export function FeaturesGrid() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
      {features.map((feature) => {
        const IconComponent = feature.icon;
        return (
          <Card
            key={feature.title}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </div>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {feature.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
