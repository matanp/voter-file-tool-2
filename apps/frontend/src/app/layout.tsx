import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import Header from "./components/header";
import { GlobalContextProvider } from "~/components/providers/GlobalContext";
import { Toaster } from "~/components/ui/toaster";
import { CSPostHogProvider } from "~/components/providers/PostHog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Voter File Tool",
  description: "A tool for managing voter files",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} flex flex-col gap-4`}>
        <SessionProvider>
          <CSPostHogProvider>
            <GlobalContextProvider>
              {/* <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          > */}
              <nav>
                <Header />
              </nav>
              <main
                className={`min-h-screen bg-background font-sans antialiased ${inter.variable}`}
              >
                {children}
                <SpeedInsights />
              </main>
              <Toaster />
            </GlobalContextProvider>
          </CSPostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
