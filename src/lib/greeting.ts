const greetingRanges = {
  morning: { start: 5, end: 12, label: "Buenos días" },
  afternoon: { start: 12, end: 20, label: "Buenas tardes" },
} as const;

function hourInTimeZone(date: Date, timeZone: string) {
  try {
    const part = new Intl.DateTimeFormat("es-ES", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).find((item) => item.type === "hour");
    return Number(part?.value ?? date.getHours());
  } catch {
    return date.getHours();
  }
}

export function buildProfessionalGreeting(
  date: Date,
  timeZone: string,
  displayName?: string | null,
) {
  const hour = hourInTimeZone(date, timeZone);
  const greeting = hour >= greetingRanges.morning.start && hour < greetingRanges.morning.end
    ? greetingRanges.morning.label
    : hour >= greetingRanges.afternoon.start && hour < greetingRanges.afternoon.end
      ? greetingRanges.afternoon.label
      : "Buenas noches";
  const name = displayName?.trim();
  return name ? `${greeting}, ${name}` : greeting;
}
