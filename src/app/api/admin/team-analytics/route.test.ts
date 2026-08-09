import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/response
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status ?? 200 } as any),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    pool: {
      connect: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin-auth', () => ({
  requireManager: vi.fn(),
}));

import { GET as teamAnalyticsGET } from './route';
import { requireManager } from '@/lib/admin-auth';
import { db } from '@/lib/db';

describe('/api/admin/team-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when user is not a manager', async () => {
    (requireManager as any).mockResolvedValue({ authorized: false, response: { body: { error: 'Forbidden' }, status: 403 } });
    const req = new Request('http://localhost/api/admin/team-analytics?teamId=team-1');
    const res = await teamAnalyticsGET(req);
    expect(res.status).toBe(403);
  });

  it('returns metrics for authorized manager', async () => {
    (requireManager as any).mockResolvedValue({ authorized: true, userId: 'u1', email: 'a@b.com' });

    const queryMock = vi.fn();
    queryMock
      .mockResolvedValueOnce({ rows: [{ user_id: 'u1' }, { user_id: 'u2' }] }) // members
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // totalMembers
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // active
      .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // totalStandups
      .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // completed
      .mockResolvedValueOnce({ rows: [{ avg: '180' }] }) // avgDuration
      .mockResolvedValueOnce({ rows: [{ avg_mood: '3.5' }] }) // avgMood
      .mockResolvedValueOnce({ rows: [{ day: new Date(), count: '2' }] }); // dailyTrend

    const releaseMock = vi.fn();
    (db.pool.connect as any).mockResolvedValue({ query: queryMock, release: releaseMock });

    const req = new Request('http://localhost/api/admin/team-analytics?teamId=team-1');
    const res = await teamAnalyticsGET(req);
    expect(res.status).toBe(200);
    const body = await (res as any).json?.().catch(() => (res as any).body);
    expect(body.members.total).toBe(2);
  });
});
