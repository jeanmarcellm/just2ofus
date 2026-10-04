"use client";

import { PartyPopper, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  Button,
  Checkbox,
  EmojiPicker,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Sheet,
  Spinner,
  SubPageHeader,
} from "@/components/ui";
import { daysLeftLabel, formatDay } from "@/lib/dates";
import { fetchSpecialDates, upcoming, withAnniversary, yearsLabel, type UpcomingDate } from "@/lib/special-dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";

const EMOJIS = ["🎉", "🎂", "💍", "💋", "💐", "🏠", "✈️", "🐾", "👶", "🎓", "⭐", "❤️"];

type Draft = { id?: string; emoji: string; title: string; day: string; yearly: boolean };

export default function SpecialDatesPage() {
  const { couple } = useCouple();
  const [dates, load] = useLoader(fetchSpecialDates);
  const [draft, setDraft] = useState<Draft | null>(null);

  const all = useMemo(
    () => (dates ? upcoming(withAnniversary(dates, couple.together_since), new Date()) : null),
    [dates, couple.together_since],
  );
  const next = all?.filter((d) => d.daysLeft >= 0) ?? [];
  const past = all?.filter((d) => d.daysLeft < 0).reverse() ?? [];

  return (
    <div>
      <SubPageHeader
        title="Datas especiais"
        subtitle="Para nunca esquecer o que importa"
        action={
          <Button className="px-4" onClick={() => setDraft({ emoji: EMOJIS[0], title: "", day: "", yearly: true })}>
            <Plus className="size-4" /> Data
          </Button>
        }
      />

      {all === null ? (
        <Spinner />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {next.map((d) => (
              <DateRow
                key={d.id}
                date={d}
                onEdit={d.builtIn ? undefined : () => setDraft({ id: d.id, emoji: d.emoji, title: d.title, day: d.day, yearly: d.yearly })}
              />
            ))}
          </ul>
          {dates?.length === 0 && (
            <EmptyState
              icon={<PartyPopper className="size-6" />}
              title="Adicione suas datas"
              text="Aniversário de cada um, primeiro beijo, pedido de namoro, casamento… O app avisa quanto falta."
            />
          )}
          {past.length > 0 && (
            <>
              <h2 className="mt-6 mb-3 text-sm font-semibold text-stone-500">Já passaram</h2>
              <ul className="flex flex-col gap-3 opacity-70">
                {past.map((d) => (
                  <DateRow
                    key={d.id}
                    date={d}
                    onEdit={() => setDraft({ id: d.id, emoji: d.emoji, title: d.title, day: d.day, yearly: d.yearly })}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {draft && <DateSheet key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} onSaved={load} />}
    </div>
  );
}

function DateRow({ date, onEdit }: { date: UpcomingDate; onEdit?: () => void }) {
  const years = yearsLabel(date);
  const soon = date.daysLeft >= 0 && date.daysLeft <= 7;
  const content = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl">{date.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-stone-900">{date.title}</span>
        <span className="flex items-center gap-1 text-sm text-stone-500">
          {formatDay(date.next, "d 'de' MMMM")}
          {date.yearly && <Repeat className="size-3.5" aria-label="Todo ano" />}
          {years && <span>· {years}</span>}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          soon ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600"
        }`}
      >
        {daysLeftLabel(date.daysLeft)}
      </span>
    </>
  );
  return (
    <li>
      {onEdit ? (
        <button onClick={onEdit} className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-rose-100">
          {content}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-rose-100">{content}</div>
      )}
    </li>
  );
}

function DateSheet({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(draft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const values = { emoji: form.emoji, title: form.title.trim(), day: form.day, yearly: form.yearly };
    const table = supabase().from("special_dates");
    const { error } = form.id ? await table.update(values).eq("id", form.id) : await table.insert(values);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase().from("special_dates").delete().eq("id", form.id!);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={form.id ? "Editar data" : "Nova data especial"}>
      <form onSubmit={save} className="flex flex-col gap-5">
        <EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} options={EMOJIS} />
        <Field label="Nome">
          <Input required maxLength={80} placeholder="Ex: Aniversário da Ana" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Data" hint="Para aniversários, use a data de nascimento: o app calcula a idade.">
          <Input type="date" required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
        </Field>
        <Checkbox checked={form.yearly} onChange={(yearly) => setForm({ ...form, yearly })} label="Repete todo ano" />
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
