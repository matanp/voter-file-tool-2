"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { SignInButton } from "~/components/ui/signInButton";

const Header: React.FC = () => {
  const pathname = usePathname();
  const sharedTabStyle =
    "h-16 text-xl font-semibold w-42 flex items-center justify-center";
  const tabStyleActive = "bg-primary";
  const tabStyleInactive = "bg-muted-foreground";
  return (
    <div className="flex-gap border-bottom m-1 flex items-center justify-center gap-2 border-2 border-solid bg-accent py-2">
      {/* <ThemeToggle className="mr-auto" /> */}
      <Link href="/recordsearch">
        <Button
          className={`${sharedTabStyle} ${pathname?.includes("record") ? tabStyleActive : tabStyleInactive}`}
        >
          Record Search
        </Button>
      </Link>
      <Link href="/committees">
        <Button
          className={`${sharedTabStyle} ${pathname?.includes("committee") ? tabStyleActive : tabStyleInactive}`}
        >
          Committee List
        </Button>
      </Link>
      <SignInButton />
    </div>
  );
};

export default Header;
