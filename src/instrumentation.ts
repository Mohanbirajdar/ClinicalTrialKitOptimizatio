export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Force Google DNS — fixes EAI_AGAIN on local Windows for Supabase pooler hostnames
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("dns") as { setServers: (servers: string[]) => void };
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  }
}
