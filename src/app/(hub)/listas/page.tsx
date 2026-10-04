"use client";

import { parseISO } from "date-fns";
import { CalendarHeart, Check, ChevronLeft, ListChecks, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
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
} from "@/components/ui";
import { toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { List, ListItem } from "@/lib/types";

const TEMPLATES = [
  { emoji: "🎬", title: "Filmes e séries" },
  { emoji: "🍽️", title: "Restaurantes" },
  { emoji: "✈️", title: "Viagens" },
  { emoji: "🛒", title: "Compras" },
];
const EMOJIS = ["📝", "🎬", "🍽️", "✈️", "🛒", "📚", "🎁", "🏠", "🎵", "🌱"];

type ListWithCounts = List & { total: number; done: number };

async function fetchLists(): Promise<ListWithCounts[]> {
  const db = supabase();
  const [l, i] = await Promise.all([
    db.from("lists").select("*").order("created_at"),
    db.from("list_items").select("list_id, done"),
  ]);
  const items = (i.data ?? []) as Pick<ListItem, "list_id" | "done">[];
  return ((l.data ?? []) as List[]).map((list) => {
    const own = items.filter((x) => x.list_id === list.id);
    return { ...list, total: own.length, done: own.filter((x) => x.done).length };
  });
}

export default function ListsPage() {
  const [lists, load] = useLoader(fetchLists);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const open = lists?.find((l) => l.id === openId);
  if (open) return <ListDetail list={open} onBack={() => { setOpenId(null); void load(); }} onDeleted={async () => { setOpenId(null); await load(); }} />;

  return (
    <div>
      <SubPageHeader
        title="Listas"
        subtitle="Tudo o que vocês querem fazer, ver e comprar"
        action={
          <Button className="px-4" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Lista
          </Button>
        }
      />

      {lists === null ? (
        <Spinner />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title="Nenhuma lista ainda"
          text="Comece por uma destas ou crie a sua."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {TEMPLATES.map((t) => (
                <TemplateButton key={t.title} {...t} onCreated={load} />
              ))}
            </div>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {lists.map((list) => (
            <li key={list.id}>
              <button onClick={() => setOpenId(list.id)} className="flex w-full flex-col items-start rounded-3xl bg-white p-4 text-left ring-1 ring-rose-100">
                <span className="text-3xl">{list.emoji}</span>
                <span className="mt-2 font-semibold text-stone-900">{list.title}</span>
                <span className="text-xs text-stone-500">
                  {list.total === 0 ? "Vazia" : `${list.done} de ${list.total} feitos`}
                </span>
                {list.total > 0 && (
                  <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rose-100">
                    <span className="block h-full rounded-full bg-rose-400" style={{ width: `${(list.done / list.total) * 100}%` }} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <NewListSheet onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  );
}

function TemplateButton({ emoji, title, onCreated }: { emoji: string; title: string; onCreated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await supabase().from("lists").insert({ emoji, title });
        await onCreated();
      }}
    >
      {emoji} {title}
    </Button>
  );
}

function NewListSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase().from("lists").insert({ emoji, title: title.trim() });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Nova lista">
      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => {
                setEmoji(t.emoji);
                setTitle(t.title);
              }}
              className="rounded-full bg-stone-50 px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200"
            >
              {t.emoji} {t.title}
            </button>
          ))}
        </div>
        <EmojiPicker value={emoji} onChange={setEmoji} options={EMOJIS} />
        <Field label="Nome da lista">
          <Input required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>Criar lista</Button>
      </form>
    </Sheet>
  );
}

