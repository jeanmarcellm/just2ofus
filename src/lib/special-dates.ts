import { nextOccurrence } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { SpecialDate } from "@/lib/types";

export type UpcomingDate = SpecialDate & { next: Date; daysLeft: number; years: number; builtIn?: boolean };

export async function fetchSpecialDates(): Promise<SpecialDate[]> {
  const { data } = await supabase().from("special_dates").select("id, title, emoji, day, yearly").order("day");
  return data ?? [];
}

// The relationship anniversary always shows up, derived from the couple's start date.
export function withAnniversary(dates: SpecialDate[], togetherSince: string): (SpecialDate & { builtIn?: boolean })[] {
  return [
    { id: "anniversary", title: "Aniversário de namoro", emoji: "💞", day: togetherSince, yearly: true, builtIn: true },
    ...dates,
  ];
}

export function upcoming(dates: (SpecialDate & { builtIn?: boolean })[], now: Date): UpcomingDate[] {
  return dates
    .map((d) => {
      const n = nextOccurrence(d.day, d.yearly, now);
      return { ...d, next: n.date, daysLeft: n.daysLeft, years: n.years };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function yearsLabel(d: UpcomingDate): string | null {
  if (!d.yearly || d.years <= 0) return null;
  return `${d.years} ${d.years === 1 ? "ano" : "anos"}`;
}
