"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { Label } from "@/components/ui/label";

const authInputClassName = "h-11 px-3 py-3 text-base md:text-base";
const authLabelClassName = "text-base";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/documents");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className={authLabelClassName}>Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-invalid={Boolean(error)}
          className={authInputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className={authLabelClassName}>Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          aria-invalid={Boolean(error)}
          inputClassName={authInputClassName}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-base text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-base text-muted-foreground">
        No account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
