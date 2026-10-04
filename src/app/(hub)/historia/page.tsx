"use client";

import { Milestone } from "lucide-react";
import { useMemo } from "react";
import { useCouple } from "@/components/auth-provider";
import { EmptyState, Spinner, SubPageHeader } from "@/components/ui";
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
            <div className="absolute top-2 bottom-2 left-[1.15rem] w-0.5 bg-rose-100" aria-hidden />
            {years.map(([year, items]) => (
              <section key={year} className="relative mb-6">
                <h2 className="relative mb-3 ml-0 inline-flex rounded-full bg-rose-500 px-3 py-1 text-sm font-bold text-white">{year}</h2>
                <ul className="flex flex-col gap-3">
                  {items.map((entry) => (
                    <li key={entry.key} className="relative flex gap-3">
                      <span className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg ring-2 ring-rose-100">
                        {entry.kind === "moment" ? entry.moment.emoji : "⭐"}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white ring-1 ring-rose-100">
                        {entry.kind === "photo" && entry.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.url} alt={entry.photo.caption ?? ""} loading="lazy" className="max-h-72 w-full object-cover" />
                        )}
                        <div className="p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{formatDay(entry.day, "d 'de' MMMM")}</p>
                          {entry.kind === "moment" ? (
                            <>
                              <p className="font-semibold text-stone-900">{entry.moment.title}</p>
                              {entry.moment.description && <p className="mt-0.5 text-sm text-stone-500">{entry.moment.description}</p>}
                            </>
                          ) : (
                            <p className="text-stone-700">{entry.photo.caption || "Momento especial"}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="relative flex items-center gap-3">
              <span className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-lg text-white">💞</span>
              <div>
                <p className="font-bold text-stone-900">O começo de tudo</p>
                <p className="text-sm text-stone-500">{formatDay(couple.together_since)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
