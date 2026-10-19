export function ownershipFraction(value) {
  const match = /^(\d+)\/(\d+)$/.exec(String(value ?? ''));
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator)
    && numerator > 0 && numerator <= denominator ? numerator / denominator : null;
}
