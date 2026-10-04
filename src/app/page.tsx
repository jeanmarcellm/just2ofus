"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { ButtonLink, FullScreenSpinner, Tape } from "@/components/ui";

const FEATURES = [
  "Contador de quanto tempo vocês estão juntos",
  "Calendário de momentos e agenda de dates",
  "Quiz para ver quem conhece mais o outro",
  "Álbum de fotos e momentos especiais",
];

// Illustrative "photos" for the collage: there is no couple yet on the landing, so they are painted scenes.
const SUNSET = "linear-gradient(180deg,#f3c6a5 0%,#eba98f 45%,#d98c87 62%,#b9b3a8 62%,#a9b7b5 100%)";
const DINNER = "radial-gradient(circle at 30% 35%,#f7e3b5 0 12%,transparent 13%),radial-gradient(circle at 68% 60%,#f4d9a4 0 9%,transparent 10%),linear-gradient(160deg,#7a4b44,#b4475a 55%,#d9a9ae)";

export default function Landing() {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/inicio");
  }, [loading, session, router]);

  if (loading || session) return <FullScreenSpinner />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-7 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="relative mx-auto h-[270px] w-full max-w-[334px]" aria-hidden>
        <div className="absolute top-[22px] left-2 w-[150px] -rotate-[7deg]">
          <div className="animate-drop bg-sheet p-2 pb-[34px] shadow-[0_10px_24px_-8px_rgba(80,50,40,.3)]" style={{ animationDelay: ".1s" }}>
            <div className="h-[150px]" style={{ background: DINNER }} />
            <p className="mt-1.5 text-center font-hand text-xl text-ink">primeiro date</p>
          </div>
        </div>
        <div className="absolute top-0 right-1.5 w-40 rotate-[5deg]">
          <div className="relative animate-drop bg-sheet p-2 pb-[34px] shadow-[0_10px_24px_-8px_rgba(80,50,40,.3)]" style={{ animationDelay: ".25s" }}>
            <Tape color="rose" className="-top-2.5 left-1/2 -ml-[35px] h-[22px] w-[70px]" rotate={-4} />
            <div className="h-40" style={{ background: SUNSET }} />
            <p className="mt-1.5 text-center font-hand text-xl text-ink">nossa praia ♡</p>
          </div>
        </div>
        <div
          className="absolute top-[196px] left-32 flex size-[58px] animate-[j2drop_.6s_cubic-bezier(.3,1.5,.5,1)_both] items-center justify-center rounded-full bg-batom shadow-[inset_0_-4px_0_rgba(0,0,0,.15),0_6px_14px_-4px_rgba(140,50,60,.5)]"
          style={{ animationDelay: ".5s" }}
        >
          <Heart className="size-[26px] animate-beat fill-sheet text-sheet [animation-delay:1.4s]" />
        </div>
      </div>

      <div className="flex flex-1 animate-drop flex-col justify-center pt-4" style={{ animationDelay: ".4s" }}>
        <h1 className="font-serif text-[46px] leading-[1.02] tracking-[-0.015em] text-balance text-ink">
          Um lugar <em className="text-batom">só de vocês</em> dois.
        </h1>
        <p className="mt-3.5 text-[17px] leading-[1.45] text-pretty text-muted">
          Guardem memórias, planejem dates e se divirtam juntos.
        </p>
        <ul className="mt-[22px] flex flex-col gap-1.5 font-hand text-[22px] leading-[1.15] text-ink">
          {FEATURES.map((text) => (
            <li key={text} className="flex gap-2.5">
              <span className="text-batom" aria-hidden>♡</span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <ButtonLink href="/cadastro" size="lg" className="shadow-[0_3px_0_#8d3344,0_10px_20px_-8px_rgba(140,50,60,.5)]">
          Criar conta
        </ButtonLink>
        <ButtonLink href="/entrar" variant="secondary" size="lg">
          Já tenho conta
        </ButtonLink>
      </div>
    </main>
  );
}
