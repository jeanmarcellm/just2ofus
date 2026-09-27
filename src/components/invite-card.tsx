"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { friendlyError, siteUrl, supabase } from "@/lib/supabase";

export function InviteCard({ inviterName }: { inviterName: string }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Only rendered client-side after auth has loaded, so navigator is available.
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

  useEffect(() => {
    supabase()
      .rpc("create_invite")
      .then(({ data, error }) => {
        if (error) setError(friendlyError(error));
        else setLink(`${siteUrl()}/convite/?token=${data}`);
      });
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    await navigator
      .share({
        title: "Just2Ofus",
        text: `${inviterName} te convidou para o nosso cantinho no Just2Ofus 💕`,
        url: link,
      })
      .catch(() => {});
  }

  if (error) return <ErrorText>{error}</ErrorText>;

  return (
    <div className="flex flex-col gap-3">
      <div className="break-all rounded-xl bg-rose-50 px-4 py-3 font-mono text-xs text-stone-600">
        {link || "Gerando link…"}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={copy} disabled={!link}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        {canShare && (
          <Button className="flex-1" onClick={share} disabled={!link}>
            <Share2 className="size-4" />
            Compartilhar
          </Button>
        )}
      </div>
    </div>
  );
}
