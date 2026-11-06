const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


import { capacityOf } from '@/lib/territories';

/**
 * Closes a negotiated deal: charges the buyer the agreed points, gives them the
 * next free seat, and records it in the trail. Runs as the admin.
 */
export async function acceptOffer({ offer, finalPoints, adminEmail }) {
  const territory = await db.entities.Territory.get(offer.territory_id);
  const capacity = capacityOf(territory);

  const owned = await db.entities.Seat.filter({
    territory_id: territory.id,
    owner_id: offer.buyer_id,
  });
  if (owned.length > 0) return { ok: false, error: 'ALREADY_SEATED' };

  const used = await db.entities.Seat.count({ territory_id: territory.id });
  if (used >= capacity) return { ok: false, error: 'SOLD_OUT' };

  const buyers = await db.entities.User.filter({ email: offer.buyer_email });
  const buyer = buyers[0];
  if (!buyer) return { ok: false, error: 'NO_BUYER' };

  const charge = Math.max(0, Number(finalPoints) || 0);
  const balance = Number(buyer.country_points || 0);
  if (charge > balance) return { ok: false, error: 'INSUFFICIENT_POINTS', available: balance };

  const seat = await db.entities.Seat.create({
    territory_id: territory.id,
    territory_kind: territory.kind,
    slot: used + 1,
    owner_id: buyer.id,
    owner_display_name: buyer.display_name || buyer.full_name || buyer.email,
    owner_avatar_url: buyer.avatar_url || '',
    acquired_at: new Date().toISOString(),
    price_paid: charge,
    paid_with: charge > 0 ? 'points' : 'admin',
  });

  if (charge > 0) {
    await db.entities.User.update(buyer.id, { country_points: balance - charge });
  }

  await db.entities.Offer.update(offer.id, { status: 'accepted', final_points: charge });

  await db.entities.OfferMessage.create({
    offer_id: offer.id,
    buyer_id: buyer.id,
    author_email: adminEmail,
    from_admin: true,
    body: `Deal closed at ${charge.toLocaleString()} pts — seat #${seat.slot} is yours.`,
  });

  await db.entities.AuditLog.create({
    actor_email: adminEmail,
    action: 'bid_accept',
    target_type: 'territory',
    target_id: territory.id,
    meta: {
      territory_name: territory.name,
      email: buyer.email,
      points: charge,
      slot: seat.slot,
    },
  });

  return { ok: true, slot: seat.slot, charged: charge };
}

export const OFFER_ERRORS = {
  ALREADY_SEATED: 'That buyer already holds a seat here.',
  SOLD_OUT: 'Every seat in this territory is taken.',
  NO_BUYER: 'The buyer account could not be found.',
  INSUFFICIENT_POINTS: 'The buyer does not have enough points.',
};