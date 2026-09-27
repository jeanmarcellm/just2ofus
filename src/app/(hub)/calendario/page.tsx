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
import { Button, Card, ErrorText, Field, Input, PageHeader, Sheet, Textarea } from "@/components/ui";
import { formatDay, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { DatePlan, Moment } from "@/lib/types";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const EMOJIS = ["❤️", "🥂", "🍕", "✈️", "🎬", "🏖️", "🎂", "💍", "🎁", "🌙", "🎶", "🐾"];

type Draft = { id?: string; emoji: string; title: string; happened_on: string; description: string };

export default function CalendarPage() {
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
    const [m, d] = await Promise.all([
      db.from("moments").select("*").gte("happened_on", from).lte("happened_on", to).order("happened_on"),
      db
        .from("date_plans")
        .select("*")
        .neq("status", "cancelled")
        .gte("scheduled_at", startOfDay(days[0]).toISOString())
        .lte("scheduled_at", endOfDay(days[days.length - 1]).toISOString())
        .order("scheduled_at"),
    ]);
    return { moments: (m.data ?? []) as Moment[], dates: (d.data ?? []) as DatePlan[] };
  }, [days]);
  const [range, load] = useLoader(fetchRange);
  const moments = useMemo(() => range?.moments ?? [], [range]);
  const dates = useMemo(() => range?.dates ?? [], [range]);

  const byDay = useMemo(() => {
    const map = new Map<string, { moments: Moment[]; dates: DatePlan[] }>();
    const get = (key: string) => map.get(key) ?? map.set(key, { moments: [], dates: [] }).get(key)!;
    moments.forEach((m) => get(m.happened_on).moments.push(m));
    dates.forEach((d) => get(toDayString(parseISO(d.scheduled_at))).dates.push(d));
    return map;
  }, [moments, dates]);

  const today = toDayString(new Date());
  const selectedItems = byDay.get(selected);

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="As coisas que vocês viveram juntos"
        action={
          <Button
            className="px-4"
            onClick={() => setDraft({ emoji: "❤️", title: "", happened_on: selected, description: "" })}
          >
            <Plus className="size-4" /> Momento
          </Button>
        }
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonth((m) => addMonths(m, -1))} className="rounded-full p-2 hover:bg-rose-50" aria-label="Mês anterior">
            <ChevronLeft className="size-5 text-stone-600" />
          </button>
          <p className="font-semibold capitalize text-stone-900">{format(month, "MMMM yyyy", { locale: ptBR })}</p>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-full p-2 hover:bg-rose-50" aria-label="Próximo mês">
            <ChevronRight className="size-5 text-stone-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-400">
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
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition ${
                  isSelected
                    ? "bg-rose-500 font-bold text-white"
                    : key === today
                      ? "font-bold text-rose-600 ring-1 ring-rose-200"
                      : isSameMonth(day, month)
                        ? "text-stone-700 hover:bg-rose-50"
                        : "text-stone-300"
                }`}
              >
                {day.getDate()}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {!!items?.moments.length && <span className={`size-1.5 rounded-full ${isSelected ? "bg-white" : "bg-rose-400"}`} />}
                  {!!items?.dates.length && <span className={`size-1.5 rounded-full ${isSelected ? "bg-violet-200" : "bg-violet-400"}`} />}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold capitalize text-stone-900">{formatDay(selected, "EEEE, d 'de' MMMM")}</h2>
        {!selectedItems?.moments.length && !selectedItems?.dates.length ? (
          <p className="rounded-2xl border border-dashed border-rose-200 p-5 text-center text-sm text-stone-500">
            Nada registrado neste dia.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {selectedItems?.moments.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() =>
                    setDraft({ id: m.id, emoji: m.emoji, title: m.title, happened_on: m.happened_on, description: m.description ?? "" })
                  }
                  className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-rose-100"
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-stone-900">{m.title}</span>
                    {m.description && <span className="mt-0.5 block text-sm text-stone-500">{m.description}</span>}
                  </span>
                </button>
              </li>
            ))}
            {selectedItems?.dates.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                <Wine className="size-5 text-violet-500" />
                <span>
                  <span className="block font-semibold text-violet-900">{d.title}</span>
                  <span className="text-sm text-violet-700">
                    {d.status === "done" ? "Date realizado" : `Date às ${format(parseISO(d.scheduled_at), "HH:mm")}`}
                  </span>
                </span>
              </li>
            ))}
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
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setForm({ ...form, emoji })}
              className={`flex size-11 items-center justify-center rounded-2xl text-xl transition ${
                form.emoji === emoji ? "bg-rose-100 ring-2 ring-rose-400" : "bg-stone-50"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <Field label="O que vocês fizeram?">
          <Input required placeholder="Ex: Primeiro show juntos" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
          <Button type="submit" className="flex-1" loading={busy}>Salvar</Button>
        </div>
      </form>
    </Sheet>
  );
}
