import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { GET as notesGET, POST as notesPOST } from './route';
import { requireManager } from '@/lib/admin-auth';
import { db } from '@/lib/db';

describe('/api/admin/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when memberId is missing on GET', async () => {
    (requireManager as any).mockResolvedValue({ authorized: true, userId: 'u1' });
    const req = new Request('http://localhost/api/admin/notes');
    const res = await notesGET(req);
    expect(res.status).toBe(400);
  });

  it('creates a note successfully', async () => {
    (requireManager as any).mockResolvedValue({ authorized: true, userId: 'u1' });

    const queryMock = vi.fn();
    queryMock
      .mockResolvedValueOnce({ rows: [{ team_id: 't1' }] }) // member team lookup
      .mockResolvedValueOnce({
        rows: [{
          id: 'n1',
          manager_id: 'u1',
          member_id: 'u2',
          note: 'Great standup',
          tags: ['positive'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      });

    const releaseMock = vi.fn();
    (db.pool.connect as any).mockResolvedValue({ query: queryMock, release: releaseMock });

    const req = new Request('http://localhost/api/admin/notes', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'u2', note: 'Great standup', tags: ['positive'] }),
    });
    const res = await notesPOST(req);
    expect(res.status).toBe(201);
  });
});
