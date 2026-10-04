"use client";

import { Camera, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { Button, EmptyState, ErrorText, Field, Input, PageHeader, Polaroid, Sheet, Spinner, Tabs } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { PHOTOS_BUCKET, signedUrls, uploadPhoto } from "@/lib/photos";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Photo } from "@/lib/types";

// Polaroids pinned at slightly different angles, like a wall.
const ALBUM_TILTS = [-3, 2, -1.5, 3, -2, 1];

async function fetchAlbum(): Promise<{ photos: Photo[]; urls: Record<string, string> }> {
  const { data } = await supabase()
    .from("photos")
    .select("*")
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  const photos: Photo[] = data ?? [];
  return { photos, urls: await signedUrls(photos.map((p) => p.storage_path)) };
}

export default function AlbumPage() {
  const { couple } = useCouple();
  const [filter, setFilter] = useState<"all" | "special">("all");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Photo | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [album, load] = useLoader(fetchAlbum);
  const photos = album?.photos ?? null;
  const urls = album?.urls ?? {};

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(files.length);
    for (const file of Array.from(files)) {
      try {
        await uploadPhoto(couple.id, file);
      } catch (e) {
        setError(friendlyError(e));
      }
      setUploading((n) => n - 1);
    }
    if (fileInput.current) fileInput.current.value = "";
    await load();
  }

  const visible = photos?.filter((p) => filter === "all" || p.is_special) ?? [];

  return (
    <div>
      <PageHeader
        title="Álbum"
        subtitle={photos ? `${photos.length} ${photos.length === 1 ? "foto" : "fotos"} de vocês` : undefined}
        action={
          <Button className="px-4" onClick={() => fileInput.current?.click()} loading={uploading > 0}>
            {uploading > 0 ? `${uploading}…` : <><ImagePlus className="size-4" /> Fotos</>}
          </Button>
        }
      />
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Todas" },
          { value: "special", label: "⭐ Especiais" },
        ]}
      />
      <ErrorText>{error}</ErrorText>

      {photos === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === "all" ? <Camera className="size-6" /> : <Star className="size-6" />}
          title={filter === "all" ? "O álbum ainda está vazio" : "Nenhum momento especial ainda"}
          text={filter === "all" ? "Adicionem as primeiras fotos de vocês." : "Toque numa foto e marque com a estrela."}
          action={
            filter === "all" && (
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                <ImagePlus className="size-4" /> Adicionar fotos
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2 sm:grid-cols-3">
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="relative text-left transition-[rotate,scale] duration-[350ms] ease-spring [rotate:var(--tilt)] hover:z-10 hover:scale-[1.04] hover:[rotate:0deg]"
              style={{ "--tilt": `${ALBUM_TILTS[i % ALBUM_TILTS.length]}deg` } as React.CSSProperties}
            >
              <Polaroid
                src={urls[p.storage_path]}
                alt={p.caption ?? ""}
                caption={p.caption || formatDay(p.taken_on, "d MMM yyyy")}
                tape={p.is_special ? "mustard" : undefined}
                imgClassName="aspect-square"
              />
              {p.is_special && <Star className="absolute top-3 right-3 size-4 fill-mustard text-mustard drop-shadow" aria-label="Momento especial" />}
            </button>
          ))}
        </div>
      )}

      {open && (
        <PhotoSheet key={open.id} photo={open} url={urls[open.storage_path]} onClose={() => setOpen(null)} onChanged={load} />
      )}
    </div>
  );
}

function PhotoSheet({
  photo,
  url,
  onClose,
  onChanged,
}: {
  photo: Photo;
  url?: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [takenOn, setTakenOn] = useState(photo.taken_on);
  const [special, setSpecial] = useState(photo.is_special);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    const { error } = await supabase()
      .from("photos")
      .update({ caption: caption.trim() || null, taken_on: takenOn, is_special: special })
      .eq("id", photo.id);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onChanged();
    onClose();
  }

  async function remove() {
    setBusy(true);
    const db = supabase();
    const { error } = await db.from("photos").delete().eq("id", photo.id);
    if (!error) await db.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onChanged();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={formatDay(photo.taken_on)}>
      <div className="flex flex-col gap-5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={photo.caption ?? ""} className="max-h-[50dvh] w-full bg-kraft object-contain p-1.5 pb-6 shadow-polaroid" />
        )}
        <button
          type="button"
          onClick={() => setSpecial((s) => !s)}
          aria-pressed={special}
          className={`flex items-center justify-center gap-2 rounded-[14px] py-3 font-hand text-[21px] outline outline-[1.5px] outline-dashed transition ${
            special ? "bg-[#faf3e0] text-[#7a5a22] outline-mustard" : "bg-sheet text-muted outline-line"
          }`}
        >
          <Star className={`size-4 ${special ? "fill-mustard text-mustard" : ""}`} />
          {special ? "Momento especial" : "Marcar como momento especial"}
        </button>
        <Field label="Legenda">
          <Input value={caption} placeholder="conte o que estava acontecendo…" onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <Field label="Data da foto">
          <Input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
            disabled={busy}
          >
            <Trash2 className="size-4" /> {confirmDelete ? "Confirmar" : ""}
          </Button>
          <Button className="flex-1" onClick={save} loading={busy}>Salvar</Button>
        </div>
      </div>
    </Sheet>
  );
}
