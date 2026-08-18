import { DESTINATIONS, type Destination, type Vibe, type Budget, type GroupFit } from "./data";

// Shared logic, not copy-pasted into the modal component — same DRY
// discipline as lib/flights/sort.ts and lib/hotels/sort.ts (Halina-Revamp-
// Plan.md section 21): the scoring rule lives in exactly one place, and
// components/destinations/destination-quiz-modal.tsx just calls it.
// "any" (surfaced in the UI as "I'm not sure" — section 46) is a real,
// selectable third option on every question, not just an absence of one.
// It exists specifically for someone who's genuinely undecided on one
// dimension of their trip: picking "any" for budget still lets vibe and
// group narrow the results down, rather than forcing an arbitrary guess
// that could rule out a destination that would otherwise have been a good
// fit.
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
// weighted or fancier than that — with a modest, hand-curated list of
// destinations and three questions, a more "precise"-looking score would be
// pretending to more rigor than three hand-picked tags actually support.
// An "any" answer is simply left out of scoring for every destination — it
// neither earns nor costs a point, so a destination is never penalized for
// not matching a dimension nobody actually expressed a preference on.
//
// Ties aren't broken arbitrarily. `Array.prototype.sort` is stable in every
// JS engine this app runs on, so destinations that score equally keep
// DESTINATIONS' own curated order relative to each other. Section 46 moved
// `count` from a fixed 2 to 5, so "I'm not sure" felt like a genuine browse
// rather than an arbitrary top-two. Section 50 brought it back down to 3 —
// with the destination list now at 38 (section 49), a 5-wide list started
// diluting the results with weaker ties instead of reading as "the best
// matches"; 3 keeps the list feeling curated rather than padded, while
// still being more than the original fixed-2.
//
// Bug fixed in section 47: with three loosely-weighted 0-3 point scores and
// only 11 destinations, showing a flat top-5 could pad the list with
// destinations that share NO real connection to what was actually asked
// for — reported directly: searching "beach" surfaced Tagaytay (a mountain/
// culture destination), because it happened to tie on budget and group
// with the one real beach match, Boracay, even though it shares nothing
// with "beach" itself. Budget and group are genuinely soft preferences —
// two people can enjoy the same destination on different budgets — so when
// a visitor gives a real (non-"any") vibe answer, that's a hard
// requirement, not just one of three equally-weighted points — a
// destination whose `vibes` list doesn't include the visitor's answer is
// filtered out entirely before budget and group ever get a chance to tie
// it into the list. Leaving vibe on "any" (the indecisive case section 46
// was built for) skips this filter entirely, exactly like before, since
// there's no real vibe preference to enforce.
//
// Section 51: a destination's vibe is no longer treated as one exclusive
// category. The original "beach, adventure, or culture, never a blend"
// framing (see the now-superseded comment this replaced) was itself the
// bug — a lot of real destinations genuinely are more than one thing
// (Coron is both a dive/adventure spot and an obvious beach one; Siquijor
// is adventure with a real folklore/culture undercurrent). `data.ts`'s
// `vibes` field is a list now, and both the hard filter and the scoring
// below check whether the visitor's answer appears *anywhere* in that
// list, not whether it equals a single tag. This makes a destination like
// Coron reachable from either a "beach" or an "adventure" search — exactly
// the behavior a real, honest multi-vibe destination should have — while
// every destination that's genuinely single-vibe (Boracay, Vigan, Mt.
// Pulag, and about a dozen others) behaves exactly as it always did, since
// a one-item list and a single value filter identically.
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
