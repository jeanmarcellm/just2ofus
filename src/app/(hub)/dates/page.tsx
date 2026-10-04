"use client";

import { format, isPast, parseISO } from "date-fns";
import { Check, Dices, Lightbulb, MapPin, Pencil, Plus, Trash2, Wine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import type { DateIdea, DateIdeaBudget, DateIdeaSetting, DatePlan } from "@/lib/types";

type Idea = Pick<DateIdea, "title" | "location" | "setting" | "budget"> & { id?: string };

const IDEAS: Idea[] = [
  { title: "Piquenique no parque", location: "Parque mais próximo", setting: "out", budget: "low" },
  { title: "Noite de fondue em casa", location: "Em casa", setting: "home", budget: "medium" },
  { title: "Cinema + pipoca doce", location: "Cinema", setting: "out", budget: "medium" },
  { title: "Aula de dança juntos", location: null, setting: "out", budget: "medium" },
  { title: "Ver o pôr do sol", location: "Mirante", setting: "out", budget: "low" },
  { title: "Cozinhar uma receita nova", location: "Em casa", setting: "home", budget: "low" },
  { title: "Noite de jogos de tabuleiro", location: "Em casa", setting: "home", budget: "low" },
  { title: "Jantar num restaurante novo", location: null, setting: "out", budget: "high" },
  { title: "Trilha leve de manhã", location: null, setting: "out", budget: "low" },
  { title: "Tour de cafeterias", location: "Centro", setting: "out", budget: "medium" },
  { title: "Karaokê", location: null, setting: "out", budget: "medium" },
  { title: "Maratona de filmes com tema", location: "Em casa", setting: "home", budget: "low" },
  { title: "Spa caseiro com máscaras e massagem", location: "Em casa", setting: "home", budget: "low" },
  { title: "Noite de vinhos e queijos", location: "Em casa", setting: "home", budget: "high" },
  { title: "Fim de semana numa pousada", location: null, setting: "out", budget: "high" },
  { title: "Show ou teatro", location: null, setting: "out", budget: "high" },
];

const SETTINGS: { value: "all" | DateIdeaSetting; label: string }[] = [
  { value: "all", label: "Tanto faz" },
  { value: "home", label: "🏠 Em casa" },
  { value: "out", label: "🌆 Fora" },
];
const BUDGETS: { value: "all" | DateIdeaBudget; label: string }[] = [
  { value: "all", label: "Qualquer" },
  { value: "low", label: "$" },
  { value: "medium", label: "$$" },
  { value: "high", label: "$$$" },
];
const BUDGET_LABEL: Record<DateIdeaBudget, string> = { low: "$", medium: "$$", high: "$$$" };

type Draft = { id?: string; title: string; when: string; location: string; notes: string };

async function fetchPlans(): Promise<DatePlan[]> {
  const { data } = await supabase().from("date_plans").select("*").order("scheduled_at");
  return data ?? [];
}

const toInputValue = (iso: string) => format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

export default function DatesPage() {
  const { profile, partner } = useCouple();
  const [tab, setTab] = useState<"upcoming" | "history" | "ideas">("upcoming");
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
          { value: "ideas", label: "Ideias" },
        ]}
      />

      {tab === "ideas" ? (
        <IdeasTab
          onSchedule={(idea) => setDraft({ title: idea.title, when: "", location: idea.location ?? "", notes: "" })}
        />
      ) : plans === null ? (
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
    setForm((f) => ({ ...f, title: idea.title, location: idea.location ?? "" }));
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

async function fetchIdeas(): Promise<DateIdea[]> {
  const { data } = await supabase().from("date_ideas").select("*").order("created_at");
  return data ?? [];
}

function IdeasTab({ onSchedule }: { onSchedule: (idea: Idea) => void }) {
  const [custom, load] = useLoader(fetchIdeas);
  const [setting, setSetting] = useState<"all" | DateIdeaSetting>("all");
  const [budget, setBudget] = useState<"all" | DateIdeaBudget>("all");
  const [shown, setShown] = useState<Idea | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [adding, setAdding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pool = [...(custom ?? []), ...IDEAS].filter(
    (i) => (setting === "all" || i.setting === setting) && (budget === "all" || i.budget === budget),
  );

  // flick through a few random ideas, slowing down, then land on one
  function spin() {
    if (!pool.length) return;
    setSpinning(true);
    let step = 0;
    const tick = () => {
      setShown(pool[Math.floor(Math.random() * pool.length)]);
      step += 1;
      if (step < 14) timer.current = setTimeout(tick, 50 + step * 15);
      else setSpinning(false);
    };
    tick();
  }

  async function remove(idea: DateIdea) {
    await supabase().from("date_ideas").delete().eq("id", idea.id);
    await load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl bg-white p-5 ring-1 ring-rose-100">
        <p className="mb-2 text-sm font-medium text-stone-700">Onde?</p>
        <Chips value={setting} onChange={setSetting} options={SETTINGS} />
        <p className="mt-4 mb-2 text-sm font-medium text-stone-700">Quanto gastar?</p>
        <Chips value={budget} onChange={setBudget} options={BUDGETS} />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-gradient-to-br from-violet-500 to-rose-500 p-6 text-center text-white shadow-lg shadow-rose-500/30">
        <p className={`min-h-14 text-xl font-bold leading-snug transition ${spinning ? "opacity-70 blur-[1px]" : ""}`}>
          {shown ? shown.title : pool.length ? "Gire a roleta e deixem a sorte escolher!" : "Nenhuma ideia com esses filtros."}
        </p>
        {shown && !spinning && (
          <p className="-mt-2 text-sm text-rose-100">
            {shown.setting === "home" ? "Em casa" : "Fora"} · {BUDGET_LABEL[shown.budget]}
            {shown.location && shown.location !== "Em casa" ? ` · ${shown.location}` : ""}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={spin} disabled={spinning || !pool.length}>
            <Dices className="size-4" /> {shown ? "Girar de novo" : "Girar"}
          </Button>
          {shown && !spinning && (
            <Button variant="secondary" onClick={() => onSchedule(shown)}>
              Agendar
            </Button>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Ideias de vocês</h2>
          <Button variant="ghost" className="px-3" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Ideia
          </Button>
        </div>
        {custom === null ? (
          <Spinner className="py-6" />
        ) : custom.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-rose-200 p-5 text-center text-sm text-stone-500">
            Salvem as ideias que surgirem: elas entram na roleta junto com as {IDEAS.length} sugestões do app.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {custom.map((idea) => (
              <li key={idea.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-rose-100">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-stone-900">{idea.title}</span>
                  <span className="text-xs text-stone-500">
                    {idea.setting === "home" ? "Em casa" : "Fora"} · {BUDGET_LABEL[idea.budget]}
                    {idea.location ? ` · ${idea.location}` : ""}
                  </span>
                </span>
                <button onClick={() => remove(idea)} className="rounded-full p-1 text-stone-300 hover:text-red-600" aria-label="Remover ideia">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && <IdeaSheet onClose={() => setAdding(false)} onSaved={load} />}
    </div>
  );
}

function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-rose-500 text-white" : "bg-stone-50 text-stone-600 ring-1 ring-stone-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IdeaSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [setting, setSetting] = useState<DateIdeaSetting>("out");
  const [budget, setBudget] = useState<DateIdeaBudget>("low");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase()
      .from("date_ideas")
      .insert({ title: title.trim(), location: location.trim() || null, setting, budget });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Nova ideia de date">
      <form onSubmit={save} className="flex flex-col gap-5">
        <Field label="Ideia">
          <Input required maxLength={120} placeholder="Ex: Andar de bicicleta na orla" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Onde? (opcional)">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Em casa ou fora?</p>
          <Chips value={setting} onChange={setSetting} options={SETTINGS.filter((o) => o.value !== "all") as { value: DateIdeaSetting; label: string }[]} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Custo</p>
          <Chips value={budget} onChange={setBudget} options={BUDGETS.filter((o) => o.value !== "all") as { value: DateIdeaBudget; label: string }[]} />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>Salvar ideia</Button>
      </form>
    </Sheet>
  );
}
