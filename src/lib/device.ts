import { headers } from "next/headers";

/** A best guess, from the user agent, that the request comes from a phone. Only a hint for the first render: the browser decides once it's running. */
export async function guessPhone(): Promise<boolean> {
  return /Mobi|Android|iPhone/i.test((await headers()).get("user-agent") ?? "");
}
