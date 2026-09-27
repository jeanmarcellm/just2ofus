"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { afterAuthPath, useAuth } from "@/components/auth-provider";
import { Button, ErrorText, Field, Input } from "@/components/ui";
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
      <AuthShell title="Confirme seu email" subtitle={`Enviamos um link para ${email}.`}>
        <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm text-stone-600 ring-1 ring-rose-100">
          <MailCheck className="size-5 shrink-0 text-rose-500" />
          Abra o link no email para ativar sua conta. Depois é só entrar.
        </div>
        <Link href="/entrar" className="text-center text-sm font-semibold text-rose-600">
          Ir para o login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar conta" subtitle="Depois você convida seu amor para entrar junto.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
        <Button type="submit" loading={submitting}>Criar conta</Button>
      </form>
      <p className="text-center text-sm text-stone-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-rose-600">Entrar</Link>
      </p>
    </AuthShell>
  );
}
