const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useRef, useState } from 'react';

/**
 * Subscribes to the live Seat stream.
 * `handler` receives { id, type: 'create' | 'update' | 'delete', data }.
 * Returns `live`, true while the stream is connected.
 */
export function useSeatStream(handler) {
  const [live, setLive] = useState(false);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const unsubscribe = db.entities.Seat.subscribe((event) => {
      handlerRef.current?.(event);
    });
    setLive(true);
    return () => {
      setLive(false);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return { live };
}
