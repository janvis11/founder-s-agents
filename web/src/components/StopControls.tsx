"use client";

import { useFormStatus } from "react-dom";
import { setPaused, stopBrief, stopWorkOrder } from "@/app/actions";

function Button({ children, busy, tone }: { children: React.ReactNode; busy: string; tone?: "stop" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="stop-btn" data-tone={tone} disabled={pending}>
      {pending ? busy : children}
    </button>
  );
}

function confirmFirst(message: string) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) event.preventDefault();
  };
}

/** Stops a brief and every unfinished work order in it. */
export function StopBrief({ briefId }: { briefId: number }) {
  return (
    <form
      action={stopBrief}
      onSubmit={confirmFirst(`Stop brief ${briefId}? Unfinished work is dropped. Drafts already done stay.`)}
    >
      <input type="hidden" name="brief_id" value={briefId} />
      <Button busy="Stopping…" tone="stop">
        Stop brief
      </Button>
    </form>
  );
}

export function StopWorkOrder({ workOrderId }: { workOrderId: string }) {
  return (
    <form action={stopWorkOrder} onSubmit={confirmFirst(`Stop ${workOrderId}? Whatever its team is writing is dropped.`)}>
      <input type="hidden" name="work_order_id" value={workOrderId} />
      <Button busy="Stopping…" tone="stop">
        Stop
      </Button>
    </form>
  );
}

/** While paused, the runner starts no new work for this office. */
export function PauseOffice({ paused }: { paused: boolean }) {
  return (
    <form action={setPaused}>
      <input type="hidden" name="paused" value={paused ? "false" : "true"} />
      <Button busy={paused ? "Resuming…" : "Pausing…"}>{paused ? "Resume office" : "Pause office"}</Button>
    </form>
  );
}
