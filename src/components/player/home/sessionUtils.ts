/** Returns hours from now until session start. */
export function getHoursUntilSession(dateStr: string, startTime: string): number {
  if (!dateStr || !startTime) return Infinity;
  const sessionStart = new Date(`${dateStr}T${startTime}`);
  return (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);
}
