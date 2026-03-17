import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { CACHE_KEYS } from './cacheKeys';
import { EvaluationResult } from '../types/api';
import { SessionListEntry } from '../types/cache';
import { formatDurationLabel } from '../utils/formatTime';
import { supabase } from '../api/supabase';

const MAX_SESSIONS = 100;

// ── SYNC FROM CLOUD ────────────────────────────────────────────────────────────

/**
 * Pulls sessions from Supabase and merges them into the local cache.
 * Adds new sessions and updates existing ones with newer data.
 * Useful for restoring data on a new device or keeping data up to date.
 */
export async function syncSessionsFromCloud(userId: string): Promise<number> {
  try {
    const { data: cloudSessions, error } = await supabase
      .from('session_scores')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false });

    if (error) throw error;
    if (!cloudSessions || cloudSessions.length === 0) return 0;

    const existingList = await getSessionList(userId);
    const existingIds = new Set(existingList.map(s => s.sessionId));
    const existingMap = new Map(existingList.map(s => [s.sessionId, s]));

    // 1. Handle new sessions
    const newEntries: SessionListEntry[] = cloudSessions
      .filter(s => !existingIds.has(s.session_id))
      .map(s => ({
        sessionId: s.session_id,
        processedAt: s.session_date,
        overallScore: s.overall || 0,
        confidenceScore: s.confidence || 0,
        clarityScore: s.clarity || 0,
        engagementScore: s.engagement || 0,
        nervousnessScore: s.nervousness || 0,
        topicTitle: s.topic_title || 'Synced Session',
        durationLabel: s.duration_label || '--',
        isFirstSession: s.is_first_session || false,
        localVideoUri: null, // Synced sessions don't have local video by default
      }));

    // 2. Check for updated existing sessions
    const updatedEntries: SessionListEntry[] = [];
    const sessionsToUpdateDetails: typeof cloudSessions = [];

    for (const cloudSession of cloudSessions) {
      if (existingIds.has(cloudSession.session_id)) {
        const existingEntry = existingMap.get(cloudSession.session_id)!;
        
        // Check if ANY field has changed from what we have locally
        const topicChanged = cloudSession.topic_title !== undefined && cloudSession.topic_title !== existingEntry.topicTitle;
        const scoreChanged = 
          (cloudSession.overall !== null && cloudSession.overall !== existingEntry.overallScore) ||
          (cloudSession.confidence !== null && cloudSession.confidence !== existingEntry.confidenceScore) ||
          (cloudSession.clarity !== null && cloudSession.clarity !== existingEntry.clarityScore) ||
          (cloudSession.engagement !== null && cloudSession.engagement !== existingEntry.engagementScore) ||
          (cloudSession.nervousness !== null && cloudSession.nervousness !== existingEntry.nervousnessScore);
        
        const dateChanged = cloudSession.session_date !== existingEntry.processedAt;
        const durationChanged = cloudSession.duration_label && cloudSession.duration_label !== existingEntry.durationLabel;

        // If anything changed, update the local entry
        if (topicChanged || scoreChanged || dateChanged || durationChanged) {
          const updatedEntry: SessionListEntry = {
            ...existingEntry,
            processedAt: cloudSession.session_date || existingEntry.processedAt,
            overallScore: cloudSession.overall !== null ? cloudSession.overall : existingEntry.overallScore,
            confidenceScore: cloudSession.confidence !== null ? cloudSession.confidence : existingEntry.confidenceScore,
            clarityScore: cloudSession.clarity !== null ? cloudSession.clarity : existingEntry.clarityScore,
            engagementScore: cloudSession.engagement !== null ? cloudSession.engagement : existingEntry.engagementScore,
            nervousnessScore: cloudSession.nervousness !== null ? cloudSession.nervousness : existingEntry.nervousnessScore,
            topicTitle: cloudSession.topic_title || existingEntry.topicTitle,
            durationLabel: cloudSession.duration_label || existingEntry.durationLabel,
            isFirstSession: cloudSession.is_first_session ?? existingEntry.isFirstSession,
            // Keep localVideoUri as is
          };
          updatedEntries.push(updatedEntry);

          // If raw_result exists, update the full details too
          if (cloudSession.raw_result) {
            sessionsToUpdateDetails.push(cloudSession);
          }
        }
      }
    }

    const totalChanges = newEntries.length + updatedEntries.length;
    if (totalChanges === 0) return 0;

    // 3. Save full EvaluationResult details for new sessions
    const newDetailTasks = cloudSessions
      .filter(s => !existingIds.has(s.session_id) && s.raw_result)
      .map(s => {
        const detailKey = CACHE_KEYS.sessionDetail(userId, s.session_id);
        return AsyncStorage.setItem(detailKey, JSON.stringify(s.raw_result));
      });

    // 4. Update full EvaluationResult details for updated sessions
    const updateDetailTasks = sessionsToUpdateDetails.map(s => {
      const detailKey = CACHE_KEYS.sessionDetail(userId, s.session_id);
      return AsyncStorage.setItem(detailKey, JSON.stringify(s.raw_result));
    });

    await Promise.all([...newDetailTasks, ...updateDetailTasks]);

    // 5. Update the lightweight list with both new and updated entries
    const updatedList = [
      ...newEntries,
      ...updatedEntries,
      ...existingList.filter(s => !updatedEntries.some(u => u.sessionId === s.sessionId))
    ]
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
      .slice(0, MAX_SESSIONS);

    await AsyncStorage.setItem(CACHE_KEYS.sessionList(userId), JSON.stringify(updatedList));
    return totalChanges;
  } catch (err) {
    console.error('[SessionCache] sync failed:', err);
    throw err;
  }
}

