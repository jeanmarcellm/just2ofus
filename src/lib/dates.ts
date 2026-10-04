import {
  addYears,
  differenceInCalendarDays,
  setYear,
  startOfDay,
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

// Start of a local calendar day as a timestamp, so "show on 10/10" means 10/10 in the user's timezone.
export function startOfDayIso(day: string): string {
  return startOfDay(parseDay(day)).toISOString();
}

// Next time a date comes around: yearly dates repeat (29/02 falls back to 28/02), one-off dates don't.
export function nextOccurrence(day: string, yearly: boolean, now: Date) {
  const original = parseDay(day);
  const today = startOfDay(now);
  if (!yearly) {
    return { date: original, daysLeft: differenceInCalendarDays(original, today), years: 0 };
  }
  let date = setYear(original, today.getFullYear());
  if (differenceInCalendarDays(date, today) < 0) date = setYear(original, today.getFullYear() + 1);
  return {
    date,
    daysLeft: differenceInCalendarDays(date, today),
    years: date.getFullYear() - original.getFullYear(),
  };
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Hoje!";
  if (daysLeft === 1) return "Amanhã";
  if (daysLeft < 0) return `Há ${-daysLeft} ${daysLeft === -1 ? "dia" : "dias"}`;
  return `Em ${daysLeft} dias`;
}
