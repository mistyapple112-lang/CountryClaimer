const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


import { capacityOf, priceOf } from '@/lib/territories';
import { logActivity } from '@/lib/logActivity';

/**
 * Claims the next free seat in a territory.
 *
 * Capacity is reserved by creating the seat first and then verifying the
 * post-write count: if the reservation pushed the territory past its cap the
 * seat is deleted again and the claim is rejected, so the stored occupancy can
 * never be left above capacity. Two simultaneous claims for the final seat both
 * write, both verify, and the loser rolls back — the cap holds, though without a
 * server function the check cannot be a single atomic transaction.
 */
export async function claimSeat({ territory, user, override }) {
  const capacity = capacityOf(territory);

  const owned = await db.entities.Seat.filter({
    territory_id: territory.id,
    owner_id: user.id,
  });
  if (owned.length > 0) {
    return { ok: false, error: 'ALREADY_OWNED', slot: owned[0].slot };
  }

  const used = await db.entities.Seat.count({ territory_id: territory.id });
  if (used >= capacity) {
    return { ok: false, error: 'SEAT_CAPACITY_REACHED', occupied: used, capacity };
  }

  const price = priceOf(territory, override);
  const priceCredits = price.credits;
  const pricePoints = price.points;

  if (priceCredits > 0 && Number(user.credits || 0) < priceCredits) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS', required: priceCredits, available: Number(user.credits || 0) };
  }
  if (pricePoints > 0 && Number(user.country_points || 0) < pricePoints) {
    return { ok: false, error: 'INSUFFICIENT_POINTS', required: pricePoints, available: Number(user.country_points || 0) };
  }

  const seat = await db.entities.Seat.create({
    territory_id: territory.id,
    territory_kind: territory.kind,
    slot: used + 1,
    owner_id: user.id,
    owner_display_name: user.display_name || user.full_name || user.email,
    owner_avatar_url: user.avatar_url || '',
    acquired_at: new Date().toISOString(),
    price_paid: priceCredits + pricePoints,
    paid_with: !priceCredits && !pricePoints ? 'free' : pricePoints > 0 ? 'points' : 'credits',
  });

  const after = await db.entities.Seat.count({ territory_id: territory.id });
  if (after > capacity) {
    await db.entities.Seat.delete(seat.id);
    return { ok: false, error: 'SEAT_CAPACITY_REACHED', occupied: capacity, capacity };
  }

  // Charged only once the seat is safely inside capacity, so a rejected claim
  // never costs the member anything.
  if (priceCredits > 0 || pricePoints > 0) {
    const charge = {};
    if (priceCredits > 0) charge.credits = Number(user.credits || 0) - priceCredits;
    if (pricePoints > 0) charge.country_points = Number(user.country_points || 0) - pricePoints;
    await db.auth.updateMe(charge);
  }

  logActivity({
    action: 'seat_claim',
    user,
    targetType: 'territory',
    targetId: territory.id,
    meta: {
      territory_name: territory.name,
      kind: territory.kind,
      slot: seat.slot,
      credits: priceCredits,
      points: pricePoints,
    },
  });

  return {
    ok: true,
    seat,
    slot: seat.slot,
    occupied: after,
    capacity,
    paid_with: seat.paid_with,
    price_credits: priceCredits,
    price_points: pricePoints,
  };
}

export const CLAIM_ERRORS = {
  ALREADY_OWNED: 'You already hold a seat here.',
  SEAT_CAPACITY_REACHED: 'Every square is taken. Place an offer instead.',
  INSUFFICIENT_POINTS: 'Not enough Country Points for this territory.',
  INSUFFICIENT_CREDITS: 'Not enough Credits for this territory.',
};