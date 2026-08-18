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

// Halina-Revamp-Plan.md section 43. This replaces two separate features —
// the hard-coded destination quiz (destination-quiz-modal.tsx, section 35)
// and the AI trip search (ai-trip-search-modal.tsx, sections 39-42) — with
// one. They used to be genuinely redundant: both ultimately called
// matchDestinations() against the same three tags (vibe/budget/group), so
// for the same intent they always produced the same destinations —
// clicking three buttons or describing a sentence were just two different
// front doors into the identical result. Worse, the AI's classification
// wasn't even reliably correct (a real bug: "mountain views" got mapped to
// "beach" — fixed separately in lib/ai/trip-search.ts's RESPONSE_SCHEMA,
// see that file's comments), and a wrong AI guess used to be a dead end —
// the old ai-trip-search-modal.tsx just showed whatever Gemini said, with
// no way to correct it before seeing results.
//
// This component fixes both problems by merging the two into one flow
// that's always reviewable and always has a manual fallback: describe your
// trip (optional) to prefill three quick-select button groups — the exact
// same three questions the old quiz asked, just all visible at once
// instead of one-at-a-time — then review, correct if needed, and see your
// matches. Skip the sentence entirely and it behaves exactly like the old
// free quiz always did: click three buttons, get matches, no AI call ever
// made. The AI is now a genuine convenience layered on top of the always-
// available manual path, not a separate, parallel feature with its own
// failure modes.
export function TripFinderModal() {
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  // A single inline note slot covers every non-happy-path outcome from the
  // AI call — "couldn't understand," a validation/rate-limit error, or a
  // real network failure. The old ai-trip-search-modal.tsx gave each of
  // those its own full dead-end screen; here, none of them block anything,
  // since the three quick-select buttons below are always still clickable
  // by hand regardless of what the AI call did or didn't manage to do.
  const [aiNote, setAiNote] = useState<string | null>(null);

  // "any" (section 46) is a genuine third choice on every question, not
  // just an unanswered state — see lib/destinations/quiz.ts's own comment
  // for why it exists. `null` still means "hasn't picked anything yet,"
  // same as before.
  const [vibe, setVibe] = useState<Vibe | "any" | null>(null);
  const [budget, setBudget] = useState<Budget | "any" | null>(null);
  const [group, setGroup] = useState<GroupFit | "any" | null>(null);
  // date/travelers (section 42) still ride along for the "search flights/
  // hotels" prefill links on the results screen — they're best-effort and
  // have no manual equivalent to correct them with, unlike vibe/budget/
  // group, so they're just used as-is when the AI provided them.
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

      // This is the fix for "the AI seems inaccurate": rather than trusting
      // this guess straight into a results screen, it just pre-selects the
      // same three buttons a manual visitor would click — visibly, so a
      // wrong guess (like "beach" for a mountain-view sentence) is
      // something you SEE and can immediately click a different answer
      // for, not something you'd only notice in the final destination list.
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
        // Same reasoning as the old ai-trip-search-modal.tsx: this
        // component's state lives here, not inside DialogContent, so it
        // survives a close/reopen unless explicitly reset.
        if (!open) reset();
      }}
    >
      {/* The same floating bubble from section 41 — still mounted once,
          globally, in app/layout.tsx, still reachable from every page.
          Label updated from "Describe your dream trip" to "Find your
          destination" since typing a sentence is now optional, not the
          only way in. */}
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

            {/* Up to 3 cards (section 50, down from section 46's 5 — keeps
                the list feeling like "the best matches" now that the
                destination pool is 38-wide, section 49). The scroll area
                is kept even at 3, since a shorter list still needs room to
                breathe above the header/footer buttons on a small phone. */}
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

                  {/* Same section 42 upgrade as before: a real, prefilled
                      search, not just a link to the destination's own info
                      page above. */}
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

// Same three questions and same option copy as the old destination-quiz-
// modal.tsx, plus one addition as of section 46: a fourth "I'm not sure"
// pill on every question, value "any" — a genuine third answer (see
// lib/destinations/quiz.ts), not a way to leave the question blank. It's
// listed last on each row so the three real options still read first.
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

// A compact row of pill-style buttons rather than the old quiz's full-
// width, one-per-line options — with three question groups now all on
// screen at once (instead of one at a time), a full-width stacked layout
// would make this dialog taller than a lot of phone screens. The filled/
// inverted style on the selected option is what makes an AI-prefilled
// answer visibly reviewable: you can see exactly what got picked before
// committing to it, which is the whole point of this redesign.
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
              // "any" ("I'm not sure") gets a dashed border and italic
              // label instead of the normal solid style, whether selected
              // or not — a visual cue that it's a wildcard opting OUT of
              // that question, not a fourth real preference sitting
              // alongside the other three.
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

// Builds a link into the homepage's own search bar, prefilled with this
// match's airport and (when available) the trip's own date/traveler count
// — see Halina-Revamp-Plan.md section 42 for the full history of this
// query-string contract (app/page.tsx, components/sections/hero.tsx, and
// SearchBar's own `initial*` props all had to cooperate to make this work,
// including a real same-route-navigation bug that needed a `key` fix).
function buildFlightsHref(destination: Destination, date: string | null, travelers: number | null): string {
  const params = new URLSearchParams({ prefillTab: "flights", prefillTo: destination.nearestAirport });
  if (date) params.set("prefillDepart", date);
  if (travelers) params.set("prefillAdults", String(travelers));
  return `/?${params.toString()}#search-results`;
}

// Same idea as buildFlightsHref, for the hotels tab. `prefillCheckOut` is
// deliberately set to the day after `date` — SearchBar's own check-out
// field has no auto-fill-from-check-in behavior of its own, so leaving it
// unset here would land on a form with one date field filled and the
// other empty, which reads as broken rather than "not extracted."
function buildHotelsHref(destination: Destination, date: string | null, travelers: number | null): string {
  const params = new URLSearchParams({ prefillTab: "hotels", prefillDestination: destination.name });
  if (date) {
    params.set("prefillCheckIn", date);
    params.set("prefillCheckOut", addDaysISO(date, 1));
  }
  if (travelers) params.set("prefillGuests", String(travelers));
  return `/?${params.toString()}#search-results`;
}
