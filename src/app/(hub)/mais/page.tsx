"use client";

import {
  ChevronRight,
  Hourglass,
  ListChecks,
  Mail,
  MessageCircleHeart,
  Milestone,
  PartyPopper,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Drop, Fancy, PageHeader, STICKER_TILTS } from "@/components/ui";

// Each section is an index card with a sticker, alternating tilt and tape colors like a scrapbook.
const SECTIONS = [
  { href: "/pergunta", icon: MessageCircleHeart, title: "Pergunta do dia", text: "respondam e descubram a resposta do outro", tone: "bg-sticker text-batom" },
  { href: "/recados", icon: Mail, title: "Recados", text: "bilhetinhos, inclusive programados", tone: "bg-envelope text-batom-dark" },
  { href: "/listas", icon: ListChecks, title: "Listas", text: "filmes, restaurantes, viagens, compras…", tone: "bg-sage-soft text-sage-ink" },
  { href: "/metas", icon: Target, title: "Metas do casal", text: "coisas para fazer juntos", tone: "bg-[#faf3e0] text-[#7a5a22]" },
  { href: "/datas", icon: PartyPopper, title: "Datas especiais", text: "aniversários e datas que importam", tone: "bg-sticker text-batom" },
  { href: "/historia", icon: Milestone, title: "Nossa história", text: "a linha do tempo de vocês", tone: "bg-sage-soft text-sage-ink" },
  { href: "/capsula", icon: Hourglass, title: "Cápsula do tempo", text: "mensagens que só abrem no futuro", tone: "bg-[#faf3e0] text-[#7a5a22]" },
  { href: "/perfil", icon: UserRound, title: "Perfil", text: "seus dados, convite e sair", tone: "bg-kraft text-muted" },
];

const TILTS = [-0.6, 0.5, -0.3, 0.6];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="Mais" subtitle="tudo o que vocês podem fazer juntos" />
      <ul className="flex flex-col gap-4">
        {SECTIONS.map(({ href, icon: Icon, title, text, tone }, i) => (
          <li key={href}>
            <Drop index={i}>
              <Link
                href={href}
                className="flex items-center gap-4 rounded-[6px] bg-sheet p-4 shadow-paper transition-[rotate] duration-300 [rotate:var(--tilt)] hover:[rotate:0deg]"
                style={{ "--tilt": `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full shadow-sticker ${tone}`}
                  style={{ rotate: `${STICKER_TILTS[i % STICKER_TILTS.length]}deg` }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[22px] leading-tight text-ink">
                    <Fancy text={title} />
                  </span>
                  <span className="block font-hand text-xl leading-tight text-muted">{text}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-terracota" />
              </Link>
            </Drop>
          </li>
        ))}
      </ul>
    </div>
  );
}
