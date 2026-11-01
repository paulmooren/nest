import Link from "next/link";

import { AuthFrame, AuthHeader, AuthNotice } from "@/components/ui/auth-frame";

export const metadata = { title: "Verify your email" };

const NOTES: Record<string, string> = {
  invalid: "That confirmation link is invalid or has expired. Sign in and we'll send you a new one.",
  unverified: "Your email isn't confirmed yet. We've just sent you a new link.",
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string; state?: string }> }) {
  const { error, state } = await searchParams;
  const note = error ? NOTES.invalid : state ? NOTES[state] : null;

  return (
    <AuthFrame>
      <AuthHeader eyebrow="One more step" title="Check your email" />
      {note && <AuthNotice>{note}</AuthNotice>}
      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent you a link to confirm your email address. Open it and you&apos;re in. It can take a minute, and it&apos;s
        worth a look in your spam folder.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Lost it? Try signing in and we&apos;ll send a new one.
      </p>
      <p className="mt-3 text-center text-sm">
        <Link href="/signin" className="inline-flex min-h-11 items-center font-semibold text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
