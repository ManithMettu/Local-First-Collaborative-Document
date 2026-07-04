import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <Link
          href="/"
          className="inline-block text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          Collab
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-base text-muted-foreground">
          Sign in to continue to your documents
        </p>
      </div>

      <div className="surface-card p-8">
        <LoginForm />
      </div>
    </div>
  );
}
