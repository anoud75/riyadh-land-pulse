import { describe, expect, it } from 'vitest';
import { initialInquiries as I, initialParcels as P } from '@/data';
import { adminRequestPolicy, buildWaitingResponse, relevantAdminPayloads } from '@/lib/adminAgentPolicy';
import type { UiPayload } from '@/lib/agentUi';
import { mapCommand } from '@/lib/agentViz';

describe('team reply relevance', () => {
  const map: UiPayload = { kind: 'map', command: mapCommand(P, {}) };
  it('matching does not authorize an unsolicited map', () => {
    expect(adminRequestPolicy('طابق الاستفسارات المنتظرة مع المخزون، ومن نستبعد؟').map).toBe(false);
    expect(relevantAdminPayloads('طابق المنتظرين', [map])).toEqual([]);
  });
  it('explicit map requests remain supported', () => {
    expect(relevantAdminPayloads('افتح الخريطة على الشمال', [map])).toEqual([map]);
  });
  it('external market cards are excluded from team replies', () => {
    expect(relevantAdminPayloads('طابق المنتظرين', [{ kind: 'market_insight', parcelId: 'SRE-042' }])).toEqual([]);
  });
  it('summarizes waiting inquiries without parcel-code prose and partitions every row', () => {
    const r = buildWaitingResponse(P, I);
    expect(r.total).toBe(24);
    expect(r.ready + r.excluded + r.review).toBe(24);
    expect(r.text).not.toMatch(/SRE-\d/);
    expect(r.ui.kind).toBe('matching');
    if (r.ui.kind !== 'matching') throw new Error('Missing matching rows');
    expect(r.ui.rows.filter((row) => row.flag === 'لا مخزون في الشريحة').every((row) => row.matches.length === 0)).toBe(true);
    expect(r.ui.rows.some((row) => row.matches.length > 0)).toBe(true);
  });
});