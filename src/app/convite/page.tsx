"use client";

import { HeartHandshake } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { setPendingInvite, useAuth } from "@/components/auth-provider";
import { Button, ButtonLink, ErrorText, FullScreenSpinner } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";

type Invite = { inviter_name: string; together_since: string; status: "valid" | "used" | "full" };

export default function InvitePage() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const token = useSearchParams().get("token") ?? "";
  const { loading, session, couple, partner, refresh } = useAuth();
  const router = useRouter();
  const [fetched, setFetched] = useState<Invite | null | undefined>(undefined);
  const invite = token ? fetched : null;
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase()
      .rpc("get_invite", { p_token: token })
      .then(({ data }) => setFetched((data as Invite[] | null)?.[0] ?? null));
  }, [token]);

  useEffect(() => {
    if (loading || !token) return;
    // Remember the invite across sign-up / email confirmation; drop it once the user has a couple.
    setPendingInvite(session && couple ? null : token);
  }, [loading, session, couple, token]);

  async function accept() {
    setError("");
    setAccepting(true);
    const { error } = await supabase().rpc("accept_invite", { p_token: token });
    if (error) {
      setError(friendlyError(error));
      setAccepting(false);
      return;
    }
    setPendingInvite(null);
    await refresh();
    router.replace("/inicio");
  }

  if (loading || invite === undefined) return <FullScreenSpinner />;

  if (session && couple) {
    return (
      <AuthShell
        title="Vocês já estão"
        emphasis="conectados"
        subtitle={partner ? `Você já faz parte de um casal com ${partner.display_name}.` : "Você já faz parte de um casal."}
      >
        <ButtonLink href="/inicio" size="lg">Ir para o app</ButtonLink>
      </AuthShell>
    );
  }

  if (!invite || invite.status !== "valid") {
    const reason = !invite
      ? "Este link de convite não existe ou está incompleto."
      : invite.status === "used"
        ? "Este convite já foi aceito."
        : "Este casal já está completo.";
    return (
      <AuthShell title="Convite" emphasis="indisponível" subtitle={reason}>
        <ButtonLink href="/" variant="secondary" size="lg">Voltar ao início</ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`${invite.inviter_name} convidou`}
      emphasis="você 💌"
      subtitle={`Para entrarem juntos no Just2Ofus — juntos desde ${formatDay(invite.together_since)}.`}
    >
      <div className="flex items-start gap-3 font-hand text-[22px] leading-tight text-ink-soft">
        <HeartHandshake className="mt-0.5 size-6 shrink-0 text-batom" />
        {session
          ? "Aceite o convite para compartilhar momentos, dates, quiz e álbum."
          : "Crie sua conta (ou entre) para aceitar o convite."}
      </div>
      <ErrorText>{error}</ErrorText>
      {session ? (
        <Button size="lg" onClick={accept} loading={accepting}>Aceitar convite</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <ButtonLink href="/cadastro" size="lg">Criar minha conta</ButtonLink>
          <ButtonLink href="/entrar" variant="secondary" size="lg">Já tenho conta</ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
