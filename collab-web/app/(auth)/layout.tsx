import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col text-base">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 py-10"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
