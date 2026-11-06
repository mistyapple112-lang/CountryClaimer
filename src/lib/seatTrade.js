const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


import { logActivity } from '@/lib/logActivity';

/** A holder can always sell a seat back for this share of what they paid. */
export const SELL_RATE = 0.75;

/** The buy-back value of a seat, in the currency it was originally paid with. */
export function refundOf(seat, rate = SELL_RATE) {
  const paid = Number(seat?.price_paid || 0);
  const unit =
    seat?.paid_with === 'credits' ? 'credits' : seat?.paid_with === 'points' ? 'points' : null;
  if (!unit || paid <= 0) return { points: 0, credits: 0, unit: null, amount: 0 };
  const amount = Math.floor(paid * rate);
  return {
    points: unit === 'points' ? amount : 0,
    credits: unit === 'credits' ? amount : 0,
    unit,
    amount,
  };
}

export const refundLabel = (refund) => {
  if (!refund?.amount) return 'nothing';
  return `${refund.amount.toLocaleString()} ${refund.unit}`;
};

/** The holder sells their own seat back for the standard rate. */
export async function sellSeat({ seat, owner }) {
  const refund = refundOf(seat);
  await db.entities.Seat.delete(seat.id);

  if (refund.points || refund.credits) {
    const patch = {};
    if (refund.points) patch.country_points = Number(owner.country_points || 0) + refund.points;
    if (refund.credits) patch.credits = Number(owner.credits || 0) + refund.credits;
    await db.auth.updateMe(patch);
  }

  logActivity({
    action: 'seat_sell',
    user: owner,
    targetType: 'territory',
    targetId: seat.territory_id,
    meta: {
      slot: seat.slot,
      points: refund.points,
      credits: refund.credits,
      rate: SELL_RATE,
    },
  });

  return refund;
}

/** An admin takes a seat back, optionally paying a buy-back price of their choosing. */
export async function takeBackSeat({ seat, owner, admin, refund = { points: 0, credits: 0 } }) {
  await db.entities.Seat.delete(seat.id);

  if (owner && (Number(refund.points) > 0 || Number(refund.credits) > 0)) {
    await db.entities.User.update(owner.id, {
      country_points: Number(owner.country_points || 0) + Number(refund.points || 0),
      credits: Number(owner.credits || 0) + Number(refund.credits || 0),
    });
  }

  logActivity({
    action: 'seat_revoke',
    user: admin,
    targetType: 'territory',
    targetId: seat.territory_id,
    meta: {
      email: owner?.email,
      slot: seat.slot,
      points: Number(refund.points || 0),
      credits: Number(refund.credits || 0),
    },
  });
}

/** Hands a seat (the country claim) over to another member. */
export async function tradeSeat({ seat, toUser, admin }) {
  await db.entities.Seat.update(seat.id, {
    owner_id: toUser.id,
    owner_display_name: toUser.display_name || toUser.full_name || toUser.email,
    owner_avatar_url: toUser.avatar_url || '',
    acquired_at: new Date().toISOString(),
    paid_with: 'trade',
  });

  logActivity({
    action: 'seat_transfer',
    user: admin,
    targetType: 'territory',
    targetId: seat.territory_id,
    meta: {
      from: seat.owner_display_name,
      email: toUser.email,
      slot: seat.slot,
    },
  });
}

/** Shared account lookup used by the admin seat tools. */
export async function findUserByEmail(email) {
  const all = await db.entities.User.list('-created_date', 500);
  const list = Array.isArray(all) ? all : all?.items || [];
  const wanted = String(email || '').trim().toLowerCase();
  return list.find((u) => String(u.email || '').toLowerCase() === wanted) || null;
}