"use client";

import { addDays } from "date-fns";
import { Check, Plus, Puzzle, Send, Trash2, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCouple } from "@/components/auth-provider";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Sheet,
  Spinner,
  Tabs,
} from "@/components/ui";
import { formatDay, parseDay, toDayString } from "@/lib/dates";
import { friendlyError, supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import type { Moment, QuizAnswer, QuizQuestion, QuizRound } from "@/lib/types";

const ROUND_SIZE = 10;

type RoundItem = { prompt: string; hint: string; options: string[]; correct: number };

type Data = {
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  rounds: QuizRound[];
  moments: Pick<Moment, "id" | "title" | "happened_on">[];
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function momentQuestion(moment: Data["moments"][number], all: Data["moments"]): RoundItem {
  const correct = moment.happened_on;
  const choices = new Set([correct]);
  for (const other of shuffle(all)) {
    if (choices.size >= 4) break;
    choices.add(other.happened_on);
  }
  while (choices.size < 4) {
    const offset = (Math.floor(Math.random() * 120) + 3) * (Math.random() < 0.5 ? -1 : 1);
    choices.add(toDayString(addDays(parseDay(correct), offset)));
  }
  const options = shuffle([...choices]);
  return {
    prompt: `Quando aconteceu “${moment.title}”?`,
    hint: "Pergunta do calendário de vocês",
    options: options.map((d) => formatDay(d)),
    correct: options.indexOf(correct),
  };
}

async function fetchQuizData(): Promise<Data> {
  const db = supabase();
  const [q, a, r, m] = await Promise.all([
    db.from("quiz_questions").select("id, couple_id, created_by, prompt, options").order("created_at"),
    db.from("quiz_answers").select("user_id, question_id, answer_index"),
    db.from("quiz_rounds").select("*").order("played_at", { ascending: false }).limit(30),
    db.from("moments").select("id, title, happened_on"),
  ]);
  return { questions: q.data ?? [], answers: a.data ?? [], rounds: r.data ?? [], moments: m.data ?? [] };
}

export default function QuizPage() {
  const { userId, partner } = useCouple();
  const [tab, setTab] = useState<"play" | "me" | "score">("play");

  const [data, load] = useLoader(fetchQuizData);

  const myAnswers = useMemo(
    () => new Map(data?.answers.filter((a) => a.user_id === userId).map((a) => [a.question_id, a.answer_index])),
    [data, userId],
  );

  return (
    <div>
      <PageHeader title="Quiz do casal" subtitle="Quem conhece mais o outro?" />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "play", label: "Jogar" },
          { value: "me", label: "Sobre mim" },
          { value: "score", label: "Placar" },
        ]}
      />
      {!data ? (
        <Spinner />
      ) : tab === "play" ? (
        <Play data={data} myAnsweredCount={myAnswers.size} onFinished={load} onGoToMe={() => setTab("me")} />
      ) : tab === "me" ? (
        <AboutMe data={data} myAnswers={myAnswers} onChanged={load} />
      ) : (
        <Scoreboard rounds={data.rounds} partnerName={partner?.display_name} />
      )}
    </div>
  );
}

