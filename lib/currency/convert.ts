// Kept separate from the React context so it's easy to unit-test. Converts
// by going through USD as the middle step: divide by the source currency's
// rate to get a USD amount, then multiply by the target rate.
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesPerUsd: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = ratesPerUsd[fromCurrency];
  const toRate = ratesPerUsd[toCurrency];

  // Offers should always be USD or PHP, but if an unsupported currency ever
  // shows up, returning the unconverted amount is a safer failure than a
  // wrong number or a crash.
  if (!fromRate || !toRate) return amount;

  const amountInUsd = amount / fromRate;
  return amountInUsd * toRate;
}
