"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Wand2 } from "lucide-react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { matchDestinations, type QuizMatch } from "@/lib/destinations/quiz";
import type { Destination, Vibe, Budget, GroupFit } from "@/lib/destinations/data";
import { addDaysISO } from "@/lib/date-utils";

// Combines a manual destination quiz with optional AI trip search: describe
// your trip to prefill three quick-select groups (vibe/budget/group), then
// review and correct before seeing matches. Skip the description entirely
// and it behaves as a plain manual quiz — the AI is a convenience layered
// on top, never a required step.
export function TripFinderModal() {
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  // Single note slot covers any non-happy-path AI outcome (parse failure,
  // rate limit, network error) — none of them block the quick-select
  // buttons below, which stay clickable regardless.
  const [aiNote, setAiNote] = useState<string | null>(null);

  // "any" is a real third choice, not just an unanswered state — see
  // lib/destinations/quiz.ts. `null` means nothing picked yet.
  const [vibe, setVibe] = useState<Vibe | "any" | null>(null);
  const [budget, setBudget] = useState<Budget | "any" | null>(null);
  const [group, setGroup] = useState<GroupFit | "any" | null>(null);
  // Best-effort AI extractions for the flights/hotels prefill links; no
  // manual fallback, used as-is when provided.
  const [date, setDate] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<number | null>(null);

  const [phase, setPhase] = useState<"answer" | "results">("answer");
  const [matches, setMatches] = useState<QuizMatch[]>([]);

  async function handleAiFill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiLoading(true);
    setAiNote(null);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setAiNote(body?.error ?? "Something went wrong — pick below instead.");
        return;
      }

      const data = (await res.json()) as {
        understood: boolean;
        vibe: Vibe | null;
        budget: Budget | null;
        group: GroupFit | null;
        date: string | null;
        travelers: number | null;
      };

      if (!data.understood) {
        setAiNote("Couldn't quite tell from that — pick below instead.");
        return;
      }

      // Pre-selects the same buttons a manual visitor would click, rather
      // than jumping straight to results — a wrong guess is visible and
      // correctable before it affects anything.
      setVibe(data.vibe);
      setBudget(data.budget);
      setGroup(data.group);
      setDate(data.date);
      setTravelers(data.travelers);
    } catch {
      setAiNote("Couldn't reach the server — pick below instead.");
    } finally {
      setAiLoading(false);
    }
  }

  const canSeeMatches = Boolean(vibe && budget && group);

  function showMatches() {
    if (!vibe || !budget || !group) return;
    setMatches(matchDestinations({ vibe, budget, group }));
    setPhase("results");
  }

  function reset() {
    setQuery("");
    setAiLoading(false);
    setAiNote(null);
    setVibe(null);
    setBudget(null);
    setGroup(null);
    setDate(null);
    setTravelers(null);
    setPhase("answer");
    setMatches([]);
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        // State lives here, not in DialogContent, so it's cleared
        // explicitly on close rather than surviving unintentionally.
        if (!open) reset();
      }}
    >
      {/* Floating trigger, mounted globally in app/layout.tsx. */}
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Find your destination"
          title="Find your destination"
          className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-sand/30 bg-ink text-paper shadow-[0_12px_28px_-8px_rgba(22,35,43,0.55)] transition-transform hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
        >
          <Wand2 className="h-6 w-6" strokeWidth={1.5} />
        </button>
      </DialogTrigger>

      <DialogContent>
        {phase === "answer" ? (
          <>
            <DialogHeader>
              <DialogTitle>Find your destination</DialogTitle>
              <DialogDescription>
                Describe your trip below, or just pick from the options — either way, you can
                fine-tune before we match you.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <form onSubmit={handleAiFill} className="flex flex-col gap-2">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="A relaxing beach trip for two on a budget, sometime next month…"
                  rows={2}
                  maxLength={300}
                  disabled={aiLoading}
                  className="w-full resize-none border border-line bg-paper px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={aiLoading || query.trim().length < 3}
                  className="w-full border border-ink px-5 py-2.5 text-[12.5px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {aiLoading ? "Thinking…" : "Fill in for me"}
                </button>
                {aiNote && <p className="text-[12.5px] text-ink-soft">{aiNote}</p>}
              </form>

              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <AnswerGroup label="Vibe" options={VIBE_OPTIONS} value={vibe} onChange={setVibe} />
                <AnswerGroup
                  label="Budget"
                  options={BUDGET_OPTIONS}
                  value={budget}
                  onChange={setBudget}
                />
                <AnswerGroup
                  label="Who's this for"
                  options={GROUP_OPTIONS}
                  value={group}
                  onChange={setGroup}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={showMatches}
                  disabled={!canSeeMatches}
                  className="w-full border border-ink bg-ink px-5 py-3 text-[12.5px] uppercase tracking-[0.08em] text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  See my matches
                </button>
                {!canSeeMatches && (
                  <p className="mt-2 text-center text-[12px] text-ink-soft">
                    Pick all three above (or describe your trip) to see matches — not sure about
                    one? Pick &ldquo;I&rsquo;m not sure&rdquo; and we&rsquo;ll widen the search
                    instead of guessing.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{matches.length > 1 ? "Your best matches" : "Your match"}</DialogTitle>
              <DialogDescription>
                {date
                  ? "Based on what you picked — the date below is our best guess, worth double-checking before you search."
                  : "Based on what you picked."}
              </DialogDescription>
            </DialogHeader>

            {/* Capped at 3 matches. Scroll area kept even at that size so
                the list has room above the header/footer buttons on a
                small phone. */}
            <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1">
              {matches.map(({ destination }) => (
                <div key={destination.slug} className="border border-line bg-paper-raised p-3">
                  <Link href={`/destinations/${destination.slug}`} className="group flex gap-4">
                    <div className="relative h-20 w-24 flex-none overflow-hidden">
                      <Image
                        src={destination.photo}
                        alt={destination.name}
                        fill
                        sizes="96px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[15px] text-ink transition-colors group-hover:underline">
                        {destination.name}
                      </p>
                      <p className="text-[12px] text-ink-soft">{destination.region}</p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-soft">
                        {destination.blurb}
                      </p>
                    </div>
                  </Link>

                  {/* Prefilled search links, not just a link to the
                      destination page above. */}
                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <DialogClose asChild>
                      <Link
                        href={buildFlightsHref(destination, date, travelers)}
                        className="flex-1 border border-ink px-3 py-2 text-center text-[11.5px] uppercase tracking-[0.06em] text-ink transition-colors hover:bg-ink hover:text-paper"
                      >
                        Search flights
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <Link
                        href={buildHotelsHref(destination, date, travelers)}
                        className="flex-1 border border-ink px-3 py-2 text-center text-[11.5px] uppercase tracking-[0.06em] text-ink transition-colors hover:bg-ink hover:text-paper"
                      >
                        Search hotels
                      </Link>
                    </DialogClose>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPhase("answer")}
                className="text-center text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Adjust my answers
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-center text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Describe another trip
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// "any" ("I'm not sure") is a real fourth answer, not a blank — see
// lib/destinations/quiz.ts. Listed last so the three real options read first.
const VIBE_OPTIONS: { value: Vibe | "any"; label: string }[] = [
  { value: "beach", label: "Relax on a beach" },
  { value: "adventure", label: "Chase adventure" },
  { value: "culture", label: "Explore culture & history" },
  { value: "any", label: "I'm not sure" },
];

const BUDGET_OPTIONS: { value: Budget | "any"; label: string }[] = [
  { value: "budget", label: "Keep it affordable" },
  { value: "mid", label: "Somewhere in the middle" },
  { value: "splurge", label: "Treat yourself" },
  { value: "any", label: "I'm not sure" },
];

const GROUP_OPTIONS: { value: GroupFit | "any"; label: string }[] = [
  { value: "solo", label: "Just me" },
  { value: "partner", label: "Me and a partner" },
  { value: "group", label: "Family or friends" },
  { value: "any", label: "I'm not sure" },
];

// Compact pill row keeps three question groups on screen at once without
// running the dialog taller than most phone screens. The filled style on
// the selected option makes an AI-prefilled answer visibly reviewable.
function AnswerGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "border px-2.5 py-1.5 text-[12px] transition-colors",
              // Dashed border + italic marks "any" as opting out, not a
              // real preference alongside the other three.
              option.value === "any" && "border-dashed italic",
              value === option.value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-soft hover:border-ink hover:text-ink"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Builds a link into the homepage search bar, prefilled with this match's
// airport and (when available) the trip's date/traveler count.
function buildFlightsHref(destination: Destination, date: string | null, travelers: number | null): string {
  const params = new URLSearchParams({ prefillTab: "flights", prefillTo: destination.nearestAirport });
  if (date) params.set("prefillDepart", date);
  if (travelers) params.set("prefillAdults", String(travelers));
  return `/?${params.toString()}#search-results`;
}

// Same idea for the hotels tab. `prefillCheckOut` is set to the day after
// `date` since SearchBar doesn't auto-fill it — leaving it blank would show
// one date field filled and the other empty, which reads as broken.
function buildHotelsHref(destination: Destination, date: string | null, travelers: number | null): string {
  const params = new URLSearchParams({ prefillTab: "hotels", prefillDestination: destination.name });
  if (date) {
    params.set("prefillCheckIn", date);
    params.set("prefillCheckOut", addDaysISO(date, 1));
  }
  if (travelers) params.set("prefillGuests", String(travelers));
  return `/?${params.toString()}#search-results`;
}
