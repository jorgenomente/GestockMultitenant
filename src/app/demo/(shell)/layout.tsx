import type { ReactNode } from "react";
import DemoBottomNav from "../components/DemoBottomNav";
import { DemoBranchProvider } from "../components/DemoBranchProvider";
import DemoBranchSelector from "../components/DemoBranchSelector";

export default function DemoShellLayout({ children }: { children: ReactNode }) {
  return (
    <DemoBranchProvider>
      <div className="min-h-dvh md:flex md:bg-background">
        <DemoBottomNav />
        <div className="flex-1 md:min-h-dvh md:overflow-x-hidden md:pl-0">
          <DemoBranchSelector />
          <main className="pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-12">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DemoBranchProvider>
  );
}
