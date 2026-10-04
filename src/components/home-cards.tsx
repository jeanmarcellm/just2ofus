"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, ChevronRight, Lock, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Card, Input } from "@/components/ui";
import { fetchDailyStatus } from "@/lib/daily";
import { daysLeftLabel, formatDay, toDayString } from "@/lib/dates";
import { signedUrls } from "@/lib/photos";
import { fetchSpecialDates, upcoming, withAnniversary, yearsLabel } from "@/lib/special-dates";
import { supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Mood, Note, OnThisDayItem } from "@/lib/types";

export const MOODS = ["😍", "😊", "😌", "😴", "😕", "😢", "😤", "🤒"];

export function MoodCard() {
  const { userId, partner } = useCouple();
  const today = toDayString(new Date());
  const fetchMoods = useCallback(async (): Promise<Mood[]> => {
    const { data } = await supabase().from("moods").select("user_id, day, emoji, note").eq("day", today);
    return data ?? [];
  }, [today]);
  const [moods, load] = useLoader(fetchMoods);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mine = moods?.find((m) => m.user_id === userId);
  const theirs = moods?.find((m) => m.user_id !== userId);
  const noteValue = note ?? mine?.note ?? "";

  async function save(values: { emoji?: string; note?: string }) {
    const emoji = values.emoji ?? mine?.emoji;
    if (!emoji) return;
    setBusy(true);
    await supabase()
      .from("moods")
      .upsert(
        { day: today, emoji, note: (values.note ?? noteValue).trim() || null, updated_at: new Date().toISOString() },
        { onConflict: "user_id,day" },
      );
    await load();
    setNote(null);
    setBusy(false);
  }

  return (
    <Card>
      <h2 className="font-semibold text-stone-900">Como você está hoje?</h2>
      <div className="mt-3 flex justify-between gap-1">
        {MOODS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => save({ emoji })}
            disabled={busy}
            aria-pressed={mine?.emoji === emoji}
            className={`flex size-10 items-center justify-center rounded-2xl text-xl transition ${
              mine?.emoji === emoji ? "scale-110 bg-rose-100 ring-2 ring-rose-400" : "opacity-70 hover:opacity-100"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {mine && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ note: noteValue });
          }}
        >
          <Input
            maxLength={140}
            placeholder="Quer contar por quê? (Enter para salvar)"
            value={noteValue}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== null && note !== (mine.note ?? "") && save({ note })}
            className="py-2 text-sm"
          />
        </form>
      )}
      {partner && (
        <div className="mt-4 flex items-center gap-3 border-t border-rose-50 pt-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl">
            {theirs?.emoji ?? "…"}
          </span>
          <p className="min-w-0 text-sm text-stone-600">
            {theirs ? (
              <>
                <span className="font-semibold text-stone-900">{partner.display_name}</span>
                {theirs.note ? `: ${theirs.note}` : " registrou o humor de hoje"}
              </>
            ) : (
              `${partner.display_name} ainda não contou como está hoje.`
            )}
          </p>
        </div>
      )}
    </Card>
  );
}

export function LatestNoteCard() {
  const { userId, partner } = useCouple();
  const fetchLatest = useCallback(async (): Promise<Note | null> => {
    const { data } = await supabase()
      .from("notes")
      .select("*")
      .neq("author_id", userId)
      .lte("visible_from", new Date().toISOString())
      .order("visible_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, [userId]);
  const [note] = useLoader(fetchLatest);
  if (!note) return null;
  return (
    <Link href="/recados" className="block rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 p-5 ring-1 ring-pink-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
        Recado de {partner?.display_name ?? "seu amor"} · {formatDistanceToNow(parseISO(note.visible_from), { locale: ptBR, addSuffix: true })}
      </p>
      <p className="mt-2 flex gap-2 text-stone-800">
        <span className="text-xl">{note.emoji}</span>
        <span className="line-clamp-3 whitespace-pre-wrap">{note.body}</span>
      </p>
    </Link>
  );
}

export function DailyQuestionCard() {
  const { userId, partner } = useCouple();
  const fetchStatus = useCallback(() => fetchDailyStatus(userId), [userId]);
  const [status] = useLoader(fetchStatus);
  if (!status?.question) return null;

  const hint = !status.mine
    ? status.partnerAnswered
      ? `${partner?.display_name ?? "Seu amor"} já respondeu. Sua vez!`
      : "Responda e veja o que seu amor disse."
    : status.partner
      ? "Os dois responderam. Veja as respostas!"
      : "Você já respondeu. Esperando seu amor…";

  return (
    <Link href="/pergunta" className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-rose-100">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
        {status.mine && !status.partner ? <Lock className="size-5" /> : <MessageCircleHeart className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-rose-500">Pergunta do dia</span>
        <span className="block font-semibold text-stone-900">{status.question.prompt}</span>
        <span className="text-sm text-stone-500">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-stone-300" />
    </Link>
  );
}

const SOON_DAYS = 45;

export function UpcomingDatesCard() {
  const { couple } = useCouple();
  const [dates] = useLoader(fetchSpecialDates);
  if (!dates) return null;
  const soon = upcoming(withAnniversary(dates, couple.together_since), new Date())
    .filter((d) => d.daysLeft >= 0 && d.daysLeft <= SOON_DAYS)
    .slice(0, 3);
  if (!soon.length) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">Datas chegando</h2>
        <Link href="/datas" className="text-sm font-semibold text-rose-600">Ver todas</Link>
      </div>
      <ul className="flex flex-col gap-3">
        {soon.map((d) => (
          <li key={d.id} className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">{d.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-stone-900">{d.title}</span>
              <span className="text-xs text-stone-500">
                {formatDay(d.next, "d 'de' MMMM")}
                {yearsLabel(d) && ` · ${yearsLabel(d)}`}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${d.daysLeft <= 7 ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600"}`}>
              {daysLeftLabel(d.daysLeft)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function fetchOnThisDay(): Promise<{ items: OnThisDayItem[]; urls: Record<string, string> }> {
  const { data } = await supabase().rpc("on_this_day", { p_day: toDayString(new Date()) });
  const items: OnThisDayItem[] = data ?? [];
  const urls = await signedUrls(items.flatMap((i) => (i.storage_path ? [i.storage_path] : [])).slice(0, 6));
  return { items, urls };
}

export function OnThisDayCard() {
  const [data] = useLoader(fetchOnThisDay);
  if (!data?.items.length) return null;
  const thisYear = new Date().getFullYear();
  const moments = data.items.filter((i) => i.kind === "moment");
  const photos = data.items.filter((i) => i.kind === "photo" && i.storage_path && data.urls[i.storage_path]);

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-white">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="size-5 text-amber-600" />
        <h2 className="font-semibold text-stone-900">Neste dia</h2>
      </div>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {photos.slice(0, 3).map((p) => (
            <Link key={p.id} href="/album" className="relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.urls[p.storage_path!]} alt={p.title ?? ""} className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 text-[10px] font-semibold text-white">
                {p.day.slice(0, 4)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {moments.map((m) => {
          const years = thisYear - Number(m.day.slice(0, 4));
          return (
            <li key={m.id} className="flex items-center gap-3 text-sm">
              <span className="text-xl">{m.emoji}</span>
              <span className="min-w-0 flex-1 text-stone-700">
                <span className="font-semibold text-stone-900">Há {years} {years === 1 ? "ano" : "anos"}:</span> {m.title}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
