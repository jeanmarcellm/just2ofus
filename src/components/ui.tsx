"use client";

import { ChevronLeft, Heart, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// "Diário de nós dois" kit: paper, washi tape, polaroids and handwriting.
// Colors and shadows are tokens in globals.css (bg-sheet, text-batom, shadow-paper…).

const TAPE = {
  rose: "rgba(229,168,170,.62)",
  sage: "rgba(176,199,170,.65)",
  mustard: "rgba(236,214,150,.7)",
};
const TAPE_TEXTURE = "repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 4px, transparent 4px 9px)";

export type TapeColor = keyof typeof TAPE;

// Absolutely positioned strip of washi tape; place it inside a `relative` parent.
export function Tape({
  color = "rose",
  className = "",
  rotate = -4,
  textured = false,
  style,
}: {
  color?: TapeColor;
  className?: string;
  rotate?: number;
  textured?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 block ${className}`}
      style={{
        background: TAPE[color],
        backgroundImage: textured ? TAPE_TEXTURE : undefined,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    />
  );
}

// Last word in italic, as in "Como você está *hoje?*". Single words stay upright.
export function Fancy({ text, accent = false }: { text: string; accent?: boolean }) {
  const i = text.lastIndexOf(" ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i + 1)}
      <em className={accent ? "text-batom" : ""}>{text.slice(i + 1)}</em>
    </>
  );
}

function SpinnerDot({ light = true }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 animate-spin-soft rounded-full border-2 ${
        light ? "border-sheet/40 border-t-sheet" : "border-batom/30 border-t-batom"
      }`}
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  loading?: boolean;
};

// "Physical" buttons: a solid shadow underneath that disappears when pressed, plus an inner dashed stitch.
const VARIANTS = {
  primary:
    "rounded-[14px] bg-batom text-sheet outline outline-1 outline-dashed outline-sheet/55 shadow-[0_3px_0_#8d3344] hover:bg-batom-hover active:translate-y-[3px] active:shadow-[0_0_0_#8d3344]",
  secondary:
    "rounded-[14px] bg-sheet text-ink outline outline-[1.5px] outline-dashed outline-rose-line shadow-[0_3px_0_#e8d9cc] active:translate-y-[3px] active:shadow-[0_0_0_#e8d9cc]",
  ghost:
    "text-batom underline decoration-wavy decoration-rose-wave underline-offset-[6px] hover:decoration-batom",
  danger:
    "rounded-[14px] bg-sheet text-danger outline outline-[1.5px] outline-dashed outline-[#e19a9a] shadow-[0_3px_0_#f0d3cf] active:translate-y-[3px] active:shadow-[0_0_0_#f0d3cf]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizing =
    variant === "ghost"
      ? "min-h-[46px] px-3.5 text-[15px]"
      : size === "lg"
        ? "min-h-[52px] px-[22px] text-base outline-offset-[-6px]"
        : "min-h-[46px] px-[22px] text-[15px] outline-offset-[-5px]";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-[transform,box-shadow,background-color,text-decoration-color] duration-[120ms] disabled:pointer-events-none disabled:opacity-60 ${sizing} ${VARIANTS[variant]} ${loading ? "opacity-75" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <SpinnerDot light={variant === "primary"} />}
      {children}
    </button>
  );
}

// Same look as Button, for navigation.
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  const sizing = size === "lg" ? "min-h-[52px] px-[22px] text-base outline-offset-[-6px]" : "min-h-[46px] px-[22px] text-[15px] outline-offset-[-5px]";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-[transform,box-shadow] duration-[120ms] ${sizing} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

// Wavy-underlined text link used for "ver todos →" and inline links.
export function HandLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`font-hand text-[21px] leading-none text-batom hover:text-batom-dark ${className}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex flex-col gap-0.5">
      <span className="font-hand text-[21px] leading-tight text-muted transition-colors group-focus-within:text-batom">{label}</span>
      {children}
      {hint && <span className="mt-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}

// Inputs have no box: only an underline that turns batom on focus.
const INPUT =
  "w-full rounded-none border-0 border-b-[1.5px] border-line bg-transparent px-0 py-2 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-batom";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ""}`} />;
}

