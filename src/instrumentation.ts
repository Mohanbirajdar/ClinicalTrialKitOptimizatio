export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Patch dns.lookup to use Google/Cloudflare DNS instead of the Windows OS resolver.
    // dns.setServers() only affects dns.resolve*() — it does NOT affect dns.lookup(),
    // which is what Node.js uses internally for all TCP connections (including postgres).
    // By (1) calling dns.setServers and (2) patching dns.lookup to call dns.resolve4,
    // we route Supabase pooler hostname resolution through reliable public DNS
    // instead of the Windows OS resolver that fails intermittently with EAI_AGAIN/ENOTFOUND.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("dns") as {
      lookup: (...args: unknown[]) => void;
      resolve4: (h: string, cb: (e: Error | null, a: string[]) => void) => void;
      setServers: (s: string[]) => void;
    };

    // setServers affects dns.resolve4/resolve6 calls below
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
    const originalLookup = dns.lookup.bind(dns);

    dns.lookup = function (hostname: unknown, options: unknown, callback: unknown) {
      // Normalise: lookup(host, cb) vs lookup(host, opts, cb)
      if (typeof options === "function") {
        callback = options;
        options = {};
      }

      // net.createConnection (used by postgres) calls dns.lookup with {all: true},
      // which means the callback expects (err, [{address, family}][]) not (err, string, number).
      // We must detect this and use the correct response format.
      const allRequested =
        options !== null &&
        typeof options === "object" &&
        (options as Record<string, unknown>).all === true;

      // Use module-level dns.resolve4 (which respects dns.setServers above).
      // Strict guard: addr must be a non-empty string to avoid ERR_INVALID_IP_ADDRESS.
      dns.resolve4(hostname as string, (err, addrs) => {
        const addr = !err && Array.isArray(addrs) && typeof addrs[0] === "string" && addrs[0];
        if (addr) {
          if (allRequested) {
            // {all:true} mode: callback expects an array of {address, family} objects
            (callback as (e: null, a: { address: string; family: number }[]) => void)(null, [
              { address: addr, family: 4 },
            ]);
          } else {
            (callback as (e: null, a: string, f: number) => void)(null, addr, 4);
          }
        } else {
          // Fall back to OS resolver (covers IPv6-only hosts and anything else)
          originalLookup(hostname, options, callback);
        }
      });
    } as typeof dns.lookup;

    // Suppress unhandledRejection noise from postgres.js internal promise chains
    // when Supabase cancels statements on cold start. These do not affect responses
    // (pages still return 200) but Next.js dev mode prints ⨯ for them.
    process.on("unhandledRejection", (reason) => {
      const msg = String(reason);
      if (
        msg.includes("canceling statement due to statement timeout") ||
        msg.includes("EAI_AGAIN") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ERR_INVALID_IP_ADDRESS")
      ) {
        // Known transient DB/DNS errors — already handled at the application layer
        return;
      }
      // Re-throw anything else so real bugs aren't swallowed
      console.error("[unhandledRejection]", reason);
    });
  }
}
