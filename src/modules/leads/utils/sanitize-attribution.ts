import type {
  AttributionSnapshot,
  TouchRecord,
} from '../types/attribution.types';
import { cleanTrackingValue, truncate } from './normalize-text';

function sanitizeTouch(touch: TouchRecord | null | undefined): TouchRecord | null {
  if (!touch || typeof touch !== 'object') return null;

  const utm = touch.utm && typeof touch.utm === 'object' ? touch.utm : {};
  const clickIds = touch.clickIds && typeof touch.clickIds === 'object' ? touch.clickIds : {};

  return {
    classifiedSource: truncate(String(touch.classifiedSource || 'unknown'), 64) || 'unknown',
    touchedAt: String(touch.touchedAt || new Date().toISOString()).slice(0, 40),
    landingPage: truncate(String(touch.landingPage || '/'), 1024) || '/',
    referrer: truncate(touch.referrer ?? null, 2048),
    utm: {
      source: truncate(utm.source, 128) ?? undefined,
      medium: truncate(utm.medium, 128) ?? undefined,
      campaign: truncate(utm.campaign, 256) ?? undefined,
      id: truncate(utm.id, 128) ?? undefined,
      content: truncate(utm.content, 256) ?? undefined,
      term: truncate(utm.term, 256) ?? undefined,
    },
    clickIds: {
      gclid: truncate(clickIds.gclid, 256) ?? undefined,
      gbraid: truncate(clickIds.gbraid, 256) ?? undefined,
      wbraid: truncate(clickIds.wbraid, 256) ?? undefined,
    },
  };
}

/** Validate and sanitize untrusted browser attribution; reject oversized payloads. */
export function sanitizeAttributionSnapshot(
  raw: AttributionSnapshot | null | undefined,
): AttributionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;

  const serialized = JSON.stringify(raw);
  if (serialized.length > 4096) {
    return null;
  }

  return {
    v: 1,
    windowDays: Math.min(Math.max(Number(raw.windowDays) || 30, 1), 365),
    firstTouch: sanitizeTouch(raw.firstTouch),
    lastTouch: sanitizeTouch(raw.lastTouch),
    sessionLandingPage: truncate(String(raw.sessionLandingPage || '/'), 1024) || '/',
    submitPage: truncate(String(raw.submitPage || '/'), 1024) || '/',
    submitReferrer: truncate(raw.submitReferrer ?? null, 2048),
    capturedAt: String(raw.capturedAt || new Date().toISOString()).slice(0, 40),
  };
}

export function classifySourceFromTouch(touch: TouchRecord | null): string | null {
  if (!touch) return null;
  const source = cleanTrackingValue(touch.classifiedSource || '');
  return source || null;
}