// Lined notebook paper written in Caveat.
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      placeholder="escreva com carinho…"
      {...props}
      className={`j2-lined w-full resize-none rounded-[4px] border-0 px-3 font-hand text-[22px] leading-8 text-ink shadow-[0_6px_14px_-8px_rgba(80,50,40,.3)] outline-none placeholder:text-faint focus:shadow-[0_6px_14px_-8px_rgba(80,50,40,.3),0_0_0_1.5px_#e3b5ba] ${props.className ?? ""}`}
    />
  );
}

export function Card({
  className = "",
  tape = false,
  tilt = 0,
  children,
}: {
  className?: string;
  tape?: TapeColor | false;
  tilt?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-[6px] bg-sheet p-5 shadow-paper ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {tape && <Tape color={tape} className="-top-[11px] left-1/2 -ml-[38px] h-6 w-[76px]" rotate={-4} />}
      {children}
    </div>
  );
}

// A sticky note in red: errors read like a handwritten warning.
export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rotate-[-0.8deg] rounded-[4px] bg-danger-bg px-3.5 py-2.5 font-hand text-[21px] leading-tight text-danger shadow-[0_4px_10px_-6px_rgba(160,50,50,.4)]"
    >
      {children}
    </p>
  );
}

function BeatingHeart({ className = "size-8" }: { className?: string }) {
  return <Heart className={`animate-beat fill-batom text-batom ${className}`} aria-label="Carregando" />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <BeatingHeart className="size-7" />
    </div>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <BeatingHeart />
    </div>
  );
}

