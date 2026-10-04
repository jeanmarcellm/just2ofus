"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Wine } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Button, Card, EmojiPicker, ErrorText, Field, Input, PageHeader, Sheet, Textarea } from "@/components/ui";
import { formatDay, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import { withAnniversary } from "@/lib/special-dates";
import type { DatePlan, Moment, Mood, SpecialDate } from "@/lib/types";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const EMOJIS = ["❤️", "🥂", "🍕", "✈️", "🎬", "🏖️", "🎂", "💍", "🎁", "🌙", "🎶", "🐾"];

type Draft = { id?: string; emoji: string; title: string; happened_on: string; description: string };

type DayItems = { moments: Moment[]; dates: DatePlan[]; special: (SpecialDate & { years: number })[]; moods: Mood[] };

export default function CalendarPage() {
  const { userId, partner, couple } = useCouple();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => toDayString(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) }),
    [month],
  );

  const fetchRange = useCallback(async () => {
    const from = toDayString(days[0]);
    const to = toDayString(days[days.length - 1]);
    const db = supabase();
    const [m, d, s, md] = await Promise.all([
      db.from("moments").select("*").gte("happened_on", from).lte("happened_on", to).order("happened_on"),
      db
        .from("date_plans")
        .select("*")
        .neq("status", "cancelled")
        .gte("scheduled_at", startOfDay(days[0]).toISOString())
        .lte("scheduled_at", endOfDay(days[days.length - 1]).toISOString())
        .order("scheduled_at"),
      db.from("special_dates").select("id, title, emoji, day, yearly"),
      db.from("moods").select("user_id, day, emoji, note").gte("day", from).lte("day", to),
    ]);
    return {
      moments: (m.data ?? []) as Moment[],
      dates: (d.data ?? []) as DatePlan[],
      special: (s.data ?? []) as SpecialDate[],
      moods: (md.data ?? []) as Mood[],
    };
  }, [days]);
  const [range, load] = useLoader(fetchRange);
  const moments = useMemo(() => range?.moments ?? [], [range]);
  const dates = useMemo(() => range?.dates ?? [], [range]);

  const byDay = useMemo(() => {
    const map = new Map<string, DayItems>();
    const get = (key: string) => map.get(key) ?? map.set(key, { moments: [], dates: [], special: [], moods: [] }).get(key)!;
    moments.forEach((m) => get(m.happened_on).moments.push(m));
    dates.forEach((d) => get(toDayString(parseISO(d.scheduled_at))).dates.push(d));
    range?.moods.forEach((m) => get(m.day).moods.push(m));
    // yearly dates land on the same month/day every year from the original one on
    const special = withAnniversary(range?.special ?? [], couple.together_since);
    days.forEach((day) => {
      const key = toDayString(day);
      special.forEach((sd) => {
        const years = day.getFullYear() - Number(sd.day.slice(0, 4));
        if (sd.yearly ? years >= 0 && sd.day.slice(5) === key.slice(5) : sd.day === key) {
          get(key).special.push({ ...sd, years });
        }
      });
    });
    return map;
  }, [moments, dates, range, days, couple.together_since]);

  const today = toDayString(new Date());
  const selectedItems = byDay.get(selected);

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="as coisas que vocês viveram juntos"
        action={
          <Button
            className="px-4"
            onClick={() => setDraft({ emoji: "❤️", title: "", happened_on: selected, description: "" })}
          >
            <Plus className="size-4" /> Momento
          </Button>
        }
      />

      <Card tape="sage" tilt={-0.4} className="p-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonth((m) => addMonths(m, -1))} className="rounded-full p-2 hover:bg-kraft" aria-label="Mês anterior">
            <ChevronLeft className="size-5 text-muted" />
          </button>
          <p className="font-serif text-[26px] leading-none text-ink capitalize">{format(month, "MMMM", { locale: ptBR })} <em className="text-batom">{format(month, "yyyy")}</em></p>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-full p-2 hover:bg-kraft" aria-label="Próximo mês">
            <ChevronRight className="size-5 text-muted" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center font-hand text-lg text-terracota">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const key = toDayString(day);
            const items = byDay.get(key);
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex aspect-square flex-col items-center justify-center rounded-full text-sm tabular-nums transition ${
                  isSelected
                    ? "bg-batom font-bold text-sheet shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]"
                    : key === today
                      ? "font-bold text-batom outline outline-[1.5px] outline-dashed outline-rose-line"
                      : isSameMonth(day, month)
                        ? "text-ink hover:bg-kraft"
                        : "text-faint"
                }`}
              >
                {day.getDate()}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {!!items?.moments.length && <span className={`size-1.5 rounded-full ${isSelected ? "bg-sheet" : "bg-batom"}`} />}
                  {!!items?.dates.length && <span className={`size-1.5 rounded-full ${isSelected ? "bg-sage-soft" : "bg-sage"}`} />}
                  {!!items?.special.length && <span className={`size-1.5 rounded-full ${isSelected ? "bg-[#ecd696]" : "bg-mustard"}`} />}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 font-serif text-[26px] leading-tight text-ink first-letter:uppercase">{formatDay(selected, "EEEE, d 'de' MMMM")}</h2>
        {!selectedItems?.moments.length && !selectedItems?.dates.length && !selectedItems?.special.length && !selectedItems?.moods.length ? (
          <p className="rounded-[6px] border-[1.5px] border-dashed border-line p-5 text-center font-hand text-xl text-muted">
            Nada registrado neste dia.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {selectedItems?.special.map((sd) => (
              <li key={sd.id} className="flex items-center gap-3 rounded-[6px] bg-[#faf3e0] p-4 shadow-paper">
                <span className="text-2xl">{sd.emoji}</span>
                <span>
                  <span className="block font-serif text-xl leading-tight text-[#7a5a22]">{sd.title}</span>
                  {sd.yearly && sd.years > 0 && (
                    <span className="font-hand text-lg text-[#7a5a22]">{sd.years} {sd.years === 1 ? "ano" : "anos"}</span>
                  )}
                </span>
              </li>
            ))}
            {selectedItems?.moments.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() =>
                    setDraft({ id: m.id, emoji: m.emoji, title: m.title, happened_on: m.happened_on, description: m.description ?? "" })
                  }
                  className="flex w-full items-start gap-3 rounded-[6px] bg-sheet p-4 text-left shadow-paper"
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="min-w-0">
                    <span className="block font-serif text-xl leading-tight text-ink">{m.title}</span>
                    {m.description && <span className="mt-0.5 block font-hand text-xl leading-tight text-muted">{m.description}</span>}
                  </span>
                </button>
              </li>
            ))}
            {selectedItems?.dates.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-[6px] bg-sage-soft/60 p-4 shadow-paper">
                <Wine className="size-5 text-sage-ink" />
                <span>
                  <span className="block font-serif text-xl leading-tight text-sage-ink">{d.title}</span>
                  <span className="text-sm text-sage-ink">
                    {d.status === "done" ? "Date realizado" : `Date às ${format(parseISO(d.scheduled_at), "HH:mm")}`}
                  </span>
                </span>
              </li>
            ))}
            {!!selectedItems?.moods.length && (
              <li className="flex flex-col gap-2 rounded-[6px] bg-sheet p-4 shadow-paper">
                <span className="text-xs font-semibold tracking-[.14em] text-terracota uppercase">Humor do dia</span>
                {selectedItems.moods.map((mood) => (
                  <span key={mood.user_id} className="flex items-center gap-2 font-hand text-xl leading-tight text-muted">
                    <span className="text-xl">{mood.emoji}</span>
                    <span className="font-semibold text-ink">
                      {mood.user_id === userId ? "Você" : partner?.display_name ?? "Seu par"}
                    </span>
                    {mood.note && <span className="min-w-0">· {mood.note}</span>}
                  </span>
                ))}
              </li>
            )}
          </ul>
        )}
      </section>

      {draft && (
        <MomentSheet key={draft.id ?? `new-${draft.happened_on}`} draft={draft} onClose={() => setDraft(null)} onSaved={load} />
      )}
    </div>
  );
}

function MomentSheet({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const values = {
      emoji: form.emoji,
      title: form.title.trim(),
      happened_on: form.happened_on,
      description: form.description.trim() || null,
    };
    const db = supabase().from("moments");
    const { error } = form.id ? await db.update(values).eq("id", form.id) : await db.insert(values);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  async function remove() {
    if (!form.id) return;
    setBusy(true);
    const { error } = await supabase().from("moments").delete().eq("id", form.id);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={form.id ? "Editar momento" : "Novo momento"}>
      <form onSubmit={save} className="flex flex-col gap-5">
        <EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} options={EMOJIS} />
        <Field label="O que vocês fizeram?">
          <Input required placeholder="ex: primeiro show juntos" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Quando?">
          <Input type="date" required value={form.happened_on} onChange={(e) => setForm({ ...form, happened_on: e.target.value })} />
        </Field>
        <Field label="Detalhes (opcional)">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          {form.id && (
            <Button type="button" variant="danger" onClick={remove} disabled={busy} aria-label="Excluir">
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button type="submit" className="flex-1" loading={busy}>Guardar no diário</Button>
        </div>
      </form>
    </Sheet>
  );
}
