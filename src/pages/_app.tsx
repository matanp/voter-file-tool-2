import { type AppType } from "next/app";
import { Inter } from "next/font/google";

import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <html lang="en">
      <body
        className={`bg-background min-h-screen font-sans antialiased ${inter.variable}`}
      >
        <Component {...pageProps} />
      </body>
    </html>
  );
};

export default MyApp;
