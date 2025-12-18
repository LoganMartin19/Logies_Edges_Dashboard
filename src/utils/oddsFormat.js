// Convert decimal odds → fractional odds (approx via continued fractions)
export function decimalToFractional(decimal, maxDen = 1000) {
  const d = Number(decimal);
  if (!isFinite(d) || d <= 1) return "—";

  // fractional odds = decimal - 1
  const x = d - 1;

  // guard floating weirdness
  const eps = 1e-10;
  if (Math.abs(x - Math.round(x)) < eps) {
    const n = Math.round(x);
    if (n === 1) return "EVS"; // 2.00 decimal
    return `${n}/1`;
  }

  let h1 = 1, h0 = 0;
  let k1 = 0, k0 = 1;
  let b = x;

  for (let i = 0; i < 20; i++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2;
    k0 = k1; k1 = k2;
    if (Math.abs(b - a) < eps) break;
    b = 1 / (b - a);
  }

  if (!k1) return "—";

  const gcd = (aa, bb) => (bb ? gcd(bb, aa % bb) : aa);
  const g = gcd(h1, k1);

  const num = h1 / g;
  const den = k1 / g;

  if (num === 1 && den === 1) return "EVS";
  return `${num}/${den}`;
}

export function formatOddsBoth(decimal) {
  const d = Number(decimal);
  if (!isFinite(d)) return "—";
  return `${d.toFixed(2)} (${decimalToFractional(d)})`;
}