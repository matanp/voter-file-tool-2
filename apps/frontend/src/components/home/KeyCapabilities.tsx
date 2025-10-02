import { Database, UserCheck, FileSpreadsheet, Shield } from "lucide-react";

/**
 * Key capabilities data structure
 */
const capabilities = [
  {
    icon: Database,
    title: "Comprehensive Voter Data",
    description:
      "Access detailed voter records including demographics, addresses, district information, and voting history.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access",
    description:
      "Secure access controls with different permission levels for admins, committee members, and read-only users.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export & Reporting",
    description:
      "Generate Excel reports, PDF petitions, and custom voter lists with flexible field selection and formatting options.",
  },
  {
    icon: Shield,
    title: "Data Security",
    description:
      "Enterprise-grade security with Google OAuth authentication, invite-only access, and role-based permissions.",
  },
];

/**
 * Key capabilities section component
 */
export function KeyCapabilities() {
  return (
    <div className="bg-card rounded-2xl p-8 mb-16 shadow-sm border">
      <h2 className="text-3xl font-bold text-center mb-8 text-card-foreground">
        Key Capabilities
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {capabilities.slice(0, 2).map((capability) => {
            const IconComponent = capability.icon;
            return (
              <div key={capability.title} className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    {capability.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {capability.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          {capabilities.slice(2, 4).map((capability) => {
            const IconComponent = capability.icon;
            return (
              <div key={capability.title} className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    {capability.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {capability.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
