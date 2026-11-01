import Link from "next/link";

import { AuthFrame, AuthHeader, AuthNotice } from "@/components/ds/auth-frame";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { DEMO_PERSONAS, isDemoServer } from "@/lib/demo";
import { signInAsPersona, signInWithGoogle, signInWithPassword } from "./actions";

export const metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-credentials": "Incorrect email or password.",
  account_not_linked:
    "That email is already registered a different way — try signing in with Google or a password, whichever you used before.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.") : null;

  return (
    <AuthFrame>
      <AuthHeader eyebrow="Sign in" title="Welcome to Nest" />

      {reset && <AuthNotice>Password changed. Sign in with the new one.</AuthNotice>}
      {errorMessage && <AuthNotice tone="error">{errorMessage}</AuthNotice>}

      {isDemoServer() ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            A household with made-up money. Sign in as either person — switch whenever you like.
          </p>
          {DEMO_PERSONAS.map((p) => (
            <form key={p.key} action={signInAsPersona}>
              <input type="hidden" name="persona" value={p.key} />
              <Button
                type="submit"
                variant="outline"
                className="h-auto min-h-14 w-full flex-col items-start gap-0 rounded-xl px-4 py-3 text-left"
              >
                <span className="text-base font-semibold">Continue as {p.name}</span>
                <span className="text-sm font-normal text-muted-foreground">{p.blurb}</span>
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <SignInOptions />
      )}
    </AuthFrame>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.87c2.27-2.09 3.58-5.17 3.58-8.83Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function SignInOptions() {
  return (
    <>
      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" size="lg" className="w-full rounded-xl font-semibold">
          <GoogleMark />
          Continue with Google
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithPassword} className="flex flex-col gap-3">
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
          autoComplete="current-password"
          enterKeyHint="go"
          required
          placeholder="Password"
          className="h-12 rounded-xl"
        />
        <Button type="submit" size="lg" className="w-full rounded-xl font-semibold">
          Sign in
        </Button>
        <Link
          href="/forgot-password"
          className="flex min-h-11 items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot your password?
        </Link>
      </form>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
