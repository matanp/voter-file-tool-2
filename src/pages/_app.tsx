import { type AppType } from "next/app";
import { Inter } from "next/font/google";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { ThemeToggle } from "~/components/ui/themeToggle";

import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <nav>
          <ThemeToggle />
        </nav>
        <main
          className={`bg-background min-h-screen font-sans antialiased ${inter.variable}`}
        >
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </>
  );
};

export default MyApp;
