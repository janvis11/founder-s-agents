// The Orchestrator's Hermes gateway — the same OpenAI-compatible endpoint
// cli.py talks to. The dashboard never talks to a team directly.

export type GatewayResult = { ok: true; content: string } | { ok: false; error: string };

export async function sendToOrchestrator(message: string): Promise<GatewayResult> {
  const port = process.env.ORCHESTRATOR_API_SERVER_PORT;
  const key = process.env.ORCHESTRATOR_API_SERVER_KEY;
  if (!port || !key) {
    return {
      ok: false,
      error:
        "ORCHESTRATOR_API_SERVER_PORT or ORCHESTRATOR_API_SERVER_KEY is missing from .env. Run python scripts/configure_instances.py.",
    };
  }
  const url = `http://127.0.0.1:${port}/v1/chat/completions`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "default",
        messages: [{ role: "user", content: message }],
        stream: false,
      }),
      signal: AbortSignal.timeout(180_000),
      cache: "no-store",
    });
    if (!response.ok) {
      const text = (await response.text()).slice(0, 400);
      return { ok: false, error: `The Orchestrator gateway answered ${response.status}: ${text}` };
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { ok: false, error: "The Orchestrator gateway answered without a message." };
    }
    return { ok: true, content };
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out after 3 minutes" : "is not running";
    return {
      ok: false,
      error: `The Orchestrator on port ${port} ${reason}. Start it with: orchestrator gateway run`,
    };
  }
}
