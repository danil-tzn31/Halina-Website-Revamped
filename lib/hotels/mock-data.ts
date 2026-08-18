import type { HotelOffer, HotelSearchParams } from "./types";

// Seeded fallback dataset — same reason as lib/flights/mock-data.ts: this
// specific provider (a TripAdvisor scraper, not an official API) can
// change shape or rate-limit without warning, so search should degrade to
// something real-looking rather than a blank page. Photos are hotlinked
// from Unsplash (same free-license approach as the hero photo).
const TEMPLATES: Array<{
  name: string;
  photo: string;
  amenities: string[];
  basePrice: number;
}> = [
  {
    name: "Shangri-La Boracay Resort",
    photo:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80&auto=format&fit=crop",
    amenities: ["Beachfront", "Pool", "Free breakfast", "Spa"],
    basePrice: 9800,
  },
  {
    name: "El Nido Resorts Lagen Island",
    photo:
      "https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=1200&q=80&auto=format&fit=crop",
    amenities: ["Private beach", "All-inclusive", "Snorkeling"],
    basePrice: 14500,
  },
  {
    name: "Amorita Resort Panglao",
    photo:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80&auto=format&fit=crop",
    amenities: ["Infinity pool", "Cliffside view", "Free WiFi"],
    basePrice: 7200,
  },
  {
    name: "Movenpick Hotel Cebu",
    photo:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80&auto=format&fit=crop",
    amenities: ["City view", "Gym", "Free breakfast"],
    basePrice: 5400,
  },
  {
    name: "Siargao Bleu Resort",
    photo:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80&auto=format&fit=crop",
    amenities: ["Surf packages", "Pool", "Airport transfer"],
    basePrice: 6100,
  },
  {
    name: "Discovery Primea Manila",
    photo:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80&auto=format&fit=crop",
    amenities: ["City center", "Rooftop bar", "Free WiFi"],
    basePrice: 8300,
  },
];

export function getMockHotelOffers(params: HotelSearchParams): HotelOffer[] {
  return TEMPLATES.map((template, index) => ({
    id: `mock-hotel-${index}`,
    name: template.name,
    city: params.destination || "Philippines",
    address: null,
    rating: 4 + (index % 3) * 0.3,
    reviewCount: 120 + index * 47,
    pricePerNight: template.basePrice,
    currency: "PHP",
    photo: template.photo,
    amenities: template.amenities,
  }));
}
