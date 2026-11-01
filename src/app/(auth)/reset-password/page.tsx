import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthFrame, AuthHeader, AuthNotice } from "@/components/ui/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDemoServer } from "@/lib/demo";
import { resetPassword } from "./actions";

export const metadata = { title: "Choose a new password" };

const ERROR_MESSAGES: Record<string, string> = {
  "weak-password": "Password must be at least 8 characters.",
  mismatch: "The two passwords don't match.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  if (isDemoServer()) redirect("/signin");
  const { token, error } = await searchParams;

  // Better Auth sends people here with ?error=INVALID_TOKEN when the emailed link is wrong or expired.
  if (!token || error === "INVALID_TOKEN") {
    return (
      <AuthFrame>
        <AuthHeader
          eyebrow="Password"
          title="That link has expired"
          description="Reset links work once, for one hour. Ask for a new one and we'll send it right away."
        />
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-foreground hover:underline">
            Send a new link
          </Link>
        </p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <AuthHeader eyebrow="Password" title="Choose a new password" />
      {error && ERROR_MESSAGES[error] && <AuthNotice tone="error">{ERROR_MESSAGES[error]}</AuthNotice>}
      <form action={resetPassword} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <Input
          type="password"
          name="password"
          aria-label="New password"
          autoComplete="new-password"
          enterKeyHint="next"
          required
          minLength={8}
          placeholder="New password (min. 8 characters)"
          className="h-12 rounded-xl"
        />
        <Input
          type="password"
          name="confirm"
          aria-label="Repeat the new password"
          autoComplete="new-password"
          enterKeyHint="go"
          required
          minLength={8}
          placeholder="Repeat the new password"
          className="h-12 rounded-xl"
        />
        <Button type="submit" size="lg" className="w-full rounded-xl font-semibold">
          Save password
        </Button>
      </form>
    </AuthFrame>
  );
}
