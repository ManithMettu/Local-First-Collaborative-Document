import Link from "next/link";
import { redirect } from "next/navigation";
import { CloudOff, History, Users } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const FEATURES = [
  {
    icon: CloudOff,
    title: "Local-first",
    description:
      "Open, edit, and close documents offline. Yjs keeps your draft safe in the browser.",
  },
  {
    icon: Users,
    title: "Live collaboration",
    description:
      "See collaborators' cursors in real time with CRDT merge — no last-write-wins.",
  },
  {
    icon: History,
    title: "Version history",
    description:
      "Restore any snapshot non-destructively. AI summaries optional for auto saves.",
  },
] as const;

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/documents");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <span className="text-sm font-semibold tracking-tight">Collab</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/register" />}>
            Get started
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-12"
      >
        <section className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Write together, stay in sync
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            A local-first collaborative editor with offline support, live
            cursors, and version history — built for teams who cannot afford to
            lose a keystroke.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/register" />}>
              Create free account
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="mt-20 grid gap-4 sm:grid-cols-3"
        >
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="surface-card p-5 transition-shadow duration-300 hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <feature.icon
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
