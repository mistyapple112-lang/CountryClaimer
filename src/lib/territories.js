export const LEVEL_KIND = [
  'continent',
  'country',
  'region',
  'city',
  'town',
  'village',
];

export const KIND_LABEL = {
  continent: 'Continent',
  country: 'Country',
  region: 'Region',
  city: 'City',
  town: 'Town',
  village: 'Village',
  spot: 'Spot',
};

export const FREE_KINDS = ['city', 'town', 'village', 'spot'];

export const MAX_LEVEL = 5;

export const isFreeKind = (kind) => FREE_KINDS.includes(kind);

export const capacityOf = (territory) => Number(territory?.seat_capacity ?? 100);

/** Countries and above are paid territory: points are required unless an admin
 *  sets an explicit price for that place. */
export const DEFAULT_PRICE = {
  continent: { credits: 0, points: 50000 },
  country: { credits: 0, points: 2500 },
  region: { credits: 0, points: 500 },
};

export const priceOf = (territory, override) => {
  // An admin-set override always wins: it can price up a normally free place,
  // or make a paid place free.
  if (override && override.active !== false) {
    const credits = Number(override.credits || 0);
    const points = Number(override.points || 0);
    return { credits, points, free: credits <= 0 && points <= 0, overridden: true };
  }
  if (isFreeKind(territory?.kind)) return { credits: 0, points: 0, free: true };
  const base = DEFAULT_PRICE[territory?.kind] || { credits: 0, points: 0 };
  return {
    credits: Number(territory?.base_price_credits ?? base.credits),
    points: Number(territory?.base_price_points ?? base.points),
    free: false,
  };
};

export const formatPrice = (price) => {
  if (price.free) return 'Free';
  const parts = [];
  if (price.points > 0) parts.push(`${price.points.toLocaleString()} pts`);
  if (price.credits > 0) parts.push(`${price.credits.toLocaleString()} credits`);
  return parts.length ? parts.join(' + ') : 'Free';
};