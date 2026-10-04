"use client";

import { addDays, differenceInCalendarDays, isPast, parseISO } from "date-fns";
import { Hourglass, ImagePlus, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Sheet,
  Spinner,
  SubPageHeader,
  Textarea,
  WaxSeal,
} from "@/components/ui";
import { daysLeftLabel, formatDay, startOfDayIso, toDayString } from "@/lib/dates";
import { compressImage } from "@/lib/images";
import { signedUrls } from "@/lib/photos";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Capsule } from "@/lib/types";

const BUCKET = "capsules";
const photoPath = (capsule: Pick<Capsule, "id">, coupleId: string) => `${coupleId}/${capsule.id}`;

async function fetchCapsules(): Promise<Capsule[]> {
  const { data } = await supabase().from("capsules").select("*").order("opens_at");
  return data ?? [];
}

export default function CapsulePage() {
  const { profile, partner } = useCouple();
  const [capsules, load] = useLoader(fetchCapsules);
  const [creating, setCreating] = useState(false);
  const [opened, setOpened] = useState<Capsule | null>(null);

  const author = (c: Capsule) => (c.created_by === profile.id ? "você" : partner?.display_name ?? "seu par");
  const locked = capsules?.filter((c) => !isPast(parseISO(c.opens_at))) ?? [];
  const open = capsules?.filter((c) => isPast(parseISO(c.opens_at))).reverse() ?? [];

  return (
    <div>
      <SubPageHeader
        title="Cápsula do tempo"
        subtitle="mensagens que só abrem no futuro"
        action={
          <Button className="px-4" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Cápsula
          </Button>
        }
      />

      {capsules === null ? (
        <Spinner />
      ) : capsules.length === 0 ? (
        <EmptyState
          icon={<Hourglass className="size-6" />}
          title="Nenhuma cápsula ainda"
          text="Escreva uma carta para vocês abrirem daqui a um ano, no próximo aniversário ou quando quiserem. Até lá, ninguém consegue ler: nem quem escreveu."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {open.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-[22px] text-ink">
                Já <em>abertas</em>
              </h2>
              <ul className="flex flex-col gap-3">
                {open.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setOpened(c)} className="flex w-full items-center gap-3 rounded-[6px] bg-sheet p-4 text-left shadow-paper">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sticker text-batom shadow-sticker">
                        <LockOpen className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-[22px] leading-tight text-ink">{c.title}</span>
                        <span className="font-hand text-lg leading-tight text-muted">
                          De {author(c)} · aberta em {formatDay(parseISO(c.opens_at), "d 'de' MMM yyyy")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {locked.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-[22px] text-ink">
                Ainda <em>lacradas</em>
              </h2>
              <ul className="flex flex-col gap-3">
                {locked.map((c) => (
                  <LockedRow key={c.id} capsule={c} author={author(c)} mine={c.created_by === profile.id} onDeleted={load} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {creating && <NewCapsuleSheet onClose={() => setCreating(false)} onSaved={load} />}
      {opened && <OpenedSheet capsule={opened} author={author(opened)} onClose={() => setOpened(null)} />}
    </div>
  );
}

function LockedRow({ capsule, author, mine, onDeleted }: { capsule: Capsule; author: string; mine: boolean; onDeleted: () => Promise<void> }) {
  const { couple } = useCouple();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const daysLeft = differenceInCalendarDays(parseISO(capsule.opens_at), new Date());

  async function remove() {
    setBusy(true);
    const db = supabase();
    if (capsule.has_photo) await db.storage.from(BUCKET).remove([photoPath(capsule, couple.id)]);
    await db.from("capsules").delete().eq("id", capsule.id);
    await onDeleted();
  }

  return (
    <li className="relative overflow-hidden rounded-[6px] bg-envelope px-5 pt-16 pb-4 shadow-paper">
      <span aria-hidden className="absolute inset-x-0 top-0 block h-14 bg-envelope-flap [clip-path:polygon(0_0,100%_0,50%_100%)]" />
      <WaxSeal size={40} className="absolute top-8 left-1/2 -ml-5">
        <Lock className="size-4" strokeWidth={2.2} />
      </WaxSeal>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[22px] leading-tight text-ink">{capsule.title}</p>
          <p className="font-hand text-lg leading-tight text-ink-soft">
            De {author} · abre em {formatDay(parseISO(capsule.opens_at), "d 'de' MMM yyyy")}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold tracking-[.12em] text-terracota uppercase">{daysLeftLabel(daysLeft)}</span>
      </div>
      {mine && (
        <div className="mt-3 flex justify-end">
          {confirm ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)} className="rounded-full bg-sheet px-3 py-1 text-xs font-semibold text-ink">Manter</button>
              <button onClick={remove} disabled={busy} className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-sheet">
                Apagar sem abrir
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="flex items-center gap-1 text-xs font-semibold text-terracota hover:text-danger">
              <Trash2 className="size-3.5" /> Apagar
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function OpenedSheet({ capsule, author, onClose }: { capsule: Capsule; author: string; onClose: () => void }) {
  const { couple } = useCouple();
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    const db = supabase();
    db.from("capsule_contents")
      .select("message")
      .eq("capsule_id", capsule.id)
      .maybeSingle()
      .then(({ data }) => setMessage(data?.message ?? ""));
    if (capsule.has_photo) {
      const path = photoPath(capsule, couple.id);
      signedUrls([path], BUCKET).then((urls) => setUrl(urls[path]));
    }
  }, [capsule, couple.id]);

  return (
    <Sheet open onClose={onClose} title={capsule.title}>
      <p className="mb-4 font-hand text-xl leading-tight text-muted">
        Escrita por {author} em {formatDay(parseISO(capsule.created_at))}
      </p>
      {message === null ? (
        <Spinner className="py-8" />
      ) : (
        <div className="flex flex-col gap-4">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="max-h-[50dvh] w-full bg-kraft object-contain p-1.5 pb-6 shadow-polaroid" />
          )}
          <p className="rotate-[-0.5deg] rounded-[4px] bg-sheet bg-[repeating-linear-gradient(transparent_0_29px,#f0e4d8_29px_30px)] px-4 py-1 font-hand text-[23px] leading-[30px] whitespace-pre-wrap text-ink shadow-paper">{message}</p>
        </div>
      )}
    </Sheet>
  );
}

function NewCapsuleSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const { couple } = useCouple();
  const tomorrow = toDayString(addDays(new Date(), 1));
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [opensOn, setOpensOn] = useState(toDayString(addDays(new Date(), 365)));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const db = supabase();
    const { data: capsule, error: capErr } = await db
      .from("capsules")
      .insert({ title: title.trim(), opens_at: startOfDayIso(opensOn), has_photo: Boolean(file) })
      .select("*")
      .single();
    if (capErr) {
      setBusy(false);
      return setError(friendlyError(capErr));
    }
    try {
      if (file) {
        const blob = await compressImage(file);
        const { error } = await db.storage
          .from(BUCKET)
          .upload(photoPath(capsule, couple.id), blob, { contentType: blob.type || file.type });
        if (error) throw error;
      }
      const { error } = await db.from("capsule_contents").insert({ capsule_id: capsule.id, message: message.trim() });
      if (error) throw error;
    } catch (err) {
      // a capsule without its content is useless: roll it back
      if (file) await db.storage.from(BUCKET).remove([photoPath(capsule, couple.id)]);
      await db.from("capsules").delete().eq("id", capsule.id);
      setBusy(false);
      return setError(friendlyError(err));
    }
    await onSaved();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Nova cápsula do tempo">
      <form onSubmit={save} className="flex flex-col gap-5">
        <Field label="Título" hint="Aparece para os dois enquanto a cápsula estiver lacrada.">
          <Input required maxLength={80} placeholder="ex: para abrirmos no nosso 5º aniversário" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Mensagem" hint="Depois de lacrada, ninguém consegue ler nem editar até a data.">
          <Textarea required maxLength={5000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field label="Abre em">
          <Input type="date" required min={tomorrow} value={opensOn} onChange={(e) => setOpensOn(e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border-[1.5px] border-dashed border-rose-line bg-sheet py-4 font-hand text-[21px] text-batom">
          <ImagePlus className="size-5" />
          {file ? file.name : "Incluir uma foto (opcional)"}
          <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>
          <Lock className="size-4" /> Lacrar cápsula
        </Button>
      </form>
    </Sheet>
  );
}
