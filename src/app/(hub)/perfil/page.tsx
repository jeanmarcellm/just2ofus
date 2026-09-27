"use client";

import { ChevronLeft, HeartHandshake, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { InviteCard } from "@/components/invite-card";
import { Avatar, Button, Card, ErrorText, Field, Input } from "@/components/ui";
import { formatDay, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { profile, partner, couple, session, refresh, signOut } = useCouple();
  const router = useRouter();
  const [name, setName] = useState(profile.display_name);
  const [since, setSince] = useState(couple.together_since);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const db = supabase();
    const results = await Promise.all([
      db.from("profiles").update({ display_name: name.trim() }).eq("id", profile.id),
      db.from("couples").update({ together_since: since }).eq("id", couple.id),
    ]);
    const failed = results.find((r) => r.error);
    if (failed) setError(friendlyError(failed.error));
    else {
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link href="/inicio" className="-ml-2 rounded-full p-2 hover:bg-rose-50" aria-label="Voltar">
          <ChevronLeft className="size-5 text-stone-600" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Perfil</h1>
      </header>

      <Card className="flex items-center gap-4">
        <div className="flex -space-x-3">
          <Avatar name={profile.display_name} className="size-14 text-lg" />
          {partner && <Avatar name={partner.display_name} className="size-14 bg-violet-100 text-lg text-violet-600" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-stone-900">
            {partner ? `${profile.display_name} & ${partner.display_name}` : profile.display_name}
          </p>
          <p className="truncate text-sm text-stone-500">{session.user.email}</p>
          <p className="text-sm text-stone-500">Juntos desde {formatDay(couple.together_since)}</p>
        </div>
      </Card>

      {!partner && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <HeartHandshake className="size-5 text-rose-500" />
            <h2 className="font-semibold text-stone-900">Convide seu amor</h2>
          </div>
          <p className="mb-4 text-sm text-stone-500">
            Envie o link. Ao abrir, a pessoa cria a conta dela e vocês ficam conectados.
          </p>
          <InviteCard inviterName={profile.display_name} />
        </Card>
      )}

      <Card>
        <form onSubmit={save} className="flex flex-col gap-5">
          <Field label="Seu nome">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Juntos desde" hint="Vale para vocês dois e alimenta o contador.">
            <Input type="date" required max={toDayString(new Date())} value={since} onChange={(e) => setSince(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={saving}>{saved ? "Salvo!" : "Salvar alterações"}</Button>
        </form>
      </Card>

      <Button variant="danger" onClick={logout}>
        <LogOut className="size-4" /> Sair
      </Button>
    </div>
  );
}
