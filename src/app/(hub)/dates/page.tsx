"use client";

import { format, isPast, parseISO } from "date-fns";
import { Check, Lightbulb, MapPin, Pencil, Plus, Trash2, Wine, X } from "lucide-react";
import { useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Sheet,
  Spinner,
  Tabs,
  Textarea,
} from "@/components/ui";
import { formatDateTime, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { DatePlan } from "@/lib/types";

const IDEAS = [
  { title: "Piquenique no parque", location: "Parque mais próximo" },
  { title: "Noite de fondue em casa", location: "Em casa" },
  { title: "Cinema + pipoca doce", location: "Cinema" },
  { title: "Aula de dança juntos", location: "" },
  { title: "Ver o pôr do sol", location: "Mirante" },
  { title: "Cozinhar uma receita nova", location: "Em casa" },
  { title: "Noite de jogos de tabuleiro", location: "Em casa" },
  { title: "Jantar num restaurante novo", location: "" },
  { title: "Trilha leve de manhã", location: "" },
  { title: "Tour de cafeterias", location: "Centro" },
  { title: "Karaokê", location: "" },
  { title: "Maratona de filmes com tema", location: "Em casa" },
];

type Draft = { id?: string; title: string; when: string; location: string; notes: string };

async function fetchPlans(): Promise<DatePlan[]> {
  const { data } = await supabase().from("date_plans").select("*").order("scheduled_at");
  return data ?? [];
}

const toInputValue = (iso: string) => format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

export default function DatesPage() {
  const { profile, partner } = useCouple();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [plans, load] = useLoader(fetchPlans);

  async function markDone(plan: DatePlan) {
    setBusyId(plan.id);
    const db = supabase();
    const { data: moment } = await db
      .from("moments")
      .insert({
        emoji: "🥂",
        title: plan.title,
        happened_on: toDayString(parseISO(plan.scheduled_at)),
        description: [plan.location, plan.notes].filter(Boolean).join(" · ") || null,
      })
      .select("id")
      .single();
    await db.from("date_plans").update({ status: "done", moment_id: moment?.id ?? null }).eq("id", plan.id);
    await load();
    setBusyId(null);
  }

  async function setCancelled(plan: DatePlan) {
    setBusyId(plan.id);
    await supabase().from("date_plans").update({ status: "cancelled" }).eq("id", plan.id);
    await load();
    setBusyId(null);
  }

  async function remove(plan: DatePlan) {
    setBusyId(plan.id);
    await supabase().from("date_plans").delete().eq("id", plan.id);
    await load();
    setBusyId(null);
  }

  const authorName = (id: string) => (id === profile.id ? "você" : partner?.display_name ?? "seu par");
  const upcoming = plans?.filter((p) => p.status === "planned") ?? [];
  const history = [...(plans?.filter((p) => p.status !== "planned") ?? [])].reverse();
  const list = tab === "upcoming" ? upcoming : history;

  return (
    <div>
      <PageHeader
        title="Dates"
        subtitle="Planejem os próximos encontros"
        action={
          <Button className="px-4" onClick={() => setDraft({ title: "", when: "", location: "", notes: "" })}>
            <Plus className="size-4" /> Date
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: `Próximos (${upcoming.length})` },
          { value: "history", label: "Histórico" },
        ]}
      />

      {plans === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Wine className="size-6" />}
          title={tab === "upcoming" ? "Nenhum date marcado" : "Nenhum date no histórico"}
          text={tab === "upcoming" ? "Marquem algo especial — sem ideias? Temos sugestões." : "Dates realizados ou cancelados aparecem aqui."}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((plan) => {
            const overdue = plan.status === "planned" && isPast(parseISO(plan.scheduled_at));
            return (
              <li key={plan.id} className="rounded-3xl bg-white p-5 ring-1 ring-rose-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900">{plan.title}</p>
                    <p className="text-sm capitalize text-stone-500">{formatDateTime(plan.scheduled_at)}</p>
                    {plan.location && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                        <MapPin className="size-4 shrink-0" /> {plan.location}
                      </p>
                    )}
                    {plan.notes && <p className="mt-2 text-sm text-stone-600">{plan.notes}</p>}
                    <p className="mt-2 text-xs text-stone-400">Planejado por {authorName(plan.created_by)}</p>
                  </div>
                  {plan.status !== "planned" && (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {plan.status === "done" ? "Realizado" : "Cancelado"}
                    </span>
                  )}
                </div>

                {plan.status === "planned" ? (
                  <>
                    {overdue && (
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Esse dia já passou. Como foi? Marque como realizado para virar um momento no calendário.
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button className="flex-1" onClick={() => markDone(plan)} loading={busyId === plan.id}>
                        <Check className="size-4" /> Realizado
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label="Editar"
                        onClick={() =>
                          setDraft({
                            id: plan.id,
                            title: plan.title,
                            when: toInputValue(plan.scheduled_at),
                            location: plan.location ?? "",
                            notes: plan.notes ?? "",
                          })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="danger" aria-label="Cancelar date" onClick={() => setCancelled(plan)} disabled={busyId === plan.id}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => remove(plan)}
                    disabled={busyId === plan.id}
                    className="mt-3 flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" /> Remover do histórico
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {draft && <DateSheet key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} onSaved={load} />}
    </div>
  );
}

function DateSheet({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(draft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function suggest() {
    const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
    setForm((f) => ({ ...f, title: idea.title, location: idea.location }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const values = {
      title: form.title.trim(),
      scheduled_at: new Date(form.when).toISOString(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    };
    const table = supabase().from("date_plans");
    const { error } = form.id ? await table.update(values).eq("id", form.id) : await table.insert(values);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={form.id ? "Editar date" : "Novo date"}>
      <form onSubmit={save} className="flex flex-col gap-5">
        {!form.id && (
          <button
            type="button"
            onClick={suggest}
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100"
          >
            <Lightbulb className="size-4" /> Sem ideias? Sortear uma sugestão
          </button>
        )}
        <Field label="O que vão fazer?">
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Quando?">
          <Input type="datetime-local" required value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} />
        </Field>
        <Field label="Onde? (opcional)">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        <Field label="Observações (opcional)">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>Salvar</Button>
      </form>
    </Sheet>
  );
}
