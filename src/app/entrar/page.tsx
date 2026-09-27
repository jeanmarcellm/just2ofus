"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { afterAuthPath, useAuth } from "@/components/auth-provider";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { friendlyError, supabase } from "@/lib/supabase";

export default function SignIn() {
  const { loading, session, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && !submitting) router.replace(afterAuthPath());
  }, [loading, session, submitting, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) {
      setError(friendlyError(error));
      setSubmitting(false);
      return;
    }
    await refresh();
    router.replace(afterAuthPath());
  }

  return (
    <AuthShell title="Bem-vindo(a) de volta" subtitle="Entre para ver o cantinho de vocês.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={submitting}>Entrar</Button>
      </form>
      <p className="text-center text-sm text-stone-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-rose-600">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
