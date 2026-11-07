export interface AttributionUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  id?: string;
  content?: string;
  term?: string;
}

export interface AttributionClickIds {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

export interface TouchRecord {
  classifiedSource: string;
  touchedAt: string;
  landingPage: string;
  referrer: string | null;
  utm: AttributionUtm;
  clickIds: AttributionClickIds;
}

export interface AttributionSnapshot {
  v: 1;
  windowDays: number;
  firstTouch: TouchRecord | null;
  lastTouch: TouchRecord | null;
  sessionLandingPage: string;
  submitPage: string;
  submitReferrer: string | null;
  capturedAt: string;
}
