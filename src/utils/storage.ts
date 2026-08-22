import { UserStats, DayActivity, ThemeType, SoundType } from '../types';

/**
 * Storage Schema Version
 * Increment this whenever a breaking change to the schema occurs.
 */
export const STORAGE_VERSION = 1;

const KEYS = {
  STATS: 'rhythm_user_stats_v1',
  STATS_BACKUP: 'rhythm_user_stats_backup',
  LEGACY_STATS: 'rhythm_user_stats',
  MUTED: 'rhythm_muted',
  THEME: 'rhythm_theme',
  FOLLOW_SYSTEM_THEME: 'rhythm_follow_system_theme',
  FAVORITE_LIGHT_THEME: 'rhythm_favorite_light_theme',
  SOUND_TYPE: 'rhythm_sound_type',
  AUTO_CYCLES: 'rhythm_auto_cycles',
} as const;

// In-Memory fallback store if localStorage is blocked (e.g., CF sandboxed iframe, incognito mode)
const memoryStore: Record<string, string> = {};

class SafeStorage {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getItem(key: string): string | null {
    try {
      if (this.isAvailable) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Failed to read key "${key}" from localStorage, falling back to memory:`, e);
    }
    return memoryStore[key] ?? null;
  }

  public setItem(key: string, value: string): void {
    memoryStore[key] = value;
    try {
      if (this.isAvailable) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Failed to write key "${key}" to localStorage:`, e);
    }
  }

  public removeItem(key: string): void {
    delete memoryStore[key];
    try {
      if (this.isAvailable) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Failed to remove key "${key}" from localStorage:`, e);
    }
  }
}

export const safeStorage = new SafeStorage();

/**
 * Format Date to YYYY-MM-DD local key
 */
export function getFormattedDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate consecutive training streak days
 */
export function calculateStreak(dailyActivity: Record<string, number>): number {
  let streak = 0;
  const now = new Date();
  
  // Check today first
  const todayKey = getFormattedDateKey(now);
  const trainedToday = (dailyActivity[todayKey] || 0) > 0;
  
  // If not trained today, check if yesterday was trained to keep streak alive
  let checkDate = new Date(now);
  if (!trainedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = getFormattedDateKey(checkDate);
    if ((dailyActivity[key] || 0) > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Migrate & validate UserStats data structure
 */
function migrateAndValidateStats(raw: unknown): UserStats {
  const defaultStats: UserStats = {
    version: STORAGE_VERSION,
    totalSeconds: 0,
    totalCycles: 0,
    completedSessions: 0,
    dailyActivity: {},
    lastActiveDate: getFormattedDateKey(),
    streakDays: 0,
  };

  if (!raw || typeof raw !== 'object') {
    return defaultStats;
  }

  const obj = raw as Record<string, any>;

  const totalSeconds = typeof obj.totalSeconds === 'number' && !isNaN(obj.totalSeconds) && obj.totalSeconds >= 0 
    ? Math.floor(obj.totalSeconds) 
    : 0;

  const totalCycles = typeof obj.totalCycles === 'number' && !isNaN(obj.totalCycles) && obj.totalCycles >= 0 
    ? Math.floor(obj.totalCycles) 
    : 0;

  const completedSessions = typeof obj.completedSessions === 'number' && !isNaN(obj.completedSessions) && obj.completedSessions >= 0 
    ? Math.floor(obj.completedSessions) 
    : 0;

  let dailyActivity: Record<string, number> = {};
  if (obj.dailyActivity && typeof obj.dailyActivity === 'object') {
    for (const [dateKey, seconds] of Object.entries(obj.dailyActivity)) {
      if (typeof seconds === 'number' && !isNaN(seconds) && seconds > 0) {
        dailyActivity[dateKey] = Math.floor(seconds);
      }
    }
  }

  // If dailyActivity is empty but user already has legacy totalSeconds, credit today
  const todayKey = getFormattedDateKey();
  if (Object.keys(dailyActivity).length === 0 && totalSeconds > 0) {
    dailyActivity[todayKey] = totalSeconds;
  }

  const streakDays = calculateStreak(dailyActivity);

  return {
    version: STORAGE_VERSION,
    totalSeconds,
    totalCycles,
    completedSessions,
    dailyActivity,
    lastActiveDate: typeof obj.lastActiveDate === 'string' ? obj.lastActiveDate : todayKey,
    streakDays,
  };
}

/**
 * Get User Stats from storage with automatic migration & fallback
 */
export function getUserStats(): UserStats {
  try {
    // 1. Try reading versioned key
    const raw = safeStorage.getItem(KEYS.STATS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateAndValidateStats(parsed);
    }

    // 2. Try legacy unversioned key for data migration
    const legacyRaw = safeStorage.getItem(KEYS.LEGACY_STATS);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const migrated = migrateAndValidateStats(parsed);
      saveUserStats(migrated);
      return migrated;
    }

    // 3. Try backup key if main was corrupted
    const backupRaw = safeStorage.getItem(KEYS.STATS_BACKUP);
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      return migrateAndValidateStats(parsed);
    }
  } catch (e) {
    console.error('[Storage] Error loading user stats, recovering defaults:', e);
  }

  const initial = migrateAndValidateStats(null);
  saveUserStats(initial);
  return initial;
}

/**
 * Save User Stats with double-write backup protection
 */
export function saveUserStats(stats: UserStats): void {
  try {
    const validated = migrateAndValidateStats(stats);
    const serialized = JSON.stringify(validated);
    safeStorage.setItem(KEYS.STATS, serialized);
    safeStorage.setItem(KEYS.STATS_BACKUP, serialized);
  } catch (e) {
    console.error('[Storage] Failed to save user stats:', e);
  }
}

/**
 * Append training time to today's stats safely
 */
export function recordTrainingSeconds(currentStats: UserStats, deltaSeconds: number = 1): UserStats {
  const todayKey = getFormattedDateKey();
  const currentTodaySeconds = currentStats.dailyActivity[todayKey] || 0;
  
  const updatedDaily = {
    ...currentStats.dailyActivity,
    [todayKey]: currentTodaySeconds + deltaSeconds,
  };

  const updated: UserStats = {
    ...currentStats,
    totalSeconds: currentStats.totalSeconds + deltaSeconds,
    dailyActivity: updatedDaily,
    lastActiveDate: todayKey,
    streakDays: calculateStreak(updatedDaily),
  };

  saveUserStats(updated);
  return updated;
}

/**
 * Record completed cycle
 */
export function recordCycle(currentStats: UserStats): UserStats {
  const updated: UserStats = {
    ...currentStats,
    totalCycles: currentStats.totalCycles + 1,
  };
  saveUserStats(updated);
  return updated;
}

/**
 * Record completed session
 */
export function recordSession(currentStats: UserStats): UserStats {
  const updated: UserStats = {
    ...currentStats,
    completedSessions: currentStats.completedSessions + 1,
  };
  saveUserStats(updated);
  return updated;
}

/**
 * Calculate weekly 7-day activity data for the SVG Pink Frequency Chart
 */
export function getWeeklyActivity(stats: UserStats): DayActivity[] {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const result: DayActivity[] = [];
  const now = new Date();
  const todayKey = getFormattedDateKey(now);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = getFormattedDateKey(d);
    const isToday = dateKey === todayKey;
    const seconds = stats.dailyActivity[dateKey] || 0;
    const minutes = Math.round(seconds / 60);

    // Calculate Pink Shade Level:
    // Level 0: 0 seconds (transparent/faint)
    // Level 1: 1 - 299s (<5m) (light pink)
    // Level 2: 300 - 599s (5-10m) (medium pink)
    // Level 3: 600 - 1199s (10-20m) (vibrant rose pink)
    // Level 4: >= 1200s (20m+) (deep intense pink)
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (seconds >= 1200) level = 4;
    else if (seconds >= 600) level = 3;
    else if (seconds >= 300) level = 2;
    else if (seconds > 0) level = 1;

    const dayName = isToday ? '今天' : dayNames[d.getDay()];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

    result.push({
      date: dateKey,
      dayName,
      dateLabel,
      seconds,
      minutes,
      level,
      isToday,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Settings Helpers (Muted, Theme, SoundType, AutoCycles)
// ---------------------------------------------------------------------------

export function getStoredMuted(): boolean {
  try {
    const saved = safeStorage.getItem(KEYS.MUTED);
    return saved === 'true';
  } catch {
    return false;
  }
}

export function setStoredMuted(muted: boolean): void {
  try {
    safeStorage.setItem(KEYS.MUTED, String(muted));
  } catch (e) {
    console.error('[Storage] Error setting muted:', e);
  }
}

export function getStoredTheme(defaultTheme: ThemeType = 'peach'): ThemeType {
  try {
    const saved = safeStorage.getItem(KEYS.THEME) as ThemeType;
    if (saved && ['peach', 'mint', 'taro', 'cheese', 'midnight'].includes(saved)) {
      return saved;
    }
  } catch {}
  return defaultTheme;
}

export function setStoredTheme(theme: ThemeType): void {
  try {
    safeStorage.setItem(KEYS.THEME, theme);
  } catch (e) {
    console.error('[Storage] Error setting theme:', e);
  }
}

export function getStoredFollowSystemTheme(defaultValue: boolean = true): boolean {
  try {
    const saved = safeStorage.getItem(KEYS.FOLLOW_SYSTEM_THEME);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {}
  return defaultValue;
}

export function setStoredFollowSystemTheme(follow: boolean): void {
  try {
    safeStorage.setItem(KEYS.FOLLOW_SYSTEM_THEME, String(follow));
  } catch (e) {
    console.error('[Storage] Error setting follow system theme:', e);
  }
}

export function getStoredFavoriteLightTheme(defaultTheme: ThemeType = 'peach'): ThemeType {
  try {
    const saved = safeStorage.getItem(KEYS.FAVORITE_LIGHT_THEME) as ThemeType;
    if (saved && ['peach', 'mint', 'taro', 'cheese'].includes(saved)) {
      return saved;
    }
  } catch {}
  return defaultTheme;
}

export function setStoredFavoriteLightTheme(theme: ThemeType): void {
  try {
    if (['peach', 'mint', 'taro', 'cheese'].includes(theme)) {
      safeStorage.setItem(KEYS.FAVORITE_LIGHT_THEME, theme);
    }
  } catch (e) {
    console.error('[Storage] Error setting favorite light theme:', e);
  }
}

export function getStoredSoundType(defaultSound: SoundType = 'impact'): SoundType {
  try {
    const saved = safeStorage.getItem(KEYS.SOUND_TYPE) as SoundType;
    if (saved && ['impact', 'moist', 'slap', 'breath', 'spring', 'heartbeat'].includes(saved)) {
      return saved;
    }
  } catch {}
  return defaultSound;
}

export function setStoredSoundType(soundType: SoundType): void {
  try {
    safeStorage.setItem(KEYS.SOUND_TYPE, soundType);
  } catch (e) {
    console.error('[Storage] Error setting soundType:', e);
  }
}

export function getStoredAutoCycles(defaultCycles: number = 2): number {
  try {
    const saved = safeStorage.getItem(KEYS.AUTO_CYCLES);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 1 && num <= 10) {
        return num;
      }
    }
  } catch {}
  return defaultCycles;
}

export function setStoredAutoCycles(cycles: number): void {
  try {
    safeStorage.setItem(KEYS.AUTO_CYCLES, String(cycles));
  } catch (e) {
    console.error('[Storage] Error setting autoCycles:', e);
  }
}
