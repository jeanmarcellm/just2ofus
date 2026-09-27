import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Lazy so the static prerender at build time never needs the env vars.
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New projects hand out a publishable key (sb_publishable_…); older ones an anon JWT. Both work.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local",
    );
  }
  client = createClient(url, key);
  return client;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed": "Confirme seu email antes de entrar.",
  "User already registered": "Já existe uma conta com esse email.",
  already_in_couple: "Você já faz parte de um casal.",
  invite_not_found: "Convite não encontrado.",
  invite_used: "Este convite já foi usado.",
  couple_full: "Este casal já está completo.",
  no_couple: "Crie seu casal antes de convidar alguém.",
};

export function friendlyError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const key = Object.keys(ERROR_MESSAGES).find((k) => message.includes(k));
  return key ? ERROR_MESSAGES[key] : "Algo deu errado. Tente novamente.";
}