// ── SAVE (called once after each successful backend response) ──────────────────

/**
 * Saves both the lightweight list entry AND the full detail object.
 */
export async function saveSession(
  result:         EvaluationResult,
  elapsedSeconds: number,
  topicTitle:     string,
  userId:         string,
  localVideoUri:  string | null,
): Promise<void> {
  try {
    const entry: SessionListEntry = {
      sessionId:        result.session_metadata.session_id,
      processedAt:      result.session_metadata.processed_at,
      overallScore:     result.overall_scores.overall,
      confidenceScore:  result.overall_scores.confidence,
      clarityScore:     result.overall_scores.clarity,
      engagementScore:  result.overall_scores.engagement,
      nervousnessScore: result.overall_scores.nervousness,
      topicTitle,
      durationLabel:    formatDurationLabel(elapsedSeconds),
      isFirstSession:   result.session_metadata.is_first_session,
      localVideoUri,
    };

    const existing = await getSessionList(userId);
    const updated  = [entry, ...existing].slice(0, MAX_SESSIONS);

    // Rolling window — null out localVideoUri for sessions beyond index 2 (3rd oldest+)
    const withManagedVideo = updated.map((s, i) => {
      if (i >= 3 && s.localVideoUri) {
        // Delete the file from disk
        FileSystem.deleteAsync(s.localVideoUri, { idempotent: true }).catch(() => {});
        return { ...s, localVideoUri: null };
      }
      return s;
    });

    await AsyncStorage.setItem(CACHE_KEYS.sessionList(userId), JSON.stringify(withManagedVideo));

    const detailKey = CACHE_KEYS.sessionDetail(userId, entry.sessionId);
    await AsyncStorage.setItem(detailKey, JSON.stringify(result));
  } catch (err) {
    console.error('[SessionCache] save failed:', err);
  }
}

// ── READ LIST ──────────────────────────────────────────────────────────────────

export async function getSessionList(userId: string): Promise<SessionListEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.sessionList(userId));
    return raw ? (JSON.parse(raw) as SessionListEntry[]) : [];
  } catch {
    return [];
  }
}

/** Returns last N sessions for streak grid. Defaults to 8. */
export async function getRecentSessions(userId: string, n = 8): Promise<SessionListEntry[]> {
  const all = await getSessionList(userId);
  return all.slice(0, n);
}

// ── READ DETAIL ────────────────────────────────────────────────────────────────

/**
 * Loads full EvaluationResult for one session.
 */
export async function getSessionDetail(userId: string, sessionId: string): Promise<EvaluationResult | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.sessionDetail(userId, sessionId));
    return raw ? (JSON.parse(raw) as EvaluationResult) : null;
  } catch {
    return null;
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  try {
    // 1. Delete from Supabase
    await supabase.from('session_scores').delete().eq('session_id', sessionId);

    // 2. Delete locally
    const list = await getSessionList(userId);
    const session = list.find(s => s.sessionId === sessionId);
    
    // If it has a local video, delete it
    if (session?.localVideoUri) {
      FileSystem.deleteAsync(session.localVideoUri, { idempotent: true }).catch(() => {});
    }

    const updated = list.filter((s) => s.sessionId !== sessionId);
    await AsyncStorage.setItem(CACHE_KEYS.sessionList(userId), JSON.stringify(updated));
    await AsyncStorage.removeItem(CACHE_KEYS.sessionDetail(userId, sessionId));
  } catch (err) {
    console.error('[SessionCache] delete failed:', err);
    throw err;
  }
}

/**
 * Clears all cached sessions for a specific user.
 */
export async function clearAllSessions(userId: string): Promise<void> {
  try {
    const list = await getSessionList(userId);
    
    // Delete all local videos
    for (const s of list) {
      if (s.localVideoUri) {
        FileSystem.deleteAsync(s.localVideoUri, { idempotent: true }).catch(() => {});
      }
    }

    const detailKeys = list.map((s) => CACHE_KEYS.sessionDetail(userId, s.sessionId));
    await AsyncStorage.multiRemove([CACHE_KEYS.sessionList(userId), ...detailKeys]);
  } catch (err) {
    console.error('[SessionCache] clearAllSessions failed:', err);
  }
}
