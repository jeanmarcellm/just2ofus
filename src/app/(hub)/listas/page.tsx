"use client";

import { parseISO } from "date-fns";
import { CalendarHeart, Heart, ListChecks, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  BackButton,
  Button,
  EmojiPicker,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Sheet,
  Spinner,
  SubPageHeader,
  Tape,
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
        subtitle="tudo o que vocês querem fazer, ver e comprar"
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
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
          {lists.map((list, i) => (
            <li key={list.id}>
              <button
                onClick={() => setOpenId(list.id)}
                className="relative flex w-full flex-col items-start rounded-[6px] bg-sheet p-4 pt-5 text-left shadow-paper transition-[rotate] duration-300 [rotate:var(--tilt)] hover:[rotate:0deg]"
                style={{ "--tilt": `${i % 2 ? 1 : -1}deg` } as React.CSSProperties}
              >
                <Tape color={(["rose", "sage", "mustard"] as const)[i % 3]} className="-top-[10px] left-1/2 -ml-7 h-5 w-14" rotate={i % 2 ? 5 : -5} />
                <span className="text-3xl">{list.emoji}</span>
                <span className="mt-2 font-serif text-[22px] leading-tight text-ink">{list.title}</span>
                <span className="font-hand text-lg leading-tight text-muted">
                  {list.total === 0 ? "Vazia" : `${list.done} de ${list.total} feitos`}
                </span>
                {list.total > 0 && (
                  <span className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-[#f1e6db]">
                    <span className="block h-full rounded-sm bg-rose-wave" style={{ width: `${(list.done / list.total) * 100}%` }} />
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
              className="rounded-full bg-sheet px-3 py-1.5 text-sm text-muted outline outline-[1.5px] outline-dashed outline-line"
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
      <header className="flex flex-col gap-3 pb-6">
        <BackButton onClick={onBack} />
        <h1 className="flex items-center gap-2 font-serif text-4xl leading-none text-ink">
          <span className="text-3xl">{list.emoji}</span>
          <span className="min-w-0 truncate">{list.title}</span>
        </h1>
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
            <p className="rounded-[6px] border-[1.5px] border-dashed border-line p-5 text-center font-hand text-xl text-muted">
              Lista vazia. Adicione o primeiro item acima.
            </p>
          )}
          <ul className={`rounded-[6px] bg-sheet px-4 shadow-paper ${pending.length ? "" : "hidden"}`}>
            {pending.map((item) => (
              <ItemRow key={item.id} item={item} busy={busyId === item.id} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
          {done.length > 0 && (
            <>
              <h2 className="mt-7 mb-2 font-serif text-[22px] text-ink">
                Feitos <em className="text-batom">({done.length})</em>
              </h2>
              <ul className="rotate-[0.4deg] rounded-[6px] bg-sheet px-4 shadow-paper">
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
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs font-semibold text-faint hover:text-danger">
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
    <li className="flex items-center gap-3 border-b border-rule py-2.5 last:border-0">
      <button
        onClick={() => onToggle(item)}
        disabled={busy}
        aria-label={item.done ? "Desmarcar" : "Marcar como feito"}
        className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sheet outline outline-[1.5px] outline-dashed outline-rose-line"
      >
        <Heart
          className={`size-4 fill-batom text-batom transition-transform duration-[350ms] ease-[cubic-bezier(.3,1.8,.5,1)] ${item.done ? "scale-100" : "scale-0"}`}
        />
      </button>
      <span className={`min-w-0 flex-1 font-hand text-[23px] leading-tight ${item.done ? "text-faint line-through decoration-rose-wave decoration-2" : "text-ink"}`}>
        {item.text}
      </span>
      {onMoment &&
        (item.moment_id ? (
          <CalendarHeart className="size-4 shrink-0 text-batom" aria-label="Já está no calendário" />
        ) : (
          <button
            onClick={() => onMoment(item)}
            disabled={busy}
            className="shrink-0 font-hand text-lg leading-none text-batom underline decoration-rose-wave decoration-wavy underline-offset-4"
          >
            Virar momento
          </button>
        ))}
      <button onClick={() => onRemove(item)} disabled={busy} className="shrink-0 rounded-full p-1 text-faint hover:text-danger" aria-label="Remover item">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
