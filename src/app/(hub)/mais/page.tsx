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
import { PageHeader } from "@/components/ui";

const SECTIONS = [
  { href: "/pergunta", icon: MessageCircleHeart, title: "Pergunta do dia", text: "Respondam e descubram a resposta do outro", tone: "bg-rose-100 text-rose-600" },
  { href: "/recados", icon: Mail, title: "Recados", text: "Bilhetinhos, inclusive programados", tone: "bg-pink-100 text-pink-600" },
  { href: "/listas", icon: ListChecks, title: "Listas", text: "Filmes, restaurantes, viagens, compras…", tone: "bg-sky-100 text-sky-600" },
  { href: "/metas", icon: Target, title: "Metas do casal", text: "Coisas para fazer juntos", tone: "bg-emerald-100 text-emerald-600" },
  { href: "/datas", icon: PartyPopper, title: "Datas especiais", text: "Aniversários e datas que importam", tone: "bg-amber-100 text-amber-700" },
  { href: "/historia", icon: Milestone, title: "Nossa história", text: "A linha do tempo de vocês", tone: "bg-violet-100 text-violet-600" },
  { href: "/capsula", icon: Hourglass, title: "Cápsula do tempo", text: "Mensagens que só abrem no futuro", tone: "bg-indigo-100 text-indigo-600" },
  { href: "/perfil", icon: UserRound, title: "Perfil", text: "Seus dados, convite e sair", tone: "bg-stone-100 text-stone-600" },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="Mais" subtitle="Tudo o que vocês podem fazer juntos" />
      <ul className="flex flex-col gap-3">
        {SECTIONS.map(({ href, icon: Icon, title, text, tone }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-rose-100">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-stone-900">{title}</span>
                <span className="block text-sm text-stone-500">{text}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-stone-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
