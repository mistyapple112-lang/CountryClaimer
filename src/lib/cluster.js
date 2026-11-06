/**
 * Grid clustering for map markers.
 * Below the threshold zoom, sibling territories collapse into a cell cluster
 * that reports aggregate occupancy instead of one pin per place.
 */
export function clusterTerritories(items, zoom) {
  const threshold = 3;
  if (zoom > threshold) {
    return items.map((item) => ({ type: 'territory', item, count: 1 }));
  }

  const cell = zoom <= 1 ? 55 : zoom === 2 ? 28 : 14;
  const buckets = new Map();

  items.forEach((item) => {
    const key = `${Math.floor(item.center_lat / cell)}:${Math.floor(item.center_lng / cell)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.items.push(item);
    } else {
      buckets.set(key, { items: [item] });
    }
  });

  const out = [];
  buckets.forEach((bucket) => {
    const list = bucket.items;
    if (list.length === 1) {
      out.push({ type: 'territory', item: list[0], count: 1 });
      return;
    }
    const lat = list.reduce((sum, t) => sum + Number(t.center_lat), 0) / list.length;
    const lng = list.reduce((sum, t) => sum + Number(t.center_lng), 0) / list.length;
    const occupied = list.reduce((sum, t) => sum + Number(t.seats_taken || 0), 0);
    const capacity = list.reduce((sum, t) => sum + Number(t.seat_capacity || 0), 0);
    out.push({
      type: 'cluster',
      lat,
      lng,
      count: list.length,
      occupied,
      capacity,
      items: list,
    });
  });

  return out;
}