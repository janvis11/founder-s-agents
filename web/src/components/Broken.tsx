/** A system failure. Worded as one — never as an empty state or a team's decision. */
export function Broken({ reason }: { reason: string }) {
  return (
    <section className="broken-panel" role="alert">
      <h2 className="display">The dashboard cannot read its database</h2>
      <p>{reason}</p>
      <p style={{ marginTop: 14 }}>
        If you set FOUNDER_AGENTS_DB=postgres, start Postgres and apply the schema:
      </p>
      <pre>docker compose up -d</pre>
      <pre>{`docker exec -i founder-agents-postgres psql -U founder_agents -d founder_agents < db/schema.sql`}</pre>
      <p>Without that setting the dashboard keeps its data locally in web/.data and needs no Docker.</p>
    </section>
  );
}
