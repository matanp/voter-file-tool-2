import "~/styles/globals.css";

import { Inter } from "next/font/google";
// import { TopNav } from "./_components/topnav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Some cool shit or somethin",
  description: "Following alogn with a tutorial",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} flex flex-col gap-4`}>
        {children}
      </body>
    </html>
  );
}
