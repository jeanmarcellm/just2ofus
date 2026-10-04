import { differenceInCalendarDays } from "date-fns";
import { parseDay, toDayString } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { DailyAnswer, DailyQuestion } from "@/lib/types";

const ROTATION_START = parseDay("2026-01-01");

// Both partners derive the same question from the date, so nothing has to be stored per day.
export function questionFor(questions: DailyQuestion[], day: string): DailyQuestion | null {
  if (!questions.length) return null;
  const sorted = [...questions].sort((a, b) => a.id - b.id);
  const n = sorted.length;
  const index = ((differenceInCalendarDays(parseDay(day), ROTATION_START) % n) + n) % n;
  return sorted[index];
}

export type DailyStatus = {
  day: string;
  question: DailyQuestion | null;
  questions: DailyQuestion[];
  mine: DailyAnswer | null;
  // only readable after you answer (enforced by RLS)
  partner: DailyAnswer | null;
  partnerAnswered: boolean;
};

export async function fetchDailyStatus(userId: string): Promise<DailyStatus> {
  const day = toDayString(new Date());
  const db = supabase();
  const [q, a, p] = await Promise.all([
    db.from("daily_questions").select("id, prompt"),
    db.from("daily_answers").select("user_id, day, question_id, answer").eq("day", day),
    db.rpc("partner_answered_daily", { p_day: day }),
  ]);
  const questions: DailyQuestion[] = q.data ?? [];
  const answers: DailyAnswer[] = a.data ?? [];
  return {
    day,
    questions,
    question: questionFor(questions, day),
    mine: answers.find((x) => x.user_id === userId) ?? null,
    partner: answers.find((x) => x.user_id !== userId) ?? null,
    partnerAnswered: Boolean(p.data),
  };
}
