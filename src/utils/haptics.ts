import { BpmState } from '../types';

/**
 * Adaptive Haptic Feedback Manager
 * Safe wrapper around Web Vibration API with zero-crash fallbacks for desktop, iOS Safari, and sandboxed iframes.
 */
class HapticsManager {
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  private trigger(pattern: number | number[]): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Gracefully ignore restricted vibration contexts
    }
  }

  public cancel(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(0);
    } catch {}
  }

  /** Adaptive beat pulse scaling smoothly with current BPM */
  public beat(bpm: BpmState): void {
    const durationMap: Record<BpmState, number> = {
      30: 14,
      60: 18,
      90: 24,
      120: 32,
    };
    this.trigger(durationMap[bpm] ?? 18);
  }

  /** Crisp preparation countdown tick (3 -> 2 -> 1) */
  public prep(): void {
    this.trigger(16);
  }

  /** Distinct double-pulse when advancing stage, cycle, or speed */
  public stageChange(): void {
    this.trigger([28, 45, 28]);
  }

  /** Escalating edge warning pulse during final 10s of 120 BPM sprint */
  public edgeWarning(remainingSecs: number): void {
    if (remainingSecs === 10) {
      this.trigger([35, 35, 35]);
    } else if (remainingSecs <= 3) {
      this.trigger([26, 30, 26]);
    } else {
      this.trigger(22);
    }
  }

  /** Soft descending pattern when entering 30s cooldown */
  public cooldown(): void {
    this.trigger([40, 60, 20]);
  }

  /** Celebratory crescendo pattern upon session completion */
  public climax(): void {
    this.trigger([30, 45, 45, 45, 70]);
  }

  /** Micro-tactile confirmation on active stage tap */
  public tap(): void {
    this.trigger(12);
  }

  /** Immediate tactile confirmation when user enables haptics in Settings */
  public test(): void {
    this.trigger([18, 40, 26]);
  }
}

export const haptics = new HapticsManager();
