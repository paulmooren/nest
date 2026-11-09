import { lookup as dnsLookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

/** Why a page could not be fetched, in words fit to show a Member. */
export class FetchError extends Error {}

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

/** True for addresses that are not on the public internet: loopback, private, link-local, unique-local, reserved. */
export function isPrivateAddress(address: string): boolean {
  const v4 = /^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i.exec(address);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("ff") ||
    v6.startsWith("::ffff:")
  );
}

/** A DNS lookup that refuses private addresses, run when the socket connects so a changed answer cannot slip past. */
const publicOnlyLookup: typeof dnsLookup = ((hostname: string, options: object, callback: (...args: unknown[]) => void) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = addresses as unknown as { address: string; family: number }[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new FetchError("That address isn't a public web page."));
    }
    const wantsAll = (options as { all?: boolean }).all;
    return wantsAll ? callback(null, list) : callback(null, list[0].address, list[0].family);
  });
}) as typeof dnsLookup;

function decode(body: Buffer, encoding: string | undefined): Buffer {
  switch ((encoding ?? "").toLowerCase()) {
    case "gzip":
      return gunzipSync(body, { maxOutputLength: MAX_BYTES });
    case "br":
      return brotliDecompressSync(body, { maxOutputLength: MAX_BYTES });
    case "deflate":
      return inflateSync(body, { maxOutputLength: MAX_BYTES });
    default:
      return body;
  }
}

function once(url: URL): Promise<{ status: number; location?: string; html?: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: publicOnlyLookup,
        timeout: TIMEOUT_MS,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "gzip, br",
          "user-agent": "Mozilla/5.0 (compatible; NestRecipeImport/1.0)",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        if (status < 200 || status >= 300) {
          res.resume();
          return reject(new FetchError(`The page answered with an error (${status}).`));
        }
        if (!/html|xml/i.test(res.headers["content-type"] ?? "")) {
          res.resume();
          return reject(new FetchError("That link isn't a web page."));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy(new FetchError("That page is too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve({ status, html: decode(Buffer.concat(chunks), res.headers["content-encoding"]).toString("utf8") });
          } catch {
            reject(new FetchError("Couldn't read that page."));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("The page took too long to answer.")));
    req.on("error", (e) => reject(e instanceof FetchError ? e : new FetchError("Couldn't reach that page.")));
    req.end();
  });
}

/**
 * Fetches a web page a Member pasted (ADR 0013): http or https only, no private or internal addresses (checked
 * again at connect time and on every redirect), 5 seconds, 2 MB, no cookies.
 */
export async function fetchPublicPage(input: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new FetchError("That isn't a valid link.");
  }
  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchError("The link must start with http:// or https://.");
    if (url.username || url.password) throw new FetchError("Links with a login in them aren't supported.");
    if (isIP(url.hostname.replace(/^\[|\]$/g, "")) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
      throw new FetchError("That address isn't a public web page.");
    }
    const res = await once(url);
    if (res.html !== undefined) return res.html;
    try {
      url = new URL(res.location!, url);
    } catch {
      throw new FetchError("The page redirected somewhere invalid.");
    }
  }
  throw new FetchError("The page redirected too many times.");
}
