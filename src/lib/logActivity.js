const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


/**
 * Records a user activity entry in the audit trail.
 *
 * Best-effort on purpose: the log describes an action that already happened, so
 * a failed write must never cancel or hide the action itself.
 */
export async function logActivity({ action, user, targetType, targetId, meta }) {
  if (!user?.id) return;
  try {
    await db.entities.AuditLog.create({
      actor_id: user.id,
      actor_email: user.email,
      action,
      target_type: targetType,
      target_id: targetId,
      meta,
    });
  } catch {
    // activity logging never blocks the user's action
  }
}