function Play({
  data,
  myAnsweredCount,
  onFinished,
  onGoToMe,
}: {
  data: Data;
  myAnsweredCount: number;
  onFinished: () => Promise<void>;
  onGoToMe: () => void;
}) {
  const { partner } = useCouple();
  const [round, setRound] = useState<RoundItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const partnerItems = useMemo<RoundItem[]>(() => {
    if (!partner) return [];
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return data.answers.flatMap((a) => {
      const q = byId.get(a.question_id);
      if (a.user_id !== partner.id || !q || a.answer_index >= q.options.length) return [];
      return [{ prompt: q.prompt, hint: `O que ${partner.display_name} respondeu?`, options: q.options, correct: a.answer_index }];
    });
  }, [data, partner]);

  if (!partner) {
    return (
      <EmptyState
        icon={<Send className="size-6" />}
        title="Falta seu par!"
        text="O quiz é para jogar a dois. Convide seu amor para começar."
        action={<Link href="/perfil" className="font-semibold text-rose-600">Enviar convite</Link>}
      />
    );
  }

  const available = partnerItems.length + data.moments.length;

  function start() {
    const momentItems = shuffle(data.moments)
      .slice(0, 3)
      .map((m) => momentQuestion(m, data.moments));
    const items = shuffle([...shuffle(partnerItems).slice(0, ROUND_SIZE - momentItems.length), ...momentItems]);
    setRound(items);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  }

  async function next() {
    if (!round) return;
    if (index + 1 < round.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    setFinished(true);
    await supabase().from("quiz_rounds").insert({ score, total: round.length });
    await onFinished();
  }

  function pick(i: number) {
    if (picked !== null || !round) return;
    setPicked(i);
    if (i === round[index].correct) setScore((s) => s + 1);
  }

  if (round && finished) {
    const ratio = score / round.length;
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <Trophy className="size-12 text-amber-400" />
        <p className="text-4xl font-bold text-stone-900">
          {score}/{round.length}
        </p>
        <p className="text-stone-500">
          {ratio === 1
            ? `Perfeito! Você conhece ${partner.display_name} de cor 💯`
            : ratio >= 0.7
              ? "Mandou muito bem! 💕"
              : ratio >= 0.4
                ? "Nada mal — dá pra conhecer mais! 😉"
                : "Hora de um date para se conhecerem melhor 😅"}
        </p>
        <Button className="mt-4" onClick={start}>Jogar de novo</Button>
      </Card>
    );
  }

  if (round) {
    const item = round[index];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>
            Pergunta {index + 1} de {round.length}
          </span>
          <span className="font-semibold text-rose-600">{score} acertos</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-rose-100">
          <div className="h-full bg-rose-500 transition-all" style={{ width: `${((index + (picked !== null ? 1 : 0)) / round.length) * 100}%` }} />
        </div>
        <Card>
          <p className="text-xs font-semibold tracking-wide text-rose-500 uppercase">{item.hint}</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{item.prompt}</p>
        </Card>
        <div className="flex flex-col gap-2">
          {item.options.map((option, i) => {
            const state =
              picked === null ? "idle" : i === item.correct ? "correct" : i === picked ? "wrong" : "dim";
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left font-medium ring-1 transition ${
                  state === "correct"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-300"
                    : state === "wrong"
                      ? "bg-red-50 text-red-700 ring-red-300"
                      : state === "dim"
                        ? "bg-white text-stone-400 ring-stone-100"
                        : "bg-white text-stone-800 ring-rose-100 hover:ring-rose-300"
                }`}
              >
                {option}
                {state === "correct" && <Check className="size-5" />}
                {state === "wrong" && <X className="size-5" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <Button onClick={next}>{index + 1 < round.length ? "Próxima" : "Ver resultado"}</Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Puzzle className="size-10 text-rose-400" />
        <p className="text-lg font-bold text-stone-900">Quanto você conhece {partner.display_name}?</p>
        <p className="text-sm text-stone-500">
          {partnerItems.length} respostas de {partner.display_name} + perguntas sobre os momentos de vocês.
        </p>
        <Button className="mt-2" onClick={start} disabled={available === 0}>
          Começar rodada
        </Button>
        {partnerItems.length === 0 && (
          <p className="text-xs text-stone-400">
            {partner.display_name} ainda não respondeu nada em “Sobre mim”.
            {data.moments.length === 0 && " Registrem momentos no calendário para liberar perguntas."}
          </p>
        )}
      </Card>
      <button onClick={onGoToMe} className="rounded-2xl bg-violet-50 p-4 text-left text-sm ring-1 ring-violet-100">
        <span className="block font-semibold text-violet-900">
          Você respondeu {myAnsweredCount} de {data.questions.length} perguntas sobre você
        </span>
        <span className="text-violet-700">Quanto mais responder, mais perguntas {partner.display_name} tem para jogar →</span>
      </button>
    </div>
  );
}

function AboutMe({
  data,
  myAnswers,
  onChanged,
}: {
  data: Data;
  myAnswers: Map<string, number>;
  onChanged: () => Promise<void>;
}) {
  const { userId } = useCouple();
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function answer(question: QuizQuestion, index: number) {
    setSaving(question.id);
    await supabase()
      .from("quiz_answers")
      .upsert(
        { user_id: userId, question_id: question.id, answer_index: index, updated_at: new Date().toISOString() },
        { onConflict: "user_id,question_id" },
      );
    await onChanged();
    setSaving(null);
  }

  async function removeQuestion(question: QuizQuestion) {
    setSaving(question.id);
    await supabase().from("quiz_questions").delete().eq("id", question.id);
    await onChanged();
    setSaving(null);
  }

  const total = data.questions.length;
  const done = myAnswers.size;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-stone-500">Responda sobre você mesmo(a)</span>
          <span className="font-semibold text-rose-600">
            {done}/{total}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-rose-100">
          <div className="h-full bg-rose-500 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      <Button variant="secondary" onClick={() => setCreating(true)}>
        <Plus className="size-4" /> Criar pergunta própria
      </Button>

      {data.questions.map((q) => {
        const mine = myAnswers.get(q.id);
        return (
          <Card key={q.id} className={saving === q.id ? "opacity-60" : ""}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-semibold text-stone-900">{q.prompt}</p>
              {q.created_by === userId && (
                <button onClick={() => removeQuestion(q)} className="text-stone-300 hover:text-red-500" aria-label="Excluir pergunta">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => answer(q, i)}
                  disabled={saving === q.id}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mine === i ? "bg-rose-500 text-white" : "bg-rose-50 text-stone-700 hover:bg-rose-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </Card>
        );
      })}

      {creating && <NewQuestionSheet onClose={() => setCreating(false)} onCreated={onChanged} />}
    </div>
  );
}

function NewQuestionSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { userId } = useCouple();
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [myAnswer, setMyAnswer] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const filled = options.map((o) => o.trim());
    if (filled.some((o) => !o)) return setError("Preencha todas as opções.");
    setBusy(true);
    const db = supabase();
    const { data, error } = await db
      .from("quiz_questions")
      .insert({ prompt: prompt.trim(), options: filled, created_by: userId })
      .select("id")
      .single();
    if (!error && data) {
      await db.from("quiz_answers").insert({ user_id: userId, question_id: data.id, answer_index: myAnswer });
    }
    setBusy(false);
    if (error) return setError(friendlyError(error));
    await onCreated();
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Nova pergunta">
      <form onSubmit={save} className="flex flex-col gap-5">
        <Field label="Pergunta sobre você" hint="Ex: Qual meu doce favorito?">
          <Input required value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-700">Opções — marque a sua resposta</span>
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMyAnswer(i)}
                aria-label={`Opção ${i + 1} é a minha resposta`}
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ${
                  myAnswer === i ? "bg-rose-500 text-white ring-rose-500" : "text-transparent ring-stone-300"
                }`}
              >
                <Check className="size-4" />
              </button>
              <Input
                value={option}
                placeholder={`Opção ${i + 1}`}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label="Remover opção"
                  className="text-stone-400"
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i));
                    setMyAnswer((a) => (a === i ? 0 : a > i ? a - 1 : a));
                  }}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button type="button" variant="ghost" onClick={() => setOptions([...options, ""])}>
              <Plus className="size-4" /> Adicionar opção
            </Button>
          )}
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={busy}>Criar pergunta</Button>
      </form>
    </Sheet>
  );
}

