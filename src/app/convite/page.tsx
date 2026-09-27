"use client";

import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { setPendingInvite, useAuth } from "@/components/auth-provider";
import { Button, ErrorText, FullScreenSpinner } from "@/components/ui";
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
        title="Vocês já estão conectados"
        subtitle={partner ? `Você já faz parte de um casal com ${partner.display_name}.` : "Você já faz parte de um casal."}
      >
        <Link href="/inicio" className="flex min-h-12 items-center justify-center rounded-full bg-rose-500 font-semibold text-white">
          Ir para o app
        </Link>
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
      <AuthShell title="Convite indisponível" subtitle={reason}>
        <Link href="/" className="text-center text-sm font-semibold text-rose-600">Voltar ao início</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`${invite.inviter_name} convidou você 💌`}
      subtitle={`Para entrarem juntos no Just2Ofus — juntos desde ${formatDay(invite.together_since)}.`}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-stone-600 ring-1 ring-rose-100">
        <HeartHandshake className="size-6 shrink-0 text-rose-500" />
        {session
          ? "Aceite o convite para compartilhar momentos, dates, quiz e álbum."
          : "Crie sua conta (ou entre) para aceitar o convite."}
      </div>
      <ErrorText>{error}</ErrorText>
      {session ? (
        <Button onClick={accept} loading={accepting}>Aceitar convite</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <Link href="/cadastro" className="flex min-h-12 items-center justify-center rounded-full bg-rose-500 font-semibold text-white">
            Criar minha conta
          </Link>
          <Link href="/entrar" className="flex min-h-12 items-center justify-center rounded-full font-semibold text-rose-600 ring-1 ring-rose-200">
            Já tenho conta
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
