"use client";

import { ImagePlus, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  Button,
  EmojiPicker,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Sheet,
  Spinner,
  SubPageHeader,
  Tabs,
} from "@/components/ui";
import { formatDay, toDayString } from "@/lib/dates";
import { signedUrls, uploadPhoto } from "@/lib/photos";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Goal } from "@/lib/types";

const EMOJIS = ["🎯", "✈️", "🏔️", "🏖️", "🎢", "🍷", "🏃", "🎤", "🐶", "🏡", "💍", "🌎"];

type Draft = { id?: string; emoji: string; title: string; target_on: string };

async function fetchGoals(): Promise<{ goals: Goal[]; urls: Record<string, string> }> {
  const db = supabase();
  const { data } = await db.from("goals").select("*").order("created_at");
  const goals: Goal[] = data ?? [];
  const photoIds = goals.flatMap((g) => (g.photo_id ? [g.photo_id] : []));
  if (!photoIds.length) return { goals, urls: {} };
  const { data: photos } = await db.from("photos").select("id, storage_path").in("id", photoIds);
  const signed = await signedUrls((photos ?? []).map((p) => p.storage_path));
  const urls = Object.fromEntries((photos ?? []).flatMap((p) => (signed[p.storage_path] ? [[p.id, signed[p.storage_path]]] : [])));
  return { goals, urls };
}

export default function GoalsPage() {
  const [data, load] = useLoader(fetchGoals);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [realizing, setRealizing] = useState<Goal | null>(null);

  const goals = data?.goals ?? [];
  const open = goals.filter((g) => !g.done_on);
  const done = goals.filter((g) => g.done_on).sort((a, b) => b.done_on!.localeCompare(a.done_on!));
  const list = tab === "open" ? open : done;

  return (
    <div>
      <SubPageHeader
        title="Metas do casal"
        subtitle="Coisas para fazer juntos"
        action={
          <Button className="px-4" onClick={() => setDraft({ emoji: EMOJIS[0], title: "", target_on: "" })}>
            <Plus className="size-4" /> Meta
          </Button>
        }
      />

      {goals.length > 0 && (
        <div className="mb-5 rounded-3xl bg-white p-5 ring-1 ring-rose-100">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-stone-900">Progresso</p>
            <p className="text-sm text-stone-500">
              <span className="text-lg font-bold text-emerald-600">{done.length}</span> de {goals.length} realizadas
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done.length / goals.length) * 100}%` }} />
          </div>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: `A fazer (${open.length})` },
          { value: "done", label: `Realizadas (${done.length})` },
        ]}
      />

      {data === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === "open" ? <Target className="size-6" /> : <Trophy className="size-6" />}
          title={tab === "open" ? "Nenhuma meta por aqui" : "Nenhuma meta realizada ainda"}
          text={tab === "open" ? "Ver a aurora boreal, aprender a dançar, adotar um pet… o que vocês sonham fazer?" : "Quando realizarem uma meta, ela aparece aqui com foto."}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((goal) => (
            <li key={goal.id} className="overflow-hidden rounded-3xl bg-white ring-1 ring-rose-100">
              {goal.photo_id && data.urls[goal.photo_id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.urls[goal.photo_id]} alt="" className="h-44 w-full object-cover" />
              )}
              <div className="flex items-start gap-3 p-5">
                <span className="text-3xl">{goal.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">{goal.title}</p>
                  {goal.done_on ? (
                    <p className="text-sm text-emerald-700">Realizada em {formatDay(goal.done_on)} 🎉</p>
                  ) : (
                    goal.target_on && <p className="text-sm text-stone-500">Até {formatDay(goal.target_on)}</p>
                  )}
                </div>
                <button
                  onClick={() => setDraft({ id: goal.id, emoji: goal.emoji, title: goal.title, target_on: goal.target_on ?? "" })}
                  className="shrink-0 rounded-full p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Editar meta"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              {!goal.done_on && (
                <div className="px-5 pb-5">
                  <Button className="w-full" onClick={() => setRealizing(goal)}>
                    <Trophy className="size-4" /> Realizamos!
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {draft && <GoalSheet key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} onSaved={load} />}
      {realizing && <RealizeSheet goal={realizing} onClose={() => setRealizing(null)} onSaved={load} />}
    </div>
  );
}

function GoalSheet({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(draft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const values = { emoji: form.emoji, title: form.title.trim(), target_on: form.target_on || null };
    const table = supabase().from("goals");
    const { error } = form.id ? await table.update(values).eq("id", form.id) : await table.insert(values);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase().from("goals").delete().eq("id", form.id!);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={form.id ? "Editar meta" : "Nova meta"}>
      <form onSubmit={save} className="flex flex-col gap-5">
        <EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} options={EMOJIS} />
        <Field label="O que vocês querem fazer?">
          <Input required maxLength={120} placeholder="Ex: Ver a neve juntos" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Até quando? (opcional)">
          <Input type="date" value={form.target_on} onChange={(e) => setForm({ ...form, target_on: e.target.value })} />
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

function RealizeSheet({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => Promise<void> }) {
  const { couple } = useCouple();
  const [doneOn, setDoneOn] = useState(toDayString(new Date()));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const db = supabase();
      const photo = file ? await uploadPhoto(couple.id, file, { taken_on: doneOn, is_special: true, caption: goal.title }) : null;
      const { data: moment, error: momentErr } = await db
        .from("moments")
        .insert({ emoji: goal.emoji, title: goal.title, happened_on: doneOn, description: "Meta do casal realizada 🏆" })
        .select("id")
        .single();
      if (momentErr) throw momentErr;
      const { error } = await db
        .from("goals")
        .update({ done_on: doneOn, moment_id: moment.id, photo_id: photo?.id ?? null })
        .eq("id", goal.id);
      if (error) throw error;
      await onSaved();
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={`${goal.emoji} ${goal.title}`}>
      <form onSubmit={save} className="flex flex-col gap-5">
        <p className="text-sm text-stone-500">Parabéns! 🎉 A meta vira um momento no calendário, e a foto vai para o álbum como especial.</p>
        <Field label="Quando realizaram?">
          <Input type="date" required max={toDayString(new Date())} value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-rose-300 bg-rose-50/50 py-4 text-sm font-semibold text-rose-600">
          <ImagePlus className="size-5" />
          {file ? file.name : "Adicionar uma foto (opcional)"}
          <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>
          <Trophy className="size-4" /> Marcar como realizada
        </Button>
      </form>
    </Sheet>
  );
}
