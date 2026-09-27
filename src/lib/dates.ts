import {
  addYears,
  differenceInCalendarDays,
  format,
  intervalToDuration,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// "yyyy-MM-dd" columns must be parsed as local dates, not UTC midnight.
export function parseDay(day: string): Date {
  return parseISO(day);
}

export function toDayString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDay(day: string | Date, pattern = "d 'de' MMMM 'de' yyyy"): string {
  const date = typeof day === "string" ? parseDay(day) : day;
  return format(date, pattern, { locale: ptBR });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR });
}

export function togetherDuration(since: string, now: Date) {
  const d = intervalToDuration({ start: parseDay(since), end: now });
  return {
    years: d.years ?? 0,
    months: d.months ?? 0,
    days: d.days ?? 0,
    hours: d.hours ?? 0,
    minutes: d.minutes ?? 0,
    seconds: d.seconds ?? 0,
    totalDays: differenceInCalendarDays(now, parseDay(since)),
  };
}

export function nextAnniversary(since: string, now: Date) {
  const start = parseDay(since);
  let years = now.getFullYear() - start.getFullYear();
  let date = addYears(start, years);
  if (differenceInCalendarDays(date, now) < 0) {
    years += 1;
    date = addYears(start, years);
  }
  return { years, date, daysLeft: differenceInCalendarDays(date, now) };
}
