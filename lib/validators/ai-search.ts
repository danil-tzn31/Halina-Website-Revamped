import { z } from "zod";

// Deliberately generous but bounded — a real visitor describing a trip in
// a sentence or two fits comfortably within 300 characters; the cap exists
// only to stop someone (or a script) from pasting in a huge block of text
// and turning every request into an expensive Gemini call for no reason.
export const aiSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Tell us a bit more about your ideal trip.")
    .max(300, "Keep it to a sentence or two."),
});

export type AiSearchInput = z.infer<typeof aiSearchSchema>;
