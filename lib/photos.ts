// Every real photo hotlinked from Unsplash across the app, gathered in one
// place — see each entry's comment for what it depicts and why it was
// picked, matching the same "verified against what it actually shows, not
// just its filename" discipline already used for the curated destinations
// list (lib/destinations/data.ts). Keeping the raw photo ID here rather
// than a full URL duplicated at every call site means the same photo can
// be reused at a different size or crop (the hero at full width, a
// cropped 1200x630 version for the site's social-preview image) without
// the two ever quietly drifting apart if the photo ever needs to change.
function unsplashUrl(photoId: string, params: string): string {
  return `https://images.unsplash.com/photo-${photoId}?${params}`;
}

// El Nido, Palawan — the homepage hero background (components/sections/
// hero.tsx), and, cropped to a standard 1200x630 social-card size, the
// site's Open Graph/Twitter preview image (app/layout.tsx) — reused here
// rather than sourcing a second photo since it's already the strongest,
// most recognizable single image in the app, and reusing it means the
// preview image is exactly what a recruiter clicking a shared link would
// see once they land on the site, not a mismatched surprise.
export const HERO_PHOTO_ID = "1531761535209-180857e963b9";
export const HERO_PHOTO_URL = unsplashUrl(
  HERO_PHOTO_ID,
  "fm=jpg&q=80&w=2400&auto=format&fit=crop"
);
export const HERO_PHOTO_OG_URL = unsplashUrl(
  HERO_PHOTO_ID,
  "fm=jpg&q=80&w=1200&h=630&fit=crop&auto=format"
);

// Passport and boarding pass laid on a travel bag, shot at Schiphol
// Airport — used on the booking confirmation page (app/booking/success/
// page.tsx), the one page in the whole booking flow that was purely text
// before this. Verified against the photo's own Unsplash listing (not
// just its filename) before use, same as every other photo in this app.
export const BOOKING_CONFIRMED_PHOTO_ID = "1586441133374-ed1cb4007a47";
export const BOOKING_CONFIRMED_PHOTO_URL = unsplashUrl(
  BOOKING_CONFIRMED_PHOTO_ID,
  "q=80&w=1200&auto=format&fit=crop"
);
