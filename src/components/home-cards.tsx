"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, Lock, MapPin, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Avatar, Card, Drop, HandLink, Input, Polaroid, SectionTitle, STICKER_TILTS, WaxSeal, type TapeColor } from "@/components/ui";
import { fetchDailyStatus } from "@/lib/daily";
import { daysLeftLabel, formatDay, nextAnniversary, toDayString, togetherDuration } from "@/lib/dates";
import { signedUrls } from "@/lib/photos";
import { fetchSpecialDates, upcoming, withAnniversary } from "@/lib/special-dates";
import { supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { DatePlan, Moment, Mood, Note, OnThisDayItem } from "@/lib/types";

export const MOODS: [emoji: string, label: string][] = [
  ["😍", "apaixonado"],
  ["😊", "feliz"],
  ["😌", "em paz"],
  ["😴", "com sono"],
  ["😕", "meh"],
  ["😢", "tristinho"],
  ["😤", "bravo"],
  ["🤒", "dodói"],
];

// Mood stickers: tap one and it pops, tilts and shows its name.
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
  // shows the tapped sticker right away, before the round trip
  const [picked, setPicked] = useState<string | null>(null);

  const mine = moods?.find((m) => m.user_id === userId);
  const theirs = moods?.find((m) => m.user_id !== userId);
  const noteValue = note ?? mine?.note ?? "";
  const current = picked ?? mine?.emoji;

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
    setPicked(null);
    setBusy(false);
  }

  return (
    <Card tilt={0.5} className="px-[18px] pt-6 pb-[18px]">
      <span
        aria-hidden
        className="absolute -top-[11px] left-1/2 -ml-[45px] block h-6 w-[90px] -rotate-3 bg-[rgba(236,214,150,.7)] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.28)_0_4px,transparent_4px_9px)]"
      />
      <h2 className="font-serif text-[26px] leading-tight text-ink">
        Como você está <em>hoje?</em>
      </h2>
      <div className="mt-3.5 grid grid-cols-4 gap-y-2">
        {MOODS.map(([emoji, label], i) => {
          const active = current === emoji;
          return (
            <button
              key={emoji}
              onClick={() => {
                setPicked(emoji);
                void save({ emoji });
              }}
              disabled={busy}
              aria-pressed={active}
              aria-label={label}
              className="flex flex-col items-center py-1"
            >
              <span
                className={`flex size-[50px] items-center justify-center rounded-full text-[28px] shadow-[0_0_0_3px_#fffdf9,0_4px_10px_-3px_rgba(80,50,40,.35)] transition-[transform,background-color] duration-[450ms] ease-bouncy ${
                  active ? "bg-sticker" : "bg-[#f7f0e6]"
                }`}
                style={{ transform: active ? "scale(1.2) rotate(-8deg) translateY(-2px)" : `rotate(${STICKER_TILTS[i]}deg)` }}
              >
                {emoji}
              </span>
              <span className={`h-[22px] font-hand text-[19px] leading-[22px] text-batom transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {mine && (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ note: noteValue });
          }}
        >
          <Input
            maxLength={140}
            placeholder="quer contar por quê? (enter para salvar)"
            value={noteValue}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== null && note !== (mine.note ?? "") && save({ note })}
            className="text-[15px]"
          />
        </form>
      )}
      {partner && (
        <div className="mt-2.5 flex items-center gap-3 border-t-[1.5px] border-dashed border-dash pt-3.5">
          <Avatar name={partner.display_name} tone="partner" size="sm" tilt={-6}>
            <span className="text-lg">{theirs?.emoji ?? "…"}</span>
          </Avatar>
          <p className="min-w-0 font-hand text-[22px] leading-[1.1] text-ink">
            {theirs ? (
              <>
                <b className="font-bold">{partner.display_name}:</b> {theirs.note || "registrou o humor de hoje"}
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

// The partner's latest note arrives in a sealed envelope: tap to open the flap and slide the letter out.
export function LatestNoteCard({ dropIndex = 0 }: { dropIndex?: number }) {
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
  const [open, setOpen] = useState(false);
  if (!note) return null;

  return (
    <Drop index={dropIndex}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Fechar recado" : "Abrir recado"}
        className="relative block h-[236px] w-full text-left [perspective:900px]"
      >
        <span
          className="absolute inset-x-[18px] top-[100px] z-[1] block h-[132px] overflow-hidden rounded-[4px] bg-sheet bg-[repeating-linear-gradient(#fffdf9_0_29px,#f0e4d8_29px_30px)] px-4 py-2.5 shadow-[0_4px_10px_-4px_rgba(80,50,40,.2)] transition-transform delay-150 duration-700 ease-[cubic-bezier(.3,1.3,.5,1)]"
          style={{ transform: open ? "translateY(-96px) rotate(-1.5deg)" : "none" }}
        >
          <span className="line-clamp-4 font-hand text-[23px] leading-[30px] whitespace-pre-wrap text-ink">
            {note.emoji} {note.body}
          </span>
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[2] block h-[150px] rounded-[6px] bg-envelope shadow-[inset_0_-2px_0_rgba(0,0,0,.04)] [clip-path:polygon(0_0,50%_52%,100%_0,100%_100%,0_100%)]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex h-[150px] items-end justify-between gap-2 px-4 py-3.5">
          <span className="truncate font-hand text-[21px] text-ink-soft">
            de {partner?.display_name ?? "seu amor"} · {formatDistanceToNow(parseISO(note.visible_from), { locale: ptBR, addSuffix: true })}
          </span>
          <span className="shrink-0 text-xs font-semibold tracking-[.12em] text-terracota uppercase">
            {open ? "fechar" : "toque para abrir"}
          </span>
        </span>
        <span
          aria-hidden
          className="absolute inset-x-0 top-[86px] block h-24 origin-top rounded-t-[6px] bg-envelope-flap transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)] [clip-path:polygon(0_0,100%_0,50%_100%)]"
          style={{ transform: open ? "rotateX(180deg)" : "none", zIndex: open ? 0 : 4 }}
        />
        <span
          aria-hidden
          className="absolute top-[150px] left-1/2 z-[5] -ml-[23px] block transition-all duration-300"
          style={{ opacity: open ? 0 : 1, transform: open ? "scale(0)" : "scale(1)" }}
        >
          <WaxSeal size={46} />
        </span>
      </button>
      <div className="mt-1 text-right">
        <HandLink href="/recados" className="text-xl">
          ver recados →
        </HandLink>
      </div>
    </Drop>
  );
}

// Question of the day as a kraft note with a folded corner.
export function DailyQuestionCard({ dropIndex = 0 }: { dropIndex?: number }) {
  const { userId, partner } = useCouple();
  const fetchStatus = useCallback(() => fetchDailyStatus(userId), [userId]);
  const [status] = useLoader(fetchStatus);
  if (!status?.question) return null;

  const waiting = Boolean(status.mine && !status.partner);
  const hint = !status.mine
    ? status.partnerAnswered
      ? `${partner?.display_name ?? "Seu amor"} já respondeu. Sua vez!`
      : "Responda e veja o que seu amor disse."
    : status.partner
      ? "Os dois responderam. Veja as respostas!"
      : "Você já respondeu. Esperando seu amor…";

  return (
    <Drop index={dropIndex}>
      <Link href="/pergunta" className="relative block rotate-[-0.6deg] overflow-hidden rounded-[6px] bg-kraft px-5 pt-[22px] pb-5 shadow-paper">
        <span
          aria-hidden
          className="absolute top-0 right-0 block size-11 bg-[linear-gradient(225deg,#e9e1d6_50%,#e3d4c4_50%)] shadow-[-3px_3px_6px_-3px_rgba(80,50,40,.3)]"
        />
        <p className="text-xs font-semibold tracking-[.14em] text-terracota uppercase">Pergunta do dia</p>
        <h2 className="mt-2 pr-[30px] font-serif text-[28px] leading-[1.1] text-balance text-ink italic">{status.question.prompt}</h2>
        <div className="mt-4 flex items-center gap-3">
          <WaxSeal size={38} className="animate-sway">
            {waiting ? <Lock className="size-4" strokeWidth={2.2} /> : <MessageCircleHeart className="size-[18px]" strokeWidth={2} />}
          </WaxSeal>
          <p className="font-hand text-[21px] leading-[1.1] text-ink-soft">{hint}</p>
        </div>
      </Link>
    </Drop>
  );
}

const SOON_DAYS = 45;
const BANDS = ["#8aa386", "#c9a35c"];

// Tear-off calendar leaves for the next special dates.
export function UpcomingDatesCard({ dropIndex = 0 }: { dropIndex?: number }) {
  const { couple } = useCouple();
  const [dates] = useLoader(fetchSpecialDates);
  if (!dates) return null;
  const soon = upcoming(withAnniversary(dates, couple.together_since), new Date())
    .filter((d) => d.daysLeft >= 0 && d.daysLeft <= SOON_DAYS)
    .slice(0, 3);
  if (!soon.length) return null;

  return (
    <Drop index={dropIndex}>
      <SectionTitle title="Datas chegando" href="/datas" linkLabel="ver todas →" />
      <div className="flex gap-3">
        {soon.map((d, i) => {
          const urgent = d.daysLeft <= 7;
          return (
            <Link
              key={d.id}
              href="/datas"
              className="min-w-0 flex-1 overflow-hidden rounded-[6px] bg-sheet shadow-[0_10px_20px_-12px_rgba(80,50,40,.4)]"
              style={{ rotate: `${[-2, 1.5, -1][i]}deg` }}
            >
              <div
                className="py-[5px] text-center text-[11px] font-bold tracking-[.18em] text-sheet uppercase"
                style={{ background: urgent ? "#b4475a" : BANDS[i % 2] }}
              >
                {format(d.next, "MMM", { locale: ptBR }).replace(".", "")}
              </div>
              <div className="-mt-px border-t-2 border-dotted border-sheet" />
              <p className="mt-1.5 text-center font-serif text-[40px] leading-none text-ink">{format(d.next, "dd")}</p>
              <p className="mx-2 mt-1 truncate text-center text-xs font-semibold text-ink">
                {d.emoji} {d.title}
              </p>
              <p className={`mt-0.5 mb-2.5 text-center font-hand text-[19px] leading-tight ${urgent ? "text-batom" : "text-ink-soft"}`}>
                {daysLeftLabel(d.daysLeft).toLowerCase()}
              </p>
            </Link>
          );
        })}
      </div>
    </Drop>
  );
}

async function fetchOnThisDay(): Promise<{ items: OnThisDayItem[]; urls: Record<string, string> }> {
  const { data } = await supabase().rpc("on_this_day", { p_day: toDayString(new Date()) });
  const items: OnThisDayItem[] = data ?? [];
  const urls = await signedUrls(items.flatMap((i) => (i.storage_path ? [i.storage_path] : [])).slice(0, 3));
  return { items, urls };
}

const POLA_LAYOUT: { tilt: number; y: number; tape: TapeColor }[] = [
  { tilt: -7, y: 6, tape: "rose" },
  { tilt: 3, y: -4, tape: "sage" },
  { tilt: -2, y: 8, tape: "mustard" },
];

// Polaroids from the same day in past years; they straighten up on hover.
export function OnThisDayCard({ dropIndex = 0 }: { dropIndex?: number }) {
  const [data] = useLoader(fetchOnThisDay);
  if (!data?.items.length) return null;
  const thisYear = new Date().getFullYear();
  const moments = data.items.filter((i) => i.kind === "moment");
  const photos = data.items.filter((i) => i.kind === "photo" && i.storage_path && data.urls[i.storage_path]).slice(0, 3);

  return (
    <Drop index={dropIndex}>
      <h2 className="mb-[18px] font-serif text-[26px] leading-tight text-ink">
        Neste dia, <em>há um tempo…</em>
      </h2>
      {photos.length > 0 && (
        <div className="flex justify-center gap-1 px-1">
          {photos.map((p, i) => {
            const l = POLA_LAYOUT[i];
            return (
              <Link
                key={p.id}
                href="/album"
                className="relative w-28 transition-[translate,scale,rotate] duration-[350ms] ease-spring [rotate:var(--tilt)] [translate:0_var(--y)] hover:z-10 hover:scale-[1.06] hover:[rotate:0deg] hover:[translate:0_-8px]"
                style={{ "--tilt": `${l.tilt}deg`, "--y": `${l.y}px` } as React.CSSProperties}
              >
                <Polaroid src={data.urls[p.storage_path!]} alt={p.title ?? ""} caption={p.day.slice(0, 4)} tape={l.tape} />
              </Link>
            );
          })}
        </div>
      )}
      {moments.length > 0 && (
        <ul className={`flex flex-col gap-1.5 ${photos.length ? "mt-[18px]" : ""}`}>
          {moments.map((m) => {
            const years = thisYear - Number(m.day.slice(0, 4));
            return (
              <li key={m.id} className="font-hand text-[22px] leading-[1.15] text-ink">
                {m.emoji} <b className="font-bold">Há {years} {years === 1 ? "ano" : "anos"}:</b> {m.title}
              </li>
            );
          })}
        </ul>
      )}
    </Drop>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

// A tear-off calendar pad: years, months and days, a live clock and the road to the next anniversary.
export function TogetherCounter({ since }: { since: string }) {
  const now = useNow();
  const t = togetherDuration(since, now);
  const anniversary = nextAnniversary(since, now);
  const progress = Math.max(2, Math.min(100, (1 - anniversary.daysLeft / 365) * 100));
  const yearsWord = anniversary.years === 1 ? "ano" : "anos";

  return (
    <section className="relative rounded-lg bg-sheet px-[22px] pt-[34px] pb-5 shadow-pad">
      <div aria-hidden className="absolute inset-x-0 top-3 flex justify-center gap-[120px]">
        <span className="size-3 rounded-full bg-[#e9e1d6] shadow-[inset_0_2px_3px_rgba(0,0,0,.2)]" />
        <span className="size-3 rounded-full bg-[#e9e1d6] shadow-[inset_0_2px_3px_rgba(0,0,0,.2)]" />
      </div>
      <p className="rotate-[-2deg] text-center font-hand text-[26px] leading-tight text-batom">juntos há</p>
      <div className="mt-1 grid grid-cols-3 text-center">
        {[
          [t.years, t.years === 1 ? "ano" : "anos"],
          [t.months, t.months === 1 ? "mês" : "meses"],
          [t.days, t.days === 1 ? "dia" : "dias"],
        ].map(([value, label], idx) => (
          <div key={label as string} className={idx === 1 ? "border-x border-[#efe4d8]" : ""}>
            <p className="font-serif text-[64px] leading-none text-ink">{value}</p>
            <p className="mt-0.5 text-xs tracking-[.14em] text-muted uppercase">{label}</p>
          </div>
        ))}
      </div>
      <div className="-mx-[22px] mt-[18px] border-t-2 border-dashed border-dash" />
      <p className="mt-3.5 text-center font-serif text-[30px] text-ink italic tabular-nums [perspective:200px]" aria-label="Tempo de hoje">
        {pad(t.hours)}
        <span className="text-[#d9b8b0]">:</span>
        {pad(t.minutes)}
        <span className="text-[#d9b8b0]">:</span>
        <span key={t.seconds} className="inline-block animate-flip text-batom">
          {pad(t.seconds)}
        </span>
      </p>
      <div className="mt-4">
        <div className="flex justify-between gap-2 text-[13px] text-muted">
          <span>{t.totalDays.toLocaleString("pt-BR")} dias de nós</span>
          <span className="font-semibold text-ink">
            {anniversary.daysLeft === 0
              ? `hoje: ${anniversary.years} ${yearsWord}! 🎉`
              : `${anniversary.years} ${yearsWord} em ${anniversary.daysLeft} ${anniversary.daysLeft === 1 ? "dia" : "dias"}`}
          </span>
        </div>
        <div className="relative mt-2.5 h-1 rounded-sm bg-[#f1e6db]">
          <div className="h-1 rounded-sm bg-rose-wave" style={{ width: `${progress}%` }} />
          <Heart className="absolute -top-1.5 -ml-2 size-4 animate-beat fill-batom text-batom" style={{ left: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
}

// "Admite dois": the next date as a ticket with a tear-off stub.
export function NextDateTicket({ plan }: { plan: DatePlan | null }) {
  if (!plan) {
    return (
      <Link href="/dates" className="block drop-shadow-[0_10px_14px_rgba(80,50,40,.22)]">
        <div className="j2-ticket flex rounded-xl bg-sheet">
          <p className="flex-1 p-[18px] font-hand text-[22px] leading-tight text-ink-soft">Nenhum date marcado. Que tal planejar um?</p>
          <div className="flex w-24 items-center justify-center border-l-2 border-dashed border-[#e6d6c8] bg-[#f6e3e0] font-serif text-[40px] text-[#d9b8b0]">?</div>
        </div>
      </Link>
    );
  }
  const when = parseISO(plan.scheduled_at);
  const minutes = format(when, "mm");
  return (
    <Link
      href="/dates"
      className="block drop-shadow-[0_10px_14px_rgba(80,50,40,.22)] transition-transform duration-300 hover:-translate-y-[3px] hover:-rotate-[.6deg]"
    >
      <div className="j2-ticket flex rounded-xl bg-sheet">
        <div className="min-w-0 flex-1 p-[18px] pb-4">
          <p className="text-[11px] font-bold tracking-[.18em] text-terracota uppercase">Admite dois</p>
          <p className="mt-1.5 font-serif text-[26px] leading-[1.05] text-ink">{plan.title}</p>
          {plan.location && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{plan.location}</span>
            </p>
          )}
        </div>
        <div className="flex w-24 shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-[#e6d6c8] bg-[#f6e3e0] py-3">
          <span className="text-[11px] font-bold tracking-[.18em] text-terracota uppercase">
            {format(when, "EEE", { locale: ptBR }).replace(".", "")}
          </span>
          <span className="font-serif text-[40px] leading-none text-ink">{format(when, "d")}</span>
          <span className="font-hand text-xl leading-tight text-ink-soft">
            às {format(when, "H")}h{minutes === "00" ? "" : minutes}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Latest moments written on a notebook page, dates in the red margin.
export function NotebookMoments({ moments }: { moments: Moment[] }) {
  return (
    <section className="rounded-[6px] bg-sheet bg-[linear-gradient(90deg,transparent_54px,#efc9cc_54px,#efc9cc_55.5px,transparent_55.5px),repeating-linear-gradient(transparent_0_37px,#ebe1d6_37px_38px)] pt-4 pr-[18px] pb-2.5 shadow-paper">
      <div className="flex h-[38px] items-baseline justify-between pl-[68px]">
        <h2 className="font-serif text-2xl text-ink">
          Últimos <em>momentos</em>
        </h2>
        <Link href="/calendario" className="font-hand text-xl text-batom">
          calendário →
        </Link>
      </div>
      {moments.length ? (
        moments.map((m) => (
          <div key={m.id} className="flex h-[38px] items-center">
            <span className="w-[54px] shrink-0 text-center font-hand text-lg text-batom">{formatDay(m.happened_on, "d MMM")}</span>
            <span className="truncate pl-3.5 font-hand text-[23px] text-ink">
              {m.emoji} {m.title}
            </span>
          </div>
        ))
      ) : (
        <div className="flex h-[76px] items-center pl-[68px] font-hand text-[21px] leading-[38px] text-muted">
          Registrem as coisas que fizeram juntos no calendário.
        </div>
      )}
    </section>
  );
}
