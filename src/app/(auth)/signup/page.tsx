import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFrame, AuthHeader, AuthNotice } from "@/components/ui/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDemoServer } from "@/lib/demo";
import { signUpWithPassword } from "./actions";

export const metadata = { title: "Create account" };

const ERROR_MESSAGES: Record<string, string> = {
  "weak-password": "Password must be at least 8 characters.",
  "email-taken": "That email is already registered — try signing in instead.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Nobody creates accounts in the Demo.
  if (isDemoServer()) redirect("/signin");
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <AuthFrame>
      <AuthHeader eyebrow="Create account" title="Join Nest" />
      {errorMessage && <AuthNotice tone="error">{errorMessage}</AuthNotice>}

      <form action={signUpWithPassword} className="flex flex-col gap-3">
        <Input
          type="text"
          name="name"
          aria-label="Your name (optional)"
          autoComplete="name"
          enterKeyHint="next"
          placeholder="Your name (optional)"
          className="h-12 rounded-xl"
        />
        <Input
          type="email"
          name="email"
          aria-label="Email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          placeholder="you@example.com"
          className="h-12 rounded-xl"
        />
        <Input
          type="password"
          name="password"
          aria-label="Password"
          autoComplete="new-password"
          enterKeyHint="go"
          required
          minLength={8}
          placeholder="Password (min. 8 characters)"
          className="h-12 rounded-xl"
        />
        <Button type="submit" size="lg" className="w-full rounded-xl font-semibold">
          Create account
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="inline-flex min-h-11 items-center font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