// An empty polaroid floating, waiting for its first memory.
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="rotate-[-4deg]">
        <div className="w-[84px] animate-float bg-sheet p-1.5 pb-[22px] shadow-[0_8px_16px_-6px_rgba(80,50,40,.35)]">
          <div className="flex h-[70px] items-center justify-center border-[1.5px] border-dashed border-[#e3cfc2] text-[#c9a59c] [&_svg]:size-6 [&_svg]:stroke-[1.75]">
            {icon}
          </div>
        </div>
      </div>
      <p className="mt-4 font-serif text-[22px] leading-tight text-ink">{title}</p>
      {text && <p className="mt-0.5 max-w-xs font-hand text-xl leading-tight text-muted">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const SHEET_CLOSE_MS = 320;

// A letter sliding up, held by a strip of tape. Closing from inside animates out before unmounting.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const requestClose = useCallback(() => {
    setClosing(true);
    timer.current = setTimeout(() => {
      setClosing(false);
      onClose();
    }, SHEET_CLOSE_MS);
  }, [onClose]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, requestClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-[rgba(58,42,38,.32)] transition-opacity duration-300 ${closing ? "opacity-0" : "animate-[j2fade_.35s_ease-out]"}`}
        onClick={requestClose}
      />
      <div
        className={`relative max-h-[90dvh] w-full max-w-lg rounded-t-[22px] bg-sheet shadow-[0_-10px_30px_-10px_rgba(80,50,40,.35)] transition-transform duration-300 ease-in sm:mb-6 sm:rounded-[22px] ${
          closing ? "translate-y-[105%]" : "animate-[j2sheet_.55s_cubic-bezier(.3,1.25,.5,1)]"
        }`}
      >
        <Tape color="rose" textured className="-top-[11px] left-1/2 -ml-[38px] h-6 w-[76px]" rotate={-2} />
        <div className="max-h-[90dvh] overflow-y-auto px-[26px] pt-[30px] pb-[calc(26px+env(safe-area-inset-bottom))]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-serif text-[28px] leading-tight text-ink">
              <Fancy text={title} />
            </h2>
            <button
              onClick={requestClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kraft text-muted transition hover:bg-[#ede0d1]"
              aria-label="Fechar"
            >
              <X className="size-[18px]" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-serif text-4xl leading-none tracking-[-0.01em] text-ink">
          <Fancy text={title} />
        </h1>
        {subtitle && <p className="mt-1 font-hand text-[22px] leading-tight text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function BackButton({ href = "/mais", onClick }: { href?: string; onClick?: () => void }) {
  const className = "flex size-9 shrink-0 items-center justify-center rounded-full bg-kraft text-muted transition hover:bg-[#ede0d1]";
  if (onClick) {
    return (
      <button onClick={onClick} className={className} aria-label="Voltar">
        <ChevronLeft className="size-5" />
      </button>
    );
  }
  return (
    <Link href={href} className={className} aria-label="Voltar">
      <ChevronLeft className="size-5" />
    </Link>
  );
}

// Header for pages reached from "Mais": same look as PageHeader plus a back link.
export function SubPageHeader({
  title,
  subtitle,
  action,
  back = "/mais",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: string;
}) {
  return (
    <header className="flex flex-col gap-3 pb-6">
      <div className="flex items-center justify-between gap-3">
        <BackButton href={back} />
        {action}
      </div>
      <div>
        <h1 className="font-serif text-4xl leading-none tracking-[-0.01em] text-ink">
          <Fancy text={title} />
        </h1>
        {subtitle && <p className="mt-1 font-hand text-[22px] leading-tight text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}

// Section title inside a page: serif with the last word in italic, optional "ver todos →" link.
export function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-serif text-[26px] leading-tight text-ink">
        <Fancy text={title} />
      </h2>
      {href && <HandLink href={href}>{linkLabel ?? "ver todos →"}</HandLink>}
    </div>
  );
}

const AVATAR_TONES = {
  me: "bg-blush text-batom-dark",
  partner: "bg-sage-soft text-sage-ink",
};
const AVATAR_SIZES = {
  sm: { frame: "w-9 p-[3px] pb-[9px]", inner: "h-[30px] text-base" },
  md: { frame: "w-11 p-1 pb-3", inner: "h-10 text-[22px]" },
  lg: { frame: "w-12 p-1 pb-3", inner: "h-11 text-2xl" },
};

// Avatar as a mini polaroid with initials (or any content, e.g. a mood emoji).
export function Avatar({
  name,
  tone = "me",
  size = "md",
  tilt = -6,
  children,
  className = "",
}: {
  name: string;
  tone?: keyof typeof AVATAR_TONES;
  size?: keyof typeof AVATAR_SIZES;
  tilt?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const s = AVATAR_SIZES[size];
  return (
    <span
      className={`inline-block shrink-0 bg-sheet shadow-polaroid-sm ${s.frame} ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-label={name}
    >
      <span className={`flex items-center justify-center font-serif leading-none ${s.inner} ${AVATAR_TONES[tone]}`}>
        {children ?? (initials || "?")}
      </span>
    </span>
  );
}

// Two overlapping polaroids held by a pin, for the couple.
export function CouplePolaroids({ me, partner }: { me: string; partner?: string | null }) {
  return (
    <span className="relative block h-[60px] w-24">
      <Avatar name={me} tilt={-8} className="absolute top-1 left-0" />
      {partner && <Avatar name={partner} tone="partner" tilt={7} className="absolute top-0 right-0" />}
      <span className="absolute -top-1 left-[39px] z-10 flex size-[18px] items-center justify-center rounded-full bg-batom shadow-[0_2px_4px_rgba(0,0,0,.25)]">
        <Heart className="size-2.5 fill-sheet text-sheet" />
      </span>
    </span>
  );
}

