import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ api: vi.fn() }));

import { api } from './client';
import { getAllMyRooms, getMyRoomStats, type MyRoomDto } from './me';

const room = (n: number): MyRoomDto => ({
  roomId: `id-${n}`,
  roomCode: 'ABCD2345',
  title: `Gala ${n}`,
  destination: 'Somewhere',
  startDate: '2026-10-10',
  endDate: null,
  type: 'GROUP',
  status: 'ACTIVE',
  phase: 'PLANNING',
  myRole: 'MEMBER',
  memberCount: 3,
});

const mocked = vi.mocked(api);

describe('getAllMyRooms', () => {
  beforeEach(() => mocked.mockReset());

  it('requests the view with limit=50 and returns the items', async () => {
    mocked.mockResolvedValueOnce({ items: [room(1)], nextCursor: null, limit: 50 });
    const out = await getAllMyRooms('ongoing');
    expect(mocked).toHaveBeenCalledWith('/me/rooms?view=ongoing&limit=50');
    expect(out).toEqual([room(1)]);
  });

  it('follows the cursor across pages and concatenates in order', async () => {
    mocked
      .mockResolvedValueOnce({ items: [room(1)], nextCursor: '50', limit: 50 })
      .mockResolvedValueOnce({ items: [room(2)], nextCursor: null, limit: 50 });
    const out = await getAllMyRooms('upcoming');
    expect(mocked).toHaveBeenNthCalledWith(2, '/me/rooms?view=upcoming&limit=50&cursor=50');
    expect(out.map((r) => r.title)).toEqual(['Gala 1', 'Gala 2']);
  });

  it('url-encodes the cursor', async () => {
    mocked
      .mockResolvedValueOnce({ items: [], nextCursor: 'a b&c', limit: 50 })
      .mockResolvedValueOnce({ items: [], nextCursor: null, limit: 50 });
    await getAllMyRooms('completed');
    expect(mocked).toHaveBeenNthCalledWith(2, '/me/rooms?view=completed&limit=50&cursor=a%20b%26c');
  });

  it('stops at 10 pages even if the server never stops sending a cursor', async () => {
    mocked.mockResolvedValue({ items: [room(1)], nextCursor: 'more', limit: 50 });
    const out = await getAllMyRooms('archived');
    expect(mocked).toHaveBeenCalledTimes(10);
    expect(out).toHaveLength(10);
  });

  it('surfaces an API error instead of swallowing it', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    await expect(getAllMyRooms('ongoing')).rejects.toThrow('boom');
  });
});

describe('getMyRoomStats', () => {
  it('calls /me/rooms/stats', async () => {
    mocked.mockResolvedValueOnce({ completed: 1, people: 8, archived: 2 });
    expect(await getMyRoomStats()).toEqual({ completed: 1, people: 8, archived: 2 });
    expect(mocked).toHaveBeenLastCalledWith('/me/rooms/stats');
  });
});
