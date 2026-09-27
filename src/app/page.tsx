"use client";

import { CalendarHeart, Camera, Heart, Puzzle, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { FullScreenSpinner } from "@/components/ui";

const FEATURES = [
  { icon: Timer, text: "Contador de quanto tempo vocês estão juntos" },
  { icon: CalendarHeart, text: "Calendário de momentos e agenda de dates" },
  { icon: Puzzle, text: "Quiz para ver quem conhece mais o outro" },
  { icon: Camera, text: "Álbum de fotos e momentos especiais" },
];

export default function Landing() {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/inicio");
  }, [loading, session, router]);

  if (loading || session) return <FullScreenSpinner />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 flex size-16 items-center justify-center rounded-3xl bg-rose-500 shadow-lg shadow-rose-500/30">
          <Heart className="size-8 fill-white text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-stone-900">
          Um lugar só de vocês dois.
        </h1>
        <p className="mt-3 text-lg text-stone-500">
          Guardem memórias, planejem dates e se divirtam juntos.
        </p>
        <ul className="mt-10 flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-stone-700">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-500 ring-1 ring-rose-100">
                <Icon className="size-5" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <Link
          href="/cadastro"
          className="flex min-h-12 items-center justify-center rounded-full bg-rose-500 font-semibold text-white shadow-sm shadow-rose-500/30"
        >
          Criar conta
        </Link>
        <Link
          href="/entrar"
          className="flex min-h-12 items-center justify-center rounded-full font-semibold text-rose-600 ring-1 ring-rose-200"
        >
          Já tenho conta
        </Link>
      </div>
    </main>
  );
}
