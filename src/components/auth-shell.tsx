import { Heart } from "lucide-react";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link href="/" className="mb-10 flex items-center gap-2 self-start text-rose-500">
        <Heart className="size-6 fill-rose-500" />
        <span className="text-lg font-bold tracking-tight">Just2Ofus</span>
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
      {subtitle && <p className="mt-2 text-stone-500">{subtitle}</p>}
      <div className="mt-8 flex flex-col gap-5">{children}</div>
    </main>
  );
}
