"use client";

import { Lock, MessageCircleHeart, Pencil } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Avatar, Button, Card, ErrorText, Spinner, SubPageHeader, Textarea } from "@/components/ui";
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
    <div className="flex flex-col gap-5">
      <SubPageHeader title="Pergunta do dia" subtitle="Uma pergunta por dia, a mesma para os dois" />

      <section className="rounded-[2rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-6 text-white shadow-lg shadow-rose-500/30">
        <p className="text-sm font-medium capitalize text-rose-100">{formatDay(status.day, "EEEE, d 'de' MMMM")}</p>
        <p className="mt-2 text-xl font-bold leading-snug">{question?.prompt ?? "Sem perguntas cadastradas."}</p>
      </section>

      {question && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={profile.display_name} className="size-8 text-xs" />
            <p className="font-semibold text-stone-900">Sua resposta</p>
          </div>
          {showForm ? (
            <form onSubmit={save} className="flex flex-col gap-3">
              <Textarea required maxLength={1000} rows={4} placeholder="Escreva com carinho…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" loading={busy}>{mine ? "Salvar" : "Responder"}</Button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-stone-700">{mine!.answer}</p>
              <button
                onClick={() => {
                  setAnswer(mine!.answer);
                  setEditing(true);
                }}
                className="shrink-0 rounded-full p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Editar resposta"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {question && partner && (
        <Card className={theirs ? "" : "bg-stone-50"}>
          <div className="mb-3 flex items-center gap-2">
            <Avatar name={partner.display_name} className="size-8 bg-violet-100 text-xs text-violet-600" />
            <p className="font-semibold text-stone-900">Resposta de {partnerName}</p>
          </div>
          {theirs ? (
            <p className="whitespace-pre-wrap text-stone-700">{theirs.answer}</p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-stone-500">
              <Lock className="size-4 shrink-0" />
              {partnerAnswered
                ? `${partnerName} já respondeu! Responda também para ver.`
                : `${partnerName} ainda não respondeu.`}
            </p>
          )}
        </Card>
      )}

      {pastDays.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-900">Respostas anteriores</h2>
          <ul className="flex flex-col gap-3">
            {pastDays.map((d) => (
              <li key={d.day} className="rounded-3xl bg-white p-5 ring-1 ring-rose-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{formatDay(d.day, "d 'de' MMM yyyy")}</p>
                <p className="mt-1 font-semibold text-stone-900">{d.prompt}</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <p className="rounded-2xl bg-rose-50 px-4 py-2 text-stone-700">
                    <span className="font-semibold text-rose-600">Você: </span>
                    {d.mine.answer}
                  </p>
                  <p className="rounded-2xl bg-violet-50 px-4 py-2 text-stone-700">
                    <span className="font-semibold text-violet-600">{partnerName}: </span>
                    {d.theirs.answer}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pastDays.length === 0 && mine && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-stone-400">
          <MessageCircleHeart className="size-4" /> As respostas dos dias anteriores aparecem aqui.
        </p>
      )}
    </div>
  );
}
