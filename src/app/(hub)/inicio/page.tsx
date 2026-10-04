"use client";

import { ChevronRight, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  DailyQuestionCard,
  LatestNoteCard,
  MoodCard,
  NextDateTicket,
  NotebookMoments,
  OnThisDayCard,
  TogetherCounter,
  UpcomingDatesCard,
} from "@/components/home-cards";
import { CouplePolaroids, Drop, Fancy, SectionTitle } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { DatePlan, Moment } from "@/lib/types";

export default function Home() {
  const { profile, partner, couple } = useCouple();

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

  let i = 0;
  return (
    <div className="flex flex-col gap-[26px]">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-hand text-[22px] leading-tight text-muted">oi, {profile.display_name}</p>
          <h1 className="-mt-0.5 truncate font-serif text-4xl leading-none tracking-[-0.01em] text-ink">
            {partner ? (
              <>
                Você <em className="text-batom">&amp;</em> {partner.display_name}
              </>
            ) : (
              <Fancy text="Seu cantinho" />
            )}
          </h1>
        </div>
        <Link href="/perfil" aria-label="Perfil">
          <CouplePolaroids me={profile.display_name} partner={partner?.display_name} />
        </Link>
      </header>

      {!partner && (
        <Drop index={i++}>
          <Link href="/perfil" className="flex rotate-[-0.6deg] items-center gap-3 rounded-[6px] bg-kraft p-4 shadow-paper">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-batom text-sheet shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]">
              <Send className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[22px] leading-tight text-ink">
                Convide seu <em>amor</em>
              </span>
              <span className="font-hand text-xl leading-tight text-ink-soft">o diário fica completo com vocês dois</span>
            </span>
            <ChevronRight className="size-5 text-terracota" />
          </Link>
        </Drop>
      )}

      <Drop index={i++}>
        <TogetherCounter since={couple.together_since} />
      </Drop>

      <LatestNoteCard dropIndex={i++} />

      <Drop index={i++}>
        <MoodCard />
      </Drop>

      <DailyQuestionCard dropIndex={i++} />

      <Drop index={i++} className="flex justify-between">
        {[
          { href: "/calendario", value: stats.moments, label: "momentos", tilt: -4, line: "#e3b5ba", bg: "#fbefee" },
          { href: "/dates", value: stats.dates, label: "dates", tilt: 2, line: "#b9cbb2", bg: "#f1f4ec" },
          { href: "/album", value: stats.photos, label: "fotos", tilt: -1.5, line: "#e2cf9b", bg: "#faf3e0" },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="drop-shadow-[0_6px_8px_rgba(80,50,40,.22)] transition-[rotate,scale] duration-300 [rotate:var(--tilt)] hover:scale-105 hover:[rotate:0deg]"
            style={{ "--tilt": `${s.tilt}deg` } as React.CSSProperties}
          >
            <span className="j2-stamp block h-28 w-[104px] bg-sheet p-1.5 max-[360px]:w-24">
              <span className="flex h-full flex-col items-center justify-center border" style={{ borderColor: s.line, background: s.bg }}>
                <span className="font-serif text-[38px] leading-none text-ink">{s.value}</span>
                <span className="font-hand text-xl leading-tight text-ink-soft">{s.label}</span>
              </span>
            </span>
          </Link>
        ))}
      </Drop>

      <UpcomingDatesCard dropIndex={i++} />

      <Drop index={i++}>
        <SectionTitle title="Próximo date" href="/dates" />
        <NextDateTicket plan={nextDate} />
      </Drop>

      <OnThisDayCard dropIndex={i++} />

      <Drop index={i++}>
        <NotebookMoments moments={moments} />
      </Drop>
    </div>
  );
}