function Scoreboard({ rounds, partnerName }: { rounds: QuizRound[]; partnerName?: string }) {
  const { profile, partner } = useCouple();
  const people = [profile, ...(partner ? [partner] : [])];

  if (!rounds.length) {
    return <EmptyState icon={<Trophy className="size-6" />} title="Nenhuma rodada ainda" text="Joguem uma rodada para aparecer no placar." />;
  }

  const stats = people.map((p) => {
    const mine = rounds.filter((r) => r.player_id === p.id);
    const score = mine.reduce((s, r) => s + r.score, 0);
    const total = mine.reduce((s, r) => s + r.total, 0);
    return { person: p, rounds: mine.length, pct: total ? Math.round((score / total) * 100) : 0 };
  });
  const nameOf = (id: string) => (id === profile.id ? "Você" : partnerName ?? "Seu par");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ person, rounds, pct }) => (
          <Card key={person.id} className="flex flex-col items-center gap-2 text-center">
            <Avatar name={person.display_name} />
            <p className="font-semibold text-stone-900">{person.id === profile.id ? "Você" : person.display_name}</p>
            <p className="text-3xl font-bold text-rose-500">{pct}%</p>
            <p className="text-xs text-stone-500">
              de acertos em {rounds} {rounds === 1 ? "rodada" : "rodadas"}
            </p>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="mb-3 font-semibold text-stone-900">Últimas rodadas</h3>
        <ul className="flex flex-col divide-y divide-rose-50">
          {rounds.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-stone-700">{nameOf(r.player_id)}</span>
              <span className="text-stone-400">{formatDay(new Date(r.played_at), "d MMM")}</span>
              <span className="font-semibold text-stone-900">
                {r.score}/{r.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
