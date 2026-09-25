import { resolve4 } from 'node:dns/promises';
import { connect } from 'node:net';

const DNS_TIMEOUT_MS = 2_000;
const TCP_TIMEOUT_MS = 2_000;

const INTERNET_PROBE_TARGETS = ['1.1.1.1', '8.8.8.8'] as const;

/**
 * Races a promise against a timer. Node's `dns.resolve4` has no built-in
 * cancellation, so a hung DNS query is simply abandoned (safe, no leaked
 * handles) rather than left to block the caller indefinitely.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      () => {
        clearTimeout(timer);
        resolvePromise(fallback);
      },
    );
  });
}

/** Resolves `true` if a TCP connection to host:port succeeds within timeoutMs. */
function probeTcp(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = connect({ host, port });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

/** Opens a short TCP connection. ICMP is often blocked while HTTPS still works. */
export function checkHostReachable(host: string, port = 443): Promise<boolean> {
  return probeTcp(host, port, TCP_TIMEOUT_MS);
}

/**
 * General internet reachability. Tries Cloudflare, then Google, on port 443
 * so a network that drops ping still counts as online.
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  for (const host of INTERNET_PROBE_TARGETS) {
    if (await checkHostReachable(host, 443)) return true;
  }
  return false;
}

/**
 * Checks that the update binary store (GitHub) is reachable. DNS resolve plus
 * a TCP connect to port 443 follows the same path the update download uses.
 */
export async function checkGithubStoreReachable(): Promise<boolean> {
  const ips = await withTimeout(resolve4('github.com'), DNS_TIMEOUT_MS, [] as string[]);
  if (ips.length === 0) return false;
  return probeTcp(ips[0], 443, TCP_TIMEOUT_MS);
}
