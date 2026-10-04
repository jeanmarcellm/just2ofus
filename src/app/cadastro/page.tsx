"use client";

import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLink, AuthShell } from "@/components/auth-shell";
import { afterAuthPath, useAuth } from "@/components/auth-provider";
import { Button, ButtonLink, ErrorText, Field, Input } from "@/components/ui";
import { friendlyError, siteUrl, supabase } from "@/lib/supabase";

export default function SignUp() {
  const { loading, session, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && session && !submitting) router.replace(afterAuthPath());
  }, [loading, session, submitting, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: `${siteUrl()}${afterAuthPath()}`,
      },
    });
    if (error) {
      setError(friendlyError(error));
      setSubmitting(false);
      return;
    }
    if (!data.session) {
      setAwaitingConfirmation(true);
      setSubmitting(false);
      return;
    }
    await refresh();
    router.replace(afterAuthPath());
  }

  if (awaitingConfirmation) {
    return (
      <AuthShell title="Confirme seu" emphasis="email" subtitle={`Enviamos um link para ${email}.`}>
        <div className="flex items-start gap-3 font-hand text-[22px] leading-tight text-ink-soft">
          <MailCheck className="mt-1 size-5 shrink-0 text-batom" />
          Abra o link no email para ativar sua conta. Depois é só entrar.
        </div>
        <ButtonLink href="/entrar" size="lg">Ir para o login</ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar"
      emphasis="conta"
      subtitle="Depois você convida seu amor para entrar junto."
      footer={
        <>
          Já tem conta? <AuthLink href="/entrar">Entrar</AuthLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-[22px]">
        <Field label="Seu nome">
          <Input autoComplete="given-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" hint="Mínimo de 6 caracteres">
          <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" className="mt-1.5" loading={submitting}>Criar conta</Button>
      </form>
    </AuthShell>
  );
}
