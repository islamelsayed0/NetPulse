import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound URL guard for monitor probes (SSRF protection).
 *
 * Monitor targets are user supplied and are fetched from the server. Without a
 * guard, a monitor could point at localhost, a private network range, or a
 * cloud metadata endpoint such as 169.254.169.254. This module allows only
 * http and https URLs without embedded credentials whose hostname resolves
 * exclusively to public unicast addresses.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata",
]);

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

/** True when the IPv4 address is not a public unicast address. */
export function isPrivateIpv4(ip: string): boolean {
  const o = parseIpv4(ip);
  if (!o) return true;
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8 (unspecified / this network)
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && o[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && o[2] === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && o[2] === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && o[2] === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast 224/4, reserved 240/4, broadcast
  return false;
}

/** Expand an IPv6 address into eight 16 bit groups. Returns null when invalid. */
function expandIpv6(ip: string): number[] | null {
  let addr = ip;
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1)
  const lastColon = addr.lastIndexOf(":");
  const tail = addr.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    addr = `${addr.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 && missing < 0) return null;
  if (halves.length === 1 && head.length !== 8) return null;
  const groups = [
    ...head,
    ...(halves.length === 2 ? new Array(Math.max(missing, 0)).fill("0") : []),
    ...rest,
  ];
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

/** True when the IPv6 address is not a public unicast address. */
export function isPrivateIpv6(ip: string): boolean {
  const g = expandIpv6(ip);
  if (!g) return true;

  const allZeroPrefix = g.slice(0, 5).every((x) => x === 0);

  // ::  (unspecified) and ::1 (loopback)
  if (allZeroPrefix && g[5] === 0 && g[6] === 0 && (g[7] === 0 || g[7] === 1)) {
    return true;
  }
  // IPv4 mapped ::ffff:a.b.c.d and IPv4 compatible ::a.b.c.d
  if (allZeroPrefix && (g[5] === 0xffff || g[5] === 0)) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isPrivateIpv4(v4);
  }
  // 64:ff9b::/96 NAT64 well known prefix
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isPrivateIpv4(v4);
  }
  // 2002::/16 6to4: embedded IPv4 in groups 1 and 2
  if (g[0] === 0x2002) {
    const v4 = `${g[1] >> 8}.${g[1] & 0xff}.${g[2] >> 8}.${g[2] & 0xff}`;
    return isPrivateIpv4(v4);
  }
  // 2001:db8::/32 documentation
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;
  // fc00::/7 unique local
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link local
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  // fec0::/10 site local (deprecated)
  if ((g[0] & 0xffc0) === 0xfec0) return true;
  // ff00::/8 multicast
  if ((g[0] & 0xff00) === 0xff00) return true;
  return false;
}

/** True when the address (v4 or v6) must not be contacted by a monitor probe. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true;
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * Parses and validates a monitor URL. Throws BlockedUrlError with a user
 * friendly message when the URL is not an acceptable public http(s) target.
 * Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BlockedUrlError("Enter a valid URL (for example https://example.com).");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new BlockedUrlError("Only http and https URLs can be monitored.");
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("URLs with embedded credentials are not allowed.");
  }

  const host = stripBrackets(url.hostname).toLowerCase();
  if (!host) {
    throw new BlockedUrlError("The URL must include a hostname.");
  }
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new BlockedUrlError(
      "Local and internal hostnames cannot be monitored. Use a public address."
    );
  }

  // Literal IP address: no DNS needed.
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new BlockedUrlError(
        "Private, loopback and internal IP addresses cannot be monitored."
      );
    }
    return url;
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BlockedUrlError(`Could not resolve hostname "${host}".`);
  }
  if (addresses.length === 0) {
    throw new BlockedUrlError(`Hostname "${host}" did not resolve to any address.`);
  }
  for (const a of addresses) {
    if (isPrivateAddress(a.address)) {
      throw new BlockedUrlError(
        `Hostname "${host}" resolves to a private or internal address and cannot be monitored.`
      );
    }
  }
  return url;
}

/** Non throwing variant. Returns an error message or null when the URL is allowed. */
export async function checkPublicHttpUrl(input: string): Promise<string | null> {
  try {
    await assertPublicHttpUrl(input);
    return null;
  } catch (e) {
    if (e instanceof BlockedUrlError) return e.message;
    return e instanceof Error ? e.message : "URL is not allowed";
  }
}
