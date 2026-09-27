"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { getPendingInvite, useAuth } from "@/components/auth-provider";
import { InviteCard } from "@/components/invite-card";
import { Button, ErrorText, Field, FullScreenSpinner, Input } from "@/components/ui";
import { toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";

export default function Onboarding() {
  const { loading, session, profile, couple, partner, refresh } = useAuth();
  const router = useRouter();
  const [since, setSince] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/entrar");
    else if (!couple && getPendingInvite()) router.replace(`/convite/?token=${getPendingInvite()}`);
    else if (couple && partner) router.replace("/inicio");
  }, [loading, session, couple, partner, router]);

  async function createCouple(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { error } = await supabase().rpc("create_couple", { p_together_since: since });
    if (error) setError(friendlyError(error));
    else await refresh();
    setSaving(false);
  }

  if (loading || !session || !profile || (couple && partner)) return <FullScreenSpinner />;

  if (!couple) {
    return (
      <AuthShell title={`Oi, ${profile.display_name}! 👋`} subtitle="Vamos montar o cantinho de vocês.">
        <form onSubmit={createCouple} className="flex flex-col gap-5">
          <Field label="Desde quando vocês estão juntos?" hint="Usamos essa data no contador do casal.">
            <Input type="date" required max={toDayString(new Date())} value={since} onChange={(e) => setSince(e.target.value)} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={saving}>Continuar</Button>
        </form>
        <p className="text-center text-sm text-stone-500">
          Recebeu um convite? Abra o link que seu amor enviou.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Convide seu amor 💌" subtitle="Envie este link. Ao abrir, a pessoa cria a conta e vocês ficam conectados.">
      <InviteCard inviterName={profile.display_name} />
      <Button variant="ghost" onClick={() => router.replace("/inicio")}>
        Fazer isso depois
      </Button>
    </AuthShell>
  );
}
