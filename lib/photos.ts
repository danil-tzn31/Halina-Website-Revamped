// Photos hotlinked from Unsplash, gathered in one place. Storing the raw
// photo ID rather than a full URL at each call site lets the same photo be
// reused at different sizes/crops (e.g. hero vs. social-preview) without
// the two drifting apart if it ever needs to change.
function unsplashUrl(photoId: string, params: string): string {
  return `https://images.unsplash.com/photo-${photoId}?${params}`;
}

// El Nido, Palawan — homepage hero background (components/sections/hero.tsx)
// and, cropped to 1200x630, the site's Open Graph/Twitter preview image
// (app/layout.tsx). Reused rather than sourcing a second photo so the
// social preview matches what visitors actually see on the site.
export const HERO_PHOTO_ID = "1531761535209-180857e963b9";
export const HERO_PHOTO_URL = unsplashUrl(
  HERO_PHOTO_ID,
  "fm=jpg&q=80&w=2400&auto=format&fit=crop"
);
export const HERO_PHOTO_OG_URL = unsplashUrl(
  HERO_PHOTO_ID,
  "fm=jpg&q=80&w=1200&h=630&fit=crop&auto=format"
);

// Passport and boarding pass on a travel bag, shot at Schiphol Airport —
// used on the booking confirmation page (app/booking/success/page.tsx).
export const BOOKING_CONFIRMED_PHOTO_ID = "1586441133374-ed1cb4007a47";
export const BOOKING_CONFIRMED_PHOTO_URL = unsplashUrl(
  BOOKING_CONFIRMED_PHOTO_ID,
  "q=80&w=1200&auto=format&fit=crop"
);