// Binder dividers: the active tab sits flush on the paper strip below; inactive ones drop a little.
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="mb-5" role="tablist">
      <div className="flex gap-1 overflow-x-auto pl-2.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={`shrink-0 rounded-t-xl px-4 pt-[9px] pb-2 text-sm font-semibold whitespace-nowrap shadow-[0_-2px_6px_-4px_rgba(80,50,40,.3)] transition-all duration-[250ms] ease-spring ${
                active ? "translate-y-0 bg-sheet text-batom" : "translate-y-1 bg-[#f1dcd8] text-muted"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="relative z-[1] h-3 rounded-tl-[4px] rounded-tr-xl bg-sheet shadow-[0_6px_10px_-8px_rgba(80,50,40,.35)]" />
    </div>
  );
}

// Sticky-note tilts, reused by every sticker row so they never line up perfectly.
export const STICKER_TILTS = [-6, 4, -3, 7, -5, 3, -7, 5];

// Emojis as round stickers with a white die-cut border.
export function EmojiPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (emoji: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2.5 p-1">
      {options.map((emoji, i) => {
        const active = value === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            aria-pressed={active}
            className={`flex size-11 items-center justify-center rounded-full text-[22px] shadow-sticker transition-transform duration-[350ms] ease-bouncy ${
              active ? "bg-sticker" : "bg-[#f7f0e6]"
            }`}
            style={{ transform: active ? "scale(1.18) rotate(-8deg)" : `rotate(${STICKER_TILTS[i % STICKER_TILTS.length]}deg)` }}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

// Dashed little box that fills with a heart when checked; the real input stays for accessibility.
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[15px] font-medium text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex size-6 items-center justify-center rounded-md bg-sheet outline outline-[1.5px] outline-dashed outline-rose-line peer-focus-visible:outline-batom">
        <Heart
          className={`size-4 fill-batom text-batom transition-transform duration-[350ms] ease-[cubic-bezier(.3,1.8,.5,1)] ${checked ? "scale-100" : "scale-0"}`}
        />
      </span>
      {label}
    </label>
  );
}

// Polaroid frame for real photos or placeholders.
export function Polaroid({
  src,
  alt = "",
  caption,
  tilt = 0,
  tape,
  className = "",
  imgClassName = "h-[104px]",
}: {
  src?: string;
  alt?: string;
  caption?: React.ReactNode;
  tilt?: number;
  tape?: TapeColor;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`relative bg-sheet p-1.5 pb-[30px] shadow-polaroid ${className}`} style={{ transform: `rotate(${tilt}deg)` }}>
      {tape && <Tape color={tape} className="-top-[9px] left-1/2 -ml-[23px] h-[18px] w-[46px]" rotate={tilt > 0 ? 4 : -5} />}
      {src ? (
        // Signed storage URLs: next/image optimization is unavailable in static export.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className={`w-full object-cover ${imgClassName}`} />
      ) : (
        <div className={`w-full bg-[repeating-linear-gradient(135deg,#eadfd3_0_6px,#f2e9de_6px_12px)] ${imgClassName}`} />
      )}
      {caption && <p className="absolute inset-x-0 bottom-1 truncate px-1 text-center font-hand text-[19px] leading-6 text-ink">{caption}</p>}
    </div>
  );
}

// Round wax seal with a white heart (or any icon).
export function WaxSeal({ size = 46, children, className = "" }: { size?: number; children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-batom text-sheet shadow-[inset_0_-3px_0_rgba(0,0,0,.18),0_4px_10px_-2px_rgba(140,50,60,.5)] ${className}`}
      style={{ width: size, height: size }}
    >
      {children ?? <Heart className="fill-sheet text-sheet" style={{ width: size * 0.43, height: size * 0.43 }} />}
    </span>
  );
}

// Staggered entrance for blocks on a page. Wraps the block because cards carry their own rotate().
export function Drop({ index = 0, className = "", children }: { index?: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`animate-drop ${className}`} style={{ animationDelay: `${0.05 + index * 0.1}s` }}>
      {children}
    </div>
  );
}
