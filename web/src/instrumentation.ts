// Runs once when the server starts. Opens every company's database straight
// away (without holding up startup), so each one is served on its port for
// the agents even before anyone enters that company in the dashboard.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.FOUNDER_AGENTS_DB === "postgres") return;
  const { listCompanies } = await import("./lib/companies");
  const { queryFor } = await import("./lib/sql");
  void listCompanies().then((companies) =>
    Promise.allSettled(companies.map((c) => queryFor(c.slug, "select 1"))).then((results) =>
      results.forEach((r, i) => {
        if (r.status === "rejected") console.error(`[aloft] could not open ${companies[i].slug}:`, r.reason);
      }),
    ),
  );
}
