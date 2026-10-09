#!/usr/bin/env python3
"""Check the model key in .env: list the models it can reach, say whether
MODEL is one of them, and send one tiny test message.

  python scripts/check_model.py            list strong candidates
  python scripts/check_model.py --all      list every model
"""

import argparse
import json
import time
import urllib.error
import urllib.request

from _env import read_env
from _profiles import PROVIDERS, choose_provider
from configure_instances import ROOT_ENV

BASES = {
    "nvidia": ("https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai", "GEMINI_API_KEY"),
    "openrouter": ("https://openrouter.ai/api/v1", "OPENROUTER_API_KEY"),
}
STRONG = ("kimi", "glm", "deepseek", "qwen3", "gemini-3", "gemini-2.5", "claude", "minimax", "gpt-oss")


def call(url: str, key: str, body: dict | None = None, timeout: int = 60) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    env = read_env(ROOT_ENV)
    provider = choose_provider(env)
    if provider not in BASES:
        raise SystemExit(f"{provider}: nothing to check here; run scripts/configure_instances.py and start the agents.")
    base, key_name = BASES[provider]
    key = env[key_name]
    model = env.get("MODEL") or PROVIDERS[provider]["model"]

    ids = sorted(m["id"] for m in call(f"{base}/models", key)["data"])
    shown = ids if args.all else [i for i in ids if any(s in i.lower() for s in STRONG)]
    print(f"{provider}: {len(ids)} models reachable" + ("" if args.all else ", strong candidates:"))
    for i in shown:
        print("  " + i)
    if model not in ids:
        raise SystemExit(f"\nMODEL={model} is not in that list. Put one of the ids above in .env as MODEL=..., "
                         "then run this again.")
    print(f"\nSending {model} a test message (waits up to 3 minutes)...", flush=True)
    started = time.time()
    try:
        reply = call(f"{base}/chat/completions", key,
                     {"model": model, "messages": [{"role": "user", "content": "Reply with the word ready."}],
                      "max_tokens": 300}, timeout=180)
        text = (reply["choices"][0]["message"].get("content") or "").strip()
        print(f"{model} answered {text[:40]!r} in {time.time() - started:.0f}s. The key works.")
    except urllib.error.HTTPError as error:
        raise SystemExit(f"{model} answered {error.code}: {error.read().decode(errors='replace')[:300]}")
    except TimeoutError:
        raise SystemExit(f"{model} did not answer within 3 minutes: the free tier is busy for it. "
                         "Pick another id from the list above as MODEL=... in .env.")


if __name__ == "__main__":
    main()
