import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFrame, AuthHeader, AuthNotice } from "@/components/ds/auth-frame";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { isDemoServer } from "@/lib/demo";
import { requestPasswordReset } from "./actions";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  if (isDemoServer()) redirect("/signin");
  const { sent } = await searchParams;

  return (
    <AuthFrame>
      <AuthHeader eyebrow="Password" title="Forgot your password?" />
      {sent ? (
        <AuthNotice>If that email has a Nest account, a reset link is on its way. It works for one hour.</AuthNotice>
      ) : (
        <>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>
          <form action={requestPasswordReset} className="flex flex-col gap-3">
            <Input
              type="email"
              name="email"
              aria-label="Email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="go"
              required
              placeholder="you@example.com"
              className="h-12 rounded-xl"
            />
            <Button type="submit" size="lg" className="w-full rounded-xl font-semibold">
              Send reset link
            </Button>
          </form>
        </>
      )}
      <p className="mt-3 text-center text-sm">
        <Link href="/signin" className="inline-flex min-h-11 items-center font-semibold text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
