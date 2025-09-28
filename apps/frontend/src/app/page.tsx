import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import {
  Search,
  Users,
  FileText,
  BarChart3,
  Shield,
  CheckCircle,
  ArrowRight,
  Database,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" hoverable={false} className="mb-4">
            Political Campaign Tool
          </Badge>
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Open Source Politics
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            A comprehensive platform for political campaigns, committees, and
            activists to manage voter data, organize committee structures, and
            generate professional political documents.
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

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Voter Search</CardTitle>
              </div>
              <CardDescription>
                Search and filter voter records with advanced criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Search by name, address, or voter ID
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Filter by district and demographics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Export results to Excel
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Committee Management</CardTitle>
              </div>
              <CardDescription>
                Organize and manage political committee structures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Geographic committee organization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Add/remove committee members
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Approval workflow system
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Document Generation</CardTitle>
              </div>
              <CardDescription>
                Create professional political documents and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Designated petitions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Committee reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Voter list exports
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Key Capabilities */}
        <div className="bg-card rounded-2xl p-8 mb-16 shadow-sm border">
          <h2 className="text-3xl font-bold text-center mb-8 text-card-foreground">
            Key Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    Comprehensive Voter Data
                  </h3>
                  <p className="text-muted-foreground">
                    Access detailed voter records including demographics,
                    addresses, district information, and voting history.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    Role-Based Access
                  </h3>
                  <p className="text-muted-foreground">
                    Secure access controls with different permission levels for
                    admins, committee members, and read-only users.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    Export & Reporting
                  </h3>
                  <p className="text-muted-foreground">
                    Generate Excel reports, PDF petitions, and custom voter
                    lists with flexible field selection and formatting options.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                    Data Security
                  </h3>
                  <p className="text-muted-foreground">
                    Enterprise-grade security with Google OAuth authentication,
                    invite-only access, and role-based permissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8 text-foreground">
            Get Started
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Button
              asChild
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
            >
              <Link href="/recordsearch">
                <Search className="h-8 w-8" />
                <span className="font-semibold">Search Voters</span>
                <span className="text-sm text-gray-500">
                  Find voter records
                </span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
            >
              <Link href="/committees">
                <Users className="h-8 w-8" />
                <span className="font-semibold">Committees</span>
                <span className="text-sm text-gray-500">Manage committees</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
            >
              <Link href="/petitions">
                <FileText className="h-8 w-8" />
                <span className="font-semibold">Petitions</span>
                <span className="text-sm text-gray-500">
                  Generate petitions
                </span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
            >
              <Link href="/reports">
                <BarChart3 className="h-8 w-8" />
                <span className="font-semibold">Reports</span>
                <span className="text-sm text-gray-500">View all reports</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">
          <p className="mb-2">
            Built for political campaigns, committees, and activists
          </p>
          <p className="text-sm">Secure • Reliable • Professional</p>
        </div>
      </div>
    </div>
  );
}
