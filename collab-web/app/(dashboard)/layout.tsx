import { DashboardHeader } from "@/components/dashboard/header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <DashboardHeader />
      <main
        id="main-content"
        className="mx-auto flex w-[90%] max-w-none min-h-0 flex-1 flex-col self-center overflow-hidden py-4 sm:py-5"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
