/** A system failure. Worded as one — never as an empty state or a team's decision. */
export function Broken({ reason }: { reason: string }) {
  return (
    <section className="broken-panel" role="alert">
      <h2 className="display">The dashboard cannot read its database</h2>
      <p>{reason}</p>
      <p style={{ marginTop: 14 }}>Start Postgres and apply the schema:</p>
      <pre>docker compose up -d</pre>
      <pre>{`docker exec -i founder-agents-postgres psql -U founder_agents -d founder_agents < db/schema.sql`}</pre>
      <p>Or look at the dashboard without Docker, on an embedded database with demo data:</p>
      <pre>cd web && npm run demo</pre>
    </section>
  );
}
