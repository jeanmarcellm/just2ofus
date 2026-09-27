"use client";

import { Camera, CalendarDays, Heart, Puzzle, Wine } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getPendingInvite, useAuth } from "@/components/auth-provider";
import { FullScreenSpinner } from "@/components/ui";

const NAV = [
  { href: "/inicio/", label: "Início", icon: Heart },
  { href: "/calendario/", label: "Calendário", icon: CalendarDays },
  { href: "/dates/", label: "Dates", icon: Wine },
  { href: "/quiz/", label: "Quiz", icon: Puzzle },
  { href: "/album/", label: "Álbum", icon: Camera },
];

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
      <main className="px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rose-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        <ul className="mx-auto flex max-w-lg">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname === href.slice(0, -1);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                    active ? "text-rose-500" : "text-stone-400"
                  }`}
                >
                  <Icon className={`size-6 ${active ? "fill-rose-100" : ""}`} strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
