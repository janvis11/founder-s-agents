const DAY = 86_400_000;

/** "10:42" today, "Tue 10:42" this week, "12 Sep" otherwise. */
export function stamp(date: Date | string, now = new Date()): string {
  const d = new Date(date);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, now)) return time;
  if (now.getTime() - d.getTime() < 6 * DAY) {
    return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${time}`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "4 min", "3 h", "2 d" — how long something has been waiting. */
export function age(date: Date | string, now = new Date()): string {
  const ms = now.getTime() - new Date(date).getTime();
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function day(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function isoDate(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
