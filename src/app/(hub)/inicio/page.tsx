"use client";

import { CalendarHeart, Camera, ChevronRight, MapPin, Send, Wine } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  DailyQuestionCard,
  LatestNoteCard,
  MoodCard,
  OnThisDayCard,
  UpcomingDatesCard,
} from "@/components/home-cards";
import { Avatar, Card } from "@/components/ui";
import { formatDateTime, formatDay, nextAnniversary, togetherDuration } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { DatePlan, Moment } from "@/lib/types";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const { profile, partner, couple } = useCouple();
  const now = useNow();
  const t = togetherDuration(couple.together_since, now);
  const anniversary = nextAnniversary(couple.together_since, now);

  const [nextDate, setNextDate] = useState<DatePlan | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [stats, setStats] = useState({ moments: 0, photos: 0, dates: 0 });

  useEffect(() => {
    const db = supabase();
    const count = (table: string, filter?: [string, string]) => {
      const q = db.from(table).select("id", { count: "exact", head: true });
      return (filter ? q.eq(filter[0], filter[1]) : q).then((r) => r.count ?? 0);
    };
    Promise.all([
      db
        .from("date_plans")
        .select("*")
        .eq("status", "planned")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(1)
        .maybeSingle(),
      db.from("moments").select("*").order("happened_on", { ascending: false }).limit(3),
      count("moments"),
      count("photos"),
      count("date_plans", ["status", "done"]),
    ]).then(([d, m, momentsCount, photosCount, datesCount]) => {
      setNextDate(d.data);
      setMoments(m.data ?? []);
      setStats({ moments: momentsCount, photos: photosCount, dates: datesCount });
    });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">Oi, {profile.display_name}</p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {partner ? `Você & ${partner.display_name}` : "Seu cantinho"}
          </h1>
        </div>
        <Link href="/perfil" aria-label="Perfil" className="flex -space-x-3">
          <Avatar name={profile.display_name} />
          {partner && <Avatar name={partner.display_name} className="bg-violet-100 text-violet-600" />}
        </Link>
      </header>

      {!partner && (
        <Link href="/perfil" className="flex items-center gap-3 rounded-3xl bg-violet-50 p-4 ring-1 ring-violet-100">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
            <Send className="size-5" />
          </span>
          <span className="flex-1 text-sm">
            <span className="block font-semibold text-violet-900">Convide seu amor</span>
            <span className="text-violet-700">O app fica completo com vocês dois.</span>
          </span>
          <ChevronRight className="size-5 text-violet-400" />
        </Link>
      )}

      <section className="rounded-[2rem] bg-gradient-to-br from-rose-500 via-rose-500 to-fuchsia-500 p-6 text-white shadow-lg shadow-rose-500/30">
        <p className="text-sm font-medium text-rose-100">Juntos há</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [t.years, t.years === 1 ? "ano" : "anos"],
            [t.months, t.months === 1 ? "mês" : "meses"],
            [t.days, t.days === 1 ? "dia" : "dias"],
          ].map(([value, label]) => (
            <div key={label as string} className="rounded-2xl bg-white/15 py-3">
              <p className="text-3xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-rose-100">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-2xl font-semibold tabular-nums tracking-wider">
          {pad(t.hours)}:{pad(t.minutes)}:{pad(t.seconds)}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-sm">
          <span className="text-rose-100">{t.totalDays.toLocaleString("pt-BR")} dias no total</span>
          <span className="font-semibold">
            {anniversary.daysLeft === 0
              ? `Hoje: ${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"}! 🎉`
              : `${anniversary.years} ${anniversary.years === 1 ? "ano" : "anos"} em ${anniversary.daysLeft} dias`}
          </span>
        </div>
      </section>

      <LatestNoteCard />
      <MoodCard />
      <DailyQuestionCard />

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/calendario", icon: CalendarHeart, value: stats.moments, label: "momentos" },
          { href: "/dates", icon: Wine, value: stats.dates, label: "dates" },
          { href: "/album", icon: Camera, value: stats.photos, label: "fotos" },
        ].map(({ href, icon: Icon, value, label }) => (
          <Link key={href} href={href} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
            <Icon className="size-5 text-rose-400" />
            <p className="mt-2 text-xl font-bold text-stone-900">{value}</p>
            <p className="text-xs text-stone-500">{label}</p>
          </Link>
        ))}
      </div>

      <UpcomingDatesCard />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Próximo date</h2>
          <Link href="/dates" className="text-sm font-semibold text-rose-600">Ver todos</Link>
        </div>
        {nextDate ? (
          <div>
            <p className="text-lg font-semibold text-stone-900">{nextDate.title}</p>
            <p className="text-sm capitalize text-stone-500">{formatDateTime(nextDate.scheduled_at)}</p>
            {nextDate.location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                <MapPin className="size-4" /> {nextDate.location}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">Nenhum date marcado. Que tal planejar um?</p>
        )}
      </Card>

      <OnThisDayCard />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Últimos momentos</h2>
          <Link href="/calendario" className="text-sm font-semibold text-rose-600">Calendário</Link>
        </div>
        {moments.length ? (
          <ul className="flex flex-col gap-3">
            {moments.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-xl">{m.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900">{m.title}</p>
                  <p className="text-xs text-stone-500">{formatDay(m.happened_on)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Registrem as coisas que fizeram juntos no calendário.</p>
        )}
      </Card>
    </div>
  );
}
