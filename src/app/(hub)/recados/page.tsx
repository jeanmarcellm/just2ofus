"use client";

import { formatDistanceToNow, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Mail, Plus, Trash2 } from "lucide-react";
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
  Textarea,
} from "@/components/ui";
import { formatDay, startOfDayIso, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Note } from "@/lib/types";

const EMOJIS = ["💌", "❤️", "☀️", "🌙", "🥰", "😘", "🤗", "🌹", "✨", "☕"];

async function fetchNotes(): Promise<Note[]> {
  const { data } = await supabase()
    .from("notes")
    .select("*")
    .order("visible_from", { ascending: false })
    .limit(100);
  return data ?? [];
}

export default function NotesPage() {
  const { profile, partner } = useCouple();
  const [notes, load] = useLoader(fetchNotes);
  const [composing, setComposing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(note: Note) {
    setBusyId(note.id);
    await supabase().from("notes").delete().eq("id", note.id);
    await load();
    setBusyId(null);
  }

  return (
    <div>
      <SubPageHeader
        title="Recados"
        subtitle="Bilhetinhos para o seu amor"
        action={
          <Button className="px-4" onClick={() => setComposing(true)}>
            <Plus className="size-4" /> Recado
          </Button>
        }
      />

      {notes === null ? (
        <Spinner />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-6" />}
          title="Nenhum recado ainda"
          text="Deixe um bom dia, um elogio ou programe uma surpresa para um dia especial."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => {
            const mine = note.author_id === profile.id;
            const scheduled = isFuture(parseISO(note.visible_from));
            return (
              <li
                key={note.id}
                className={`rounded-3xl p-5 ring-1 ${mine ? "ml-6 bg-white ring-rose-100" : "mr-6 bg-rose-50 ring-rose-200"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{note.emoji}</span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-stone-800">{note.body}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-stone-400">
                  {scheduled ? (
                    <span className="flex items-center gap-1 font-semibold text-violet-600">
                      <Clock className="size-3.5" /> Aparece para {partner?.display_name ?? "seu par"} em {formatDay(parseISO(note.visible_from), "d 'de' MMM")}
                    </span>
                  ) : (
                    <span>
                      {mine ? "Você" : partner?.display_name ?? "Seu par"} ·{" "}
                      {formatDistanceToNow(parseISO(note.visible_from), { locale: ptBR, addSuffix: true })}
                    </span>
                  )}
                  {mine && (
                    <button
                      onClick={() => remove(note)}
                      disabled={busyId === note.id}
                      className="rounded-full p-1 hover:text-red-600"
                      aria-label="Apagar recado"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {composing && <NoteSheet onClose={() => setComposing(false)} onSaved={load} />}
    </div>
  );
}

function NoteSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const today = toDayString(new Date());
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [body, setBody] = useState("");
  const [showOn, setShowOn] = useState(today);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase()
      .from("notes")
      .insert({
        emoji,
        body: body.trim(),
        // today = right away; a future day appears at midnight of that day
        ...(showOn > today ? { visible_from: startOfDayIso(showOn) } : {}),
      });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Novo recado">
      <form onSubmit={save} className="flex flex-col gap-5">
        <EmojiPicker value={emoji} onChange={setEmoji} options={EMOJIS} />
        <Field label="Mensagem">
          <Textarea required maxLength={500} rows={4} placeholder="Bom dia, meu amor…" value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Quando aparece?" hint="Escolha uma data futura para fazer uma surpresa.">
          <Input type="date" required min={today} value={showOn} onChange={(e) => setShowOn(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>{showOn > today ? "Programar recado" : "Enviar"}</Button>
      </form>
    </Sheet>
  );
}
