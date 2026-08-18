// Plain, framework-free conversion math — kept separate from the React
// context so it's easy to reason about (and could be unit-tested) on its
// own. `ratesPerUsd` is "how many units of that currency equal 1 USD" for
// every supported currency (see lib/currency/config.ts), so converting
// between any two of them is just "go through USD as the middle step":
// divide by the source currency's rate to get a USD amount, then multiply
// by the target currency's rate.
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesPerUsd: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = ratesPerUsd[fromCurrency];
  const toRate = ratesPerUsd[toCurrency];

  // An offer's native currency should always be one of the five supported
  // ones (every flight/hotel provider in this app only ever returns USD or
  // PHP — see lib/flights/types.ts), but if that ever changes, showing the
  // original, unconverted amount is a safer failure than showing a wrong
  // number or crashing the page.
  if (!fromRate || !toRate) return amount;

  const amountInUsd = amount / fromRate;
  return amountInUsd * toRate;
}