function ListDetail({ list, onBack, onDeleted }: { list: List; onBack: () => void; onDeleted: () => Promise<void> }) {
  const { userId } = useCouple();
  const fetchItems = useCallback(async (): Promise<ListItem[]> => {
    const { data } = await supabase().from("list_items").select("*").eq("list_id", list.id).order("created_at");
    return data ?? [];
  }, [list.id]);
  const [items, load] = useLoader(fetchItems);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setAdding(true);
    await supabase().from("list_items").insert({ list_id: list.id, text: text.trim() });
    setText("");
    await load();
    setAdding(false);
  }

  async function toggle(item: ListItem) {
    setBusyId(item.id);
    const done = !item.done;
    await supabase()
      .from("list_items")
      .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? userId : null })
      .eq("id", item.id);
    await load();
    setBusyId(null);
  }

  async function remove(item: ListItem) {
    setBusyId(item.id);
    await supabase().from("list_items").delete().eq("id", item.id);
    await load();
    setBusyId(null);
  }

  async function toMoment(item: ListItem) {
    setBusyId(item.id);
    const db = supabase();
    const { data: moment } = await db
      .from("moments")
      .insert({
        emoji: list.emoji,
        title: item.text,
        happened_on: toDayString(item.done_at ? parseISO(item.done_at) : new Date()),
        description: `Da lista "${list.title}"`,
      })
      .select("id")
      .single();
    if (moment) await db.from("list_items").update({ moment_id: moment.id }).eq("id", item.id);
    await load();
    setBusyId(null);
  }

  async function deleteList() {
    await supabase().from("lists").delete().eq("id", list.id);
    await onDeleted();
  }

  const pending = items?.filter((i) => !i.done) ?? [];
  const done = items?.filter((i) => i.done) ?? [];

  return (
    <div>
      <header className="flex items-center gap-2 pb-5">
        <button onClick={onBack} className="-ml-2 rounded-full p-2 hover:bg-rose-50" aria-label="Voltar">
          <ChevronLeft className="size-5 text-stone-600" />
        </button>
        <span className="text-2xl">{list.emoji}</span>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight text-stone-900">{list.title}</h1>
      </header>

      <form onSubmit={add} className="mb-5 flex gap-2">
        <Input placeholder="Adicionar item…" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" className="shrink-0 px-4" loading={adding} aria-label="Adicionar">
          <Plus className="size-5" />
        </Button>
      </form>

      {items === null ? (
        <Spinner />
      ) : (
        <>
          {pending.length === 0 && done.length === 0 && (
            <p className="rounded-2xl border border-dashed border-rose-200 p-5 text-center text-sm text-stone-500">
              Lista vazia. Adicione o primeiro item acima.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {pending.map((item) => (
              <ItemRow key={item.id} item={item} busy={busyId === item.id} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
          {done.length > 0 && (
            <>
              <h2 className="mt-6 mb-2 text-sm font-semibold text-stone-500">Feitos ({done.length})</h2>
              <ul className="flex flex-col gap-2">
                {done.map((item) => (
                  <ItemRow key={item.id} item={item} busy={busyId === item.id} onToggle={toggle} onRemove={remove} onMoment={toMoment} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <div className="mt-10 flex justify-center">
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Manter</Button>
            <Button variant="danger" onClick={deleteList}>Apagar lista e itens</Button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-red-600">
            <Trash2 className="size-3.5" /> Apagar lista
          </button>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  busy,
  onToggle,
  onRemove,
  onMoment,
}: {
  item: ListItem;
  busy: boolean;
  onToggle: (item: ListItem) => void;
  onRemove: (item: ListItem) => void;
  onMoment?: (item: ListItem) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-rose-100">
      <button
        onClick={() => onToggle(item)}
        disabled={busy}
        aria-label={item.done ? "Desmarcar" : "Marcar como feito"}
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ring-2 transition ${
          item.done ? "bg-rose-500 text-white ring-rose-500" : "ring-stone-300"
        }`}
      >
        {item.done && <Check className="size-4" />}
      </button>
      <span className={`min-w-0 flex-1 ${item.done ? "text-stone-400 line-through" : "text-stone-800"}`}>{item.text}</span>
      {onMoment &&
        (item.moment_id ? (
          <CalendarHeart className="size-4 shrink-0 text-rose-400" aria-label="Já está no calendário" />
        ) : (
          <button
            onClick={() => onMoment(item)}
            disabled={busy}
            className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"
          >
            Virar momento
          </button>
        ))}
      <button onClick={() => onRemove(item)} disabled={busy} className="shrink-0 rounded-full p-1 text-stone-300 hover:text-red-600" aria-label="Remover item">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
