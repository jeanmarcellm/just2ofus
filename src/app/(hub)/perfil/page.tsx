"use client";

import { HeartHandshake, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCouple } from "@/components/auth-provider";
import { InviteCard } from "@/components/invite-card";
import { Button, Card, CouplePolaroids, ErrorText, Field, Input, SubPageHeader } from "@/components/ui";
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
    <div className="flex flex-col gap-6">
      <SubPageHeader title="Perfil" subtitle="seus dados e o convite" />

      <Card tape="rose" tilt={-0.5} className="flex items-center gap-4">
        <CouplePolaroids me={profile.display_name} partner={partner?.display_name} />
        <div className="min-w-0">
          <p className="font-serif text-[22px] leading-tight text-ink">
            {partner ? `${profile.display_name} & ${partner.display_name}` : profile.display_name}
          </p>
          <p className="truncate text-sm text-muted">{session.user.email}</p>
          <p className="font-hand text-xl leading-tight text-batom">juntos desde {formatDay(couple.together_since)}</p>
        </div>
      </Card>

      {!partner && (
        <Card tape="sage" tilt={0.5}>
          <div className="mb-3 flex items-center gap-2">
            <HeartHandshake className="size-5 text-batom" />
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Convide seu <em>amor</em>
            </h2>
          </div>
          <p className="mb-4 font-hand text-xl leading-tight text-muted">
            Envie o link. Ao abrir, a pessoa cria a conta dela e vocês ficam conectados.
          </p>
          <InviteCard inviterName={profile.display_name} />
        </Card>
      )}

      <Card tilt={-0.3}>
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
