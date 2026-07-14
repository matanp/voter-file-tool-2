import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-hosted Inter (offline-friendly; replaces next/font/google network fetch).
// Weights match the Tailwind utilities used across the app (normal/medium/semibold/bold).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import Header from "./components/header";
import { GlobalContextProvider } from "~/components/providers/GlobalContext";
import { VoterSearchProvider } from "~/contexts/VoterSearchContext";
import { Toaster } from "~/components/ui/toaster";
import { CSPostHogProvider } from "~/components/providers/PostHog";

export const metadata = {
  title: "Open Source Politics",
  description:
    "A comprehensive platform for political campaigns, committees, and activists to manage voter data, organize committee structures, and generate professional political documents.",
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body className="font-sans">
        <SessionProvider>
          <CSPostHogProvider>
            <GlobalContextProvider>
              <VoterSearchProvider>
                {/* <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            > */}
                <nav>
                  <Header />
                </nav>
                <main className="min-h-screen bg-background font-sans antialiased">
                  {children}
                  <SpeedInsights />
                </main>
                <Toaster />
              </VoterSearchProvider>
            </GlobalContextProvider>
          </CSPostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
