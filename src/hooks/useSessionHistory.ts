import { useState, useEffect, useCallback } from 'react';
import { SessionListEntry } from '../types/cache';
import { getSessionList } from '../cache/sessionCache';
import { useAuthStore } from '../store/authStore';

export function useSessionHistory() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<SessionListEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getSessionList(user.id);
    setSessions(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { 
    refresh(); 
  }, [refresh]);

  return { sessions, loading, refresh };
}
