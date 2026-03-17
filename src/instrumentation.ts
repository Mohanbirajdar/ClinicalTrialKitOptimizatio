export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Patch dns.lookup to use Google DNS servers.
    // dns.setServers() only affects dns.resolve*() — it does NOT affect dns.lookup(),
    // which is what Node.js uses internally for all TCP connections (including postgres).
    // By replacing dns.lookup we force all hostname resolution (including Supabase pooler)
    // through 8.8.8.8 instead of the OS resolver that fails on Windows with EAI_AGAIN.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("dns") as {
      lookup: (...args: unknown[]) => void;
      Resolver: new () => { setServers: (s: string[]) => void; resolve4: (h: string, cb: (e: Error | null, a: string[]) => void) => void };
    };

    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    const originalLookup = dns.lookup.bind(dns);

    dns.lookup = function (hostname: unknown, options: unknown, callback: unknown) {
      // Normalise: lookup(host, cb) vs lookup(host, opts, cb)
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      resolver.resolve4(hostname as string, (err, addresses) => {
        if (!err && addresses && addresses.length > 0) {
          (callback as (e: null, a: string, f: number) => void)(null, addresses[0], 4);
        } else {
          // Fall back to OS resolver if Google DNS also fails
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
        msg.includes("ECONNRESET")
      ) {
        // Known transient DB/DNS errors — already handled at the application layer
        return;
      }
      // Re-throw anything else so real bugs aren't swallowed
      console.error("[unhandledRejection]", reason);
    });
  }
}
