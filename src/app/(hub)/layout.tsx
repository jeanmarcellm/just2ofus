"use client";

import { Camera, CalendarDays, Heart, LayoutGrid, Puzzle, Wine } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getPendingInvite, useAuth } from "@/components/auth-provider";
import { FullScreenSpinner } from "@/components/ui";

const NAV = [
  { href: "/inicio/", label: "início", icon: Heart },
  { href: "/calendario/", label: "agenda", icon: CalendarDays },
  { href: "/dates/", label: "dates", icon: Wine },
  { href: "/quiz/", label: "quiz", icon: Puzzle },
  { href: "/album/", label: "álbum", icon: Camera },
  { href: "/mais/", label: "mais", icon: LayoutGrid },
];

// Pages opened from "Mais" keep that tab highlighted.
const MORE_PAGES = ["/recados", "/pergunta", "/listas", "/metas", "/datas", "/historia", "/capsula", "/perfil"];

function isActive(pathname: string, href: string) {
  if (pathname === href || pathname === href.slice(0, -1)) return true;
  return href === "/mais/" && MORE_PAGES.some((p) => pathname.startsWith(p));
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const { loading, session, couple } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/entrar");
    else if (!couple) {
      const token = getPendingInvite();
      router.replace(token ? `/convite/?token=${token}` : "/onboarding");
    }
  }, [loading, session, couple, router]);

  if (loading || !session || !couple) return <FullScreenSpinner />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <main className="px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(120px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <nav className="fixed inset-x-3 bottom-[calc(14px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[calc(32rem-1.5rem)] rounded-[22px] bg-sheet shadow-nav outline outline-[1.5px] outline-dashed outline-offset-[-6px] outline-[#ead9cc]">
        <ul className="flex p-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center py-1.5 transition-colors ${active ? "text-batom" : "text-faint hover:text-muted"}`}
                >
                  <span className="relative flex h-7 w-10 items-center justify-center">
                    {active && <span aria-hidden className="absolute inset-x-0 inset-y-1 -rotate-6 bg-[rgba(229,168,170,.55)]" />}
                    <Icon
                      className={`relative size-[22px] ${active ? "fill-batom/25" : ""} ${active && href === "/inicio/" ? "animate-beat fill-batom" : ""}`}
                      strokeWidth={active ? 2 : 1.75}
                    />
                  </span>
                  <span className={`font-hand text-[17px] leading-none ${active ? "font-bold" : ""}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
