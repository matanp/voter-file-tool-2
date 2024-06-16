import { type AppType } from "next/app";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/ui/themeToggle";
import Link from "next/link";

import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  const router = useRouter();
  const sharedTabStyle =
    "h-16 text-xl font-semibold w-42 flex items-center justify-center";
  const tabStyleActive = "bg-primary";
  const tabStyleInactive = "bg-muted-foreground";
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <nav>
          <div className="flex-gap border-bottom m-1 flex items-center justify-center gap-2 border-2 border-solid bg-accent py-2">
            {/* <ThemeToggle className="mr-auto" /> */}
            <Link href="/recordsearch">
              <Button
                className={`${sharedTabStyle} ${router.asPath.includes("record") ? tabStyleActive : tabStyleInactive}`}
              >
                Record Search
              </Button>
            </Link>
            <Link href="/committees">
              <Button
                className={`${sharedTabStyle} ${router.asPath.includes("committee") ? tabStyleActive : tabStyleInactive}`}
              >
                Committee List
              </Button>
            </Link>
          </div>
        </nav>
        <main
          className={`min-h-screen bg-background font-sans antialiased ${inter.variable} m-10`}
        >
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </>
  );
};

export default MyApp;
