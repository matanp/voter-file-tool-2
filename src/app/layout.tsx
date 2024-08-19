import { Inter } from "next/font/google";

import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import Header from "./components/header";
import { GlobalContextProvider } from "~/components/providers/GlobalContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} flex flex-col gap-4`}>
        <SessionProvider>
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
              className={`min-h-screen bg-background font-sans antialiased ${inter.variable} m-10`}
            >
              {children}
            </main>
            {/* </ThemeProvider> */}
          </GlobalContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
