"use client";

import { Lock, MessageCircleHeart, Pencil } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Avatar, Button, Card, ErrorText, SectionTitle, Spinner, SubPageHeader, Textarea, WaxSeal } from "@/components/ui";
import { fetchDailyStatus } from "@/lib/daily";
import { formatDay } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { DailyAnswer } from "@/lib/types";

async function fetchHistory(): Promise<DailyAnswer[]> {
  const { data } = await supabase()
    .from("daily_answers")
    .select("user_id, day, question_id, answer")
    .order("day", { ascending: false })
    .limit(120);
  return data ?? [];
}

export default function DailyQuestionPage() {
  const { userId, profile, partner } = useCouple();
  const fetchToday = useCallback(() => fetchDailyStatus(userId), [userId]);
  const [status, reloadStatus] = useLoader(fetchToday);
  const [history, reloadHistory] = useLoader(fetchHistory);
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const partnerName = partner?.display_name ?? "Seu par";

  // past days where both answered, newest first
  const pastDays = useMemo(() => {
    if (!history || !status) return [];
    const byDay = new Map<string, DailyAnswer[]>();
    history.filter((a) => a.day !== status.day).forEach((a) => byDay.set(a.day, [...(byDay.get(a.day) ?? []), a]));
    return [...byDay.entries()]
      .filter(([, answers]) => answers.length === 2)
      .map(([day, answers]) => ({
        day,
        prompt: status.questions.find((q) => q.id === answers[0].question_id)?.prompt ?? "",
        mine: answers.find((a) => a.user_id === userId)!,
        theirs: answers.find((a) => a.user_id !== userId)!,
      }));
  }, [history, status, userId]);

  if (!status) return <Spinner />;
  const { question, mine, partner: theirs, partnerAnswered } = status;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!question) return;
    setBusy(true);
    setError("");
    const { error } = await supabase()
      .from("daily_answers")
      .upsert(
        { day: status!.day, question_id: question.id, answer: answer.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id,day" },
      );
    setBusy(false);
    if (error) return setError(friendlyError(error));
    setEditing(false);
    await Promise.all([reloadStatus(), reloadHistory()]);
  }

  const showForm = !mine || editing;

  return (
    <div className="flex flex-col gap-6">
      <SubPageHeader title="Pergunta do dia" subtitle="uma pergunta por dia, a mesma para os dois" />

      <section className="relative rotate-[-0.6deg] overflow-hidden rounded-[6px] bg-kraft px-5 pt-[22px] pb-6 shadow-paper">
        <span
          aria-hidden
          className="absolute top-0 right-0 block size-11 bg-[linear-gradient(225deg,#e9e1d6_50%,#e3d4c4_50%)] shadow-[-3px_3px_6px_-3px_rgba(80,50,40,.3)]"
        />
        <p className="text-xs font-semibold tracking-[.14em] text-terracota uppercase">{formatDay(status.day, "EEEE, d 'de' MMMM")}</p>
        <p className="mt-2 pr-[30px] font-serif text-[30px] leading-[1.1] text-balance text-ink italic">
          {question?.prompt ?? "Sem perguntas cadastradas."}
        </p>
      </section>

      {question && (
        <Card tape="rose" tilt={0.4}>
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={profile.display_name} size="sm" />
            <p className="font-serif text-[22px] text-ink">
              Sua <em>resposta</em>
            </p>
          </div>
          {showForm ? (
            <form onSubmit={save} className="flex flex-col gap-3">
              <Textarea required maxLength={1000} rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" loading={busy}>{mine ? "Salvar" : "Responder"}</Button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="font-hand text-[23px] leading-[1.2] whitespace-pre-wrap text-ink">{mine!.answer}</p>
              <button
                onClick={() => {
                  setAnswer(mine!.answer);
                  setEditing(true);
                }}
                className="shrink-0 rounded-full p-2 text-faint hover:bg-kraft hover:text-batom"
                aria-label="Editar resposta"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {question && partner && (
        <Card tape="sage" tilt={-0.5}>
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={partner.display_name} tone="partner" size="sm" tilt={5} />
            <p className="font-serif text-[22px] text-ink">
              Resposta de <em>{partnerName}</em>
            </p>
          </div>
          {theirs ? (
            <p className="font-hand text-[23px] leading-[1.2] whitespace-pre-wrap text-ink">{theirs.answer}</p>
          ) : (
            <p className="flex items-center gap-3 font-hand text-[21px] leading-[1.1] text-ink-soft">
              <WaxSeal size={34} className="animate-sway">
                <Lock className="size-4" strokeWidth={2.2} />
              </WaxSeal>
              {partnerAnswered
                ? `${partnerName} já respondeu! Responda também para ver.`
                : `${partnerName} ainda não respondeu.`}
            </p>
          )}
        </Card>
      )}

      {pastDays.length > 0 && (
        <section>
          <SectionTitle title="Respostas anteriores" />
          <ul className="flex flex-col gap-3">
            {pastDays.map((d) => (
              <li key={d.day} className="rounded-[6px] bg-sheet p-5 shadow-paper">
                <p className="text-xs font-semibold tracking-[.14em] text-terracota uppercase">{formatDay(d.day, "d 'de' MMM yyyy")}</p>
                <p className="mt-1 font-serif text-xl leading-tight text-ink italic">{d.prompt}</p>
                <div className="mt-3 flex flex-col gap-2 font-hand text-[21px] leading-[1.15]">
                  <p className="rotate-[-0.5deg] rounded-[4px] bg-blush/60 px-3.5 py-2 text-ink">
                    <b className="font-bold text-batom">Você: </b>
                    {d.mine.answer}
                  </p>
                  <p className="rotate-[0.5deg] rounded-[4px] bg-sage-soft/70 px-3.5 py-2 text-ink">
                    <b className="font-bold text-sage-ink">{partnerName}: </b>
                    {d.theirs.answer}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pastDays.length === 0 && mine && (
        <p className="flex items-center justify-center gap-2 text-center font-hand text-xl text-faint">
          <MessageCircleHeart className="size-4" /> As respostas dos dias anteriores aparecem aqui.
        </p>
      )}
    </div>
  );
}
