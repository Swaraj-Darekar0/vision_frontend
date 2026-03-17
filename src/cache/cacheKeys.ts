// All AsyncStorage key strings live here. Never inline them elsewhere.
export const CACHE_KEYS = {
  // Static (not user-scoped — safe to keep global)
  CACHE_SCHEMA_VERSION:  'sc_cache_version',
  OFFLINE_QUEUE:         'sc_offline_queue_v1',

  // User-scoped key factories — always call with userId
  sessionList:   (userId: string) => `sc_session_list_v1_${userId}`,
  sessionDetail: (userId: string, sessionId: string) => 
                   `sc_session_detail_v1_${userId}_${sessionId}`,
  
  // Legacy keys (for migration if needed, otherwise deprecated)
  LEGACY_SESSION_LIST:   'sc_session_list_v1',
  LEGACY_SESSION_DETAIL_PREFIX: 'sc_session_detail_v1_',
} as const;
