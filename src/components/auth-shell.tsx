import { Heart } from "lucide-react";
import Link from "next/link";
import { Tape } from "@/components/ui";

// Auth pages: logo, a serif title with an optional italic part, and the form on a taped sheet of paper.
export function AuthShell({
  title,
  emphasis,
  subtitle,
  footer,
  children,
}: {
  title: string;
  // italic tail of the title, e.g. "de volta" in "Bem-vindo(a) de volta"
  emphasis?: string;
  subtitle?: string;
  // rendered under the paper sheet (links like "Ainda não tem conta?")
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(52px+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link href="/" className="flex items-center gap-2 self-start text-batom">
        <Heart className="size-[22px] animate-beat fill-batom" />
        <span className="font-serif text-2xl italic">Just2Ofus</span>
      </Link>
      <h1 className="mt-11 font-serif text-[40px] leading-[1.05] tracking-[-0.01em] text-ink">
        {title}
        {emphasis && (
          <>
            {" "}
            <em>{emphasis}</em>
          </>
        )}
      </h1>
      {subtitle && <p className="mt-2 font-hand text-2xl leading-tight text-muted">{subtitle}</p>}
      <div className="relative mt-8 rotate-[-0.6deg] animate-drop rounded-[6px] bg-sheet px-[22px] pt-[30px] pb-[26px] shadow-[0_14px_30px_-14px_rgba(80,50,40,.35)] [animation-delay:.15s]">
        <Tape color="rose" className="-top-[11px] left-[34px] h-6 w-[84px]" rotate={-5} />
        <Tape color="sage" className="-top-[11px] right-[30px] h-6 w-16" rotate={6} />
        <div className="flex flex-col gap-[22px]">{children}</div>
      </div>
      {footer && <div className="mt-7 text-center text-[15px] text-muted">{footer}</div>}
      <p className="mt-auto rotate-[-2deg] pt-10 text-center font-hand text-[22px] text-[#b9a69c]">feito pra dois ♡</p>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-batom underline decoration-rose-wave decoration-wavy underline-offset-[5px]">
      {children}
    </Link>
  );
}
