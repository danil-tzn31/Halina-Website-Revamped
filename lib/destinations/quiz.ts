import { DESTINATIONS, type Destination, type Vibe, type Budget, type GroupFit } from "./data";

// Shared logic, not copy-pasted into the modal component — the scoring
// rule lives in one place, components/destinations/destination-quiz-modal.tsx
// just calls it. "any" (surfaced in the UI as "I'm not sure") is a real,
// selectable third option on every question: picking it for budget still
// lets vibe and group narrow the results, instead of forcing a guess that
// could rule out an otherwise good fit.
export type QuizAnswers = {
  vibe: Vibe | "any";
  budget: Budget | "any";
  group: GroupFit | "any";
};

export type QuizMatch = {
  destination: Destination;
  score: number;
};

// Simple point-matching: one point per answer that matches a destination's
// own tags (lib/destinations/data.ts), out of a max of 3. Deliberately not
// weighted — a more "precise"-looking score would pretend to more rigor
// than three hand-picked tags support. An "any" answer is left out of
// scoring entirely: it neither earns nor costs a point.
//
// Ties keep DESTINATIONS' own curated order (`Array.prototype.sort` is
// stable), so equally-scored destinations don't shuffle arbitrarily.
//
// A real (non-"any") vibe answer is a hard filter, not just one of three
// equal points: destinations whose `vibes` list doesn't include it are
// excluded before budget/group can tie them into the results. Budget and
// group stay soft preferences — otherwise a "beach" search could surface
// a mountain destination that only ties on budget and group. Leaving vibe
// on "any" skips the filter, since there's no real preference to enforce.
//
// `vibes` is a list, not a single tag, so a destination like Coron
// (dive/adventure and beach) is reachable from either search — the filter
// and scoring both check whether the answer appears anywhere in the list.
export function matchDestinations(answers: QuizAnswers, count = 3): QuizMatch[] {
  const candidates =
    answers.vibe === "any"
      ? DESTINATIONS
      : DESTINATIONS.filter((destination) => destination.vibes.includes(answers.vibe as Vibe));

  const scored: QuizMatch[] = candidates.map((destination) => {
    let score = 0;
    if (answers.vibe !== "any" && destination.vibes.includes(answers.vibe)) score += 1;
    if (answers.budget !== "any" && destination.budget === answers.budget) score += 1;
    if (answers.group !== "any" && destination.groupFit.includes(answers.group)) score += 1;
    return { destination, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}
