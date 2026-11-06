const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


const ECONOMY_ACTIONS = [
  'seat_claim',
  'trade_settle',
  'bid_accept',
  'seat_sell',
  'seat_revoke',
  'seat_transfer',
];

const CELL = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Downloads the full claim + trade record as a CSV, ready to open in a sheet. */
export async function exportEconomyCsv() {
  const page = await db.entities.AuditLog.filter(
    { action: { $in: ECONOMY_ACTIONS } },
    { sort: '-created_date', limit: 500 }
  );
  const rows = page.items || [];

  const header = ['date', 'action', 'user', 'territory', 'square', 'points', 'credits', 'target_id'];
  const lines = rows.map((e) =>
    [
      e.created_date || '',
      e.action,
      e.actor_email || '',
      e.meta?.territory_name || '',
      e.meta?.slot ?? '',
      e.meta?.points ?? '',
      e.meta?.credits ?? '',
      e.target_id || '',
    ]
      .map(CELL)
      .join(',')
  );

  const csv = [header.join(','), ...lines].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `economy-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return rows.length;
}