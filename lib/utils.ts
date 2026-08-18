import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// This is the standard shadcn/ui helper. It lets components accept a
// `className` prop and merge it with their own default Tailwind classes
// without ending up with conflicting classes (e.g. two different
// `padding` utilities both applied at once).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
