import { runAuthResumableWrite, resumeAuthWriteDrafts } from '../../src/data/authResumableWrite';

const mockDrafts: { id: string; operation: string; payload: unknown; owner_id?: string }[] = [];

jest.mock('../../src/data/localDatabase', () => ({
  storeAuthWriteDraft: jest.fn(async (operation: string, payload: unknown, owner_id: string) => {
    const id = `draft-${mockDrafts.length + 1}`;
    mockDrafts.push({ id, operation, payload, owner_id });
    return id;
  }),
  loadAuthWriteDrafts: jest.fn(async () => [...mockDrafts]),
  removeAuthWriteDraft: jest.fn(async (id: string) => {
    const index = mockDrafts.findIndex((draft) => draft.id === id);
    if (index >= 0) mockDrafts.splice(index, 1);
  }),
}));

const forms = [
  ['review', 'review_create', { input: { providerId: 'provider-1', comment: 'Good work' } }],
  ['quote', 'quote_request', { input: { providerId: 'provider-1', message: 'Please quote' } }],
  ['booking', 'booking_create', { input: { providerId: 'provider-1', requestedDate: '2027-01-01' } }],
  ['profile', 'profile_update', { input: { name: 'Member', location: 'Leeds' } }],
  ['provider report', 'provider_report', { providerId: 'provider-1', reason: 'incorrect_information', details: 'Wrong address' }],
  ['claim listing', 'claim_provider', { providerId: 'provider-1' }],
  ['community comment', 'community_comment', { postId: 'post-1', body: 'Useful comment' }],
] as const;

describe.each(forms)('%s auth recovery', (formName, operation, payload) => {
  beforeEach(() => mockDrafts.splice(0, mockDrafts.length));

  test('keeps the payload, prompts sign-in, and retries the same write after auth', async () => {
    const expired = Object.assign(new Error('JWT expired'), {
      code: 'JWT_EXPIRED',
      status: 401,
    });
    const onAuthRequired = jest.fn();
    const write = jest.fn().mockRejectedValue(expired);

    await expect(
      runAuthResumableWrite({ operation, payload, ownerId: 'user-a', write, onAuthRequired }),
    ).rejects.toMatchObject({ authRequired: true, message: 'Please sign in again' });
    expect(onAuthRequired).toHaveBeenCalledWith({
      operation,
      payload,
      draftId: 'draft-1',
    });
    expect(mockDrafts[0]).toMatchObject({ operation, payload, owner_id: 'user-a' });

    const retry = jest.fn().mockResolvedValue({ confirmed: true });
    const resumed = await resumeAuthWriteDrafts('user-a', (draftOperation, draftPayload) => {
      expect(draftOperation).toBe(operation);
      expect(draftPayload).toEqual(payload);
      return retry;
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(resumed[0].result).toEqual({ confirmed: true });
    expect(mockDrafts).toHaveLength(0);
    expect(formName).toBeTruthy();
  });
});

test('draft-replay-auth-owner', async () => {
  const expired = Object.assign(new Error('JWT expired'), {
    code: 'JWT_EXPIRED',
    status: 401,
  });
  const writeAsUserA = jest.fn().mockRejectedValue(expired);
  await expect(
    runAuthResumableWrite({
      operation: 'profile_update',
      payload: { input: { name: 'User A' } },
      ownerId: 'user-a',
      write: writeAsUserA,
    }),
  ).rejects.toMatchObject({ authRequired: true });

  const replay = jest.fn().mockResolvedValue({ confirmed: true });
  const replayForUser = jest.fn(() => replay);
  await expect(resumeAuthWriteDrafts('user-b', replayForUser)).resolves.toEqual([]);
  expect(replayForUser).not.toHaveBeenCalled();
  expect(mockDrafts).toHaveLength(1);

  const resumed = await resumeAuthWriteDrafts('user-a', replayForUser);
  expect(replayForUser).toHaveBeenCalledWith('profile_update', { input: { name: 'User A' } });
  expect(replay).toHaveBeenCalledTimes(1);
  expect(resumed[0].result).toEqual({ confirmed: true });
  expect(mockDrafts).toHaveLength(0);
});

test('discards legacy drafts without an owner', async () => {
  mockDrafts.push({ id: 'legacy-draft', operation: 'profile_update', payload: {} });
  const replayForUser = jest.fn(() => jest.fn());

  await expect(resumeAuthWriteDrafts('user-a', replayForUser)).resolves.toEqual([]);
  expect(replayForUser).not.toHaveBeenCalled();
  expect(mockDrafts).toHaveLength(0);
});
