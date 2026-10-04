"use client";

import { Milestone } from "lucide-react";
import { useMemo } from "react";
import { useCouple } from "@/components/auth-provider";
import { EmptyState, Polaroid, Spinner, STICKER_TILTS, SubPageHeader, WaxSeal } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { signedUrls } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Moment, Photo } from "@/lib/types";

type Entry =
  | { kind: "moment"; key: string; day: string; moment: Moment }
  | { kind: "photo"; key: string; day: string; photo: Photo; url?: string };

// Moments (goals and finished dates already become moments) plus the photos starred as special.
async function fetchTimeline(): Promise<Entry[]> {
  const db = supabase();
  const [m, p] = await Promise.all([
    db.from("moments").select("*"),
    db.from("photos").select("*").eq("is_special", true),
  ]);
  const photos: Photo[] = p.data ?? [];
  const urls = await signedUrls(photos.map((x) => x.storage_path));
  return [
    ...((m.data ?? []) as Moment[]).map((moment): Entry => ({ kind: "moment", key: `m-${moment.id}`, day: moment.happened_on, moment })),
    ...photos.map((photo): Entry => ({ kind: "photo", key: `p-${photo.id}`, day: photo.taken_on, photo, url: urls[photo.storage_path] })),
  ].sort((a, b) => b.day.localeCompare(a.day));
}

export default function TimelinePage() {
  const { couple } = useCouple();
  const [entries] = useLoader(fetchTimeline);

  const years = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries?.forEach((e) => {
      const year = e.day.slice(0, 4);
      map.set(year, [...(map.get(year) ?? []), e]);
    });
    return [...map.entries()];
  }, [entries]);

  return (
    <div>
      <SubPageHeader title="Nossa história" subtitle={`Desde ${formatDay(couple.together_since)}`} />

      {entries === null ? (
        <Spinner />
      ) : (
        <>
          {entries.length === 0 && (
            <EmptyState
              icon={<Milestone className="size-6" />}
              title="A história está começando"
              text="Momentos do calendário e fotos marcadas com estrela no álbum aparecem aqui."
            />
          )}
          <div className="relative">
            <div className="absolute top-2 bottom-2 left-[1.2rem] border-l-2 border-dashed border-rose-wave" aria-hidden />
            {years.map(([year, items]) => (
              <section key={year} className="relative mb-6">
                <h2 className="relative mb-4 inline-block -rotate-3 bg-[rgba(229,168,170,.62)] px-4 py-0.5 font-serif text-[26px] text-ink italic">{year}</h2>
                <ul className="flex flex-col gap-4">
                  {items.map((entry, i) => (
                    <li key={entry.key} className="relative flex gap-3">
                      <span
                        className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f7f0e6] text-lg shadow-sticker"
                        style={{ rotate: `${STICKER_TILTS[i % STICKER_TILTS.length]}deg` }}
                      >
                        {entry.kind === "moment" ? entry.moment.emoji : "⭐"}
                      </span>
                      {entry.kind === "photo" ? (
                        <div className="min-w-0 flex-1 pt-1" style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}>
                          <Polaroid
                            src={entry.url}
                            alt={entry.photo.caption ?? ""}
                            caption={entry.photo.caption || formatDay(entry.day, "d 'de' MMMM")}
                            tape={i % 2 ? "sage" : "mustard"}
                            imgClassName="max-h-72"
                            className="max-w-xs"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1 rounded-[6px] bg-sheet p-4 shadow-paper" style={{ rotate: `${i % 2 ? 0.5 : -0.5}deg` }}>
                          <p className="font-hand text-lg leading-tight text-batom">{formatDay(entry.day, "d 'de' MMMM")}</p>
                          <p className="font-serif text-[22px] leading-tight text-ink">{entry.moment.title}</p>
                          {entry.moment.description && <p className="mt-0.5 font-hand text-xl leading-tight text-muted">{entry.moment.description}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="relative flex items-center gap-3">
              <WaxSeal size={42} className="z-10" />
              <div>
                <p className="font-serif text-[24px] leading-tight text-ink">
                  O começo de <em className="text-batom">tudo</em>
                </p>
                <p className="font-hand text-xl leading-tight text-muted">{formatDay(couple.together_since)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
