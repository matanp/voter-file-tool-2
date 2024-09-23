import { type ReactNode } from "react";
import { VoterRecordsContextProvider } from "~/components/providers/VoterRecordsContext";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return <VoterRecordsContextProvider>{children}</VoterRecordsContextProvider>;
};

export default Layout;
