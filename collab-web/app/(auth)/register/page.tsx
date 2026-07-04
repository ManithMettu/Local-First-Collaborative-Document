import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
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
          Create your account
        </h1>
        <p className="text-base text-muted-foreground">
          Start collaborating on documents in seconds
        </p>
      </div>

      <div className="surface-card p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
