import React from 'react';
import { Alert, Share } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import DocumentPicker from 'expo-document-picker';
import ClaimListingScreen from '../../src/screens/ClaimListingScreen';
import { CreatePostScreen, SubscriptionPlansScreen } from '../../src/screens/MarketplaceScreens';
import PrivacyScreen from '../../src/screens/PrivacyScreen';
import { exportCurrentAccount } from '../../src/data/accountRepository';
import {
  claimProvider,
  createProvider,
  ensureVerificationDraft,
  listClaimableProviders,
  listProviderCategories,
  submitProviderVerification,
  uploadVerificationDocument,
} from '../../src/data/claimRepository';
import { resetTestState, testProvider } from './helpers';

jest.mock('../../src/data/claimRepository', () => ({
  claimProvider: jest.fn().mockResolvedValue({
    request_id: 'request-1',
    provider_id: 'provider-1',
    business_name: 'Test Barber',
  }),
  createProvider: jest.fn().mockResolvedValue({ id: 'provider-new', business_name: 'New Barber' }),
  ensureVerificationDraft: jest.fn().mockResolvedValue('request-new'),
  listClaimableProviders: jest.fn().mockResolvedValue([]),
  listProviderCategories: jest.fn().mockResolvedValue([{ id: 'barber', name: 'Barber' }]),
  submitProviderVerification: jest.fn().mockResolvedValue(undefined),
  uploadVerificationDocument: jest.fn().mockResolvedValue({ name: 'verification.pdf' }),
}));

jest.mock('../../src/data/accountRepository', () => ({
  exportCurrentAccount: jest.fn().mockResolvedValue({ account: 'test export' }),
}));

const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;

describe('listing, marketplace and privacy buttons', () => {
  beforeEach(() => {
    resetTestState();
    (listClaimableProviders as jest.Mock).mockResolvedValue([]);
    (listProviderCategories as jest.Mock).mockResolvedValue([{ id: 'barber', name: 'Barber' }]);
  });

  test('Claim existing listing creates a claim request and enters verification', async () => {
    (listClaimableProviders as jest.Mock).mockResolvedValue([
      { id: 'existing-1', business_name: 'Existing Barber', base_city: 'Birmingham' },
    ]);
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    const view = await render(<ClaimListingScreen navigation={navigation} />);
    await waitFor(() => expect(view.getByText('Existing Barber')).toBeTruthy());
    await fireEvent.press(view.getByText('Existing Barber'));
    await waitFor(() => expect(claimProvider).toHaveBeenCalledWith('existing-1'));
    expect(view.getByText('Ownership evidence')).toBeTruthy();
    expect(state.session.user.id).toBe('member-1');
  });

  test('Create workspace validates fields, creates the listing, and allows verification upload', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const view = await render(<ClaimListingScreen navigation={navigation} />);
    await waitFor(() => expect(view.getByText('Claim existing')).toBeTruthy());
    await fireEvent.press(view.getByText('Create new'));
    await fireEvent.changeText(view.getByLabelText('Business name'), 'New Barber');
    await fireEvent.changeText(view.getByLabelText('Base city'), 'Birmingham');
    await fireEvent.press(view.getByText('Create workspace'));
    await waitFor(() =>
      expect(createProvider).toHaveBeenCalledWith(
        'member-1',
        expect.objectContaining({ businessName: 'New Barber', city: 'Birmingham' }),
      ),
    );

    await fireEvent.press(view.getByText('Upload PDF or image'));
    await waitFor(() => expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(uploadVerificationDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'provider-new',
          userId: 'member-1',
          documentType: 'business_registration',
        }),
      ),
    );
    expect(ensureVerificationDraft).toHaveBeenCalled();
  });

  test('Submit verification calls the repository only after a document is selected', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    (listClaimableProviders as jest.Mock).mockResolvedValue([
      { id: 'existing-1', business_name: 'Existing Barber', base_city: 'Birmingham' },
    ]);
    const view = await render(<ClaimListingScreen navigation={navigation} />);
    await waitFor(() => expect(view.getByText('Existing Barber')).toBeTruthy());
    await fireEvent.press(view.getByText('Existing Barber'));
    await waitFor(() => expect(view.getByText('Ownership evidence')).toBeTruthy());
    const submit = view.getByRole('button', { name: 'Submit verification' });
    expect(submit.props.accessibilityState?.disabled ?? submit.props.disabled).toBe(true);
    await fireEvent.press(submit);
    expect(submitProviderVerification).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText('Upload PDF or image'));
    await waitFor(() =>
      expect(
        view.getByRole('button', { name: 'Submit verification' }).props.accessibilityState
          ?.disabled ?? view.getByRole('button', { name: 'Submit verification' }).props.disabled,
      ).toBe(false),
    );
    await fireEvent.press(view.getByRole('button', { name: 'Submit verification' }));
    await waitFor(() => expect(submitProviderVerification).toHaveBeenCalledWith('provider-1', ''));
  });

  test('plan selection remains disabled while payments are unavailable', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      access: {
        ownedProviders: [{ id: 'provider-1', is_verified: true, verification_status: 'verified' }],
      },
    });
    const view = await render(<SubscriptionPlansScreen navigation={navigation} />);
    const plan = view
      .getAllByRole('button')
      .find((button) => button.props.accessibilityLabel?.startsWith('Choose'));
    expect(plan).toBeTruthy();
    expect(plan?.props.accessibilityState?.disabled ?? plan?.props.disabled).toBe(true);
    await fireEvent.press(plan!);
    expect(state.session).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('poster image add and remove controls update the poster selection', async () => {
    const state = resetTestState({ session: { user: { id: 'member-1' } } });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///poster.jpg' }],
    });
    const view = await render(<CreatePostScreen navigation={navigation} />);
    await fireEvent.press(view.getByText('Add poster images'));
    await waitFor(() => expect(view.getByText('1/1')).toBeTruthy());
    await fireEvent.press(view.getByText('Remove image'));
    expect(view.getByText('0/1')).toBeTruthy();
    expect(state.session.user.id).toBe('member-1');
  });

  test('Publish post surfaces failure and restores the enabled action', async () => {
    resetTestState({ session: { user: { id: 'member-1' } }, providers: [testProvider] });
    const view = await render(<CreatePostScreen navigation={navigation} />);
    await fireEvent.changeText(
      view.getByPlaceholderText('Weekend special offer'),
      'A useful update',
    );
    await fireEvent.changeText(
      view.getByPlaceholderText('Share the details, dates and how to claim it.'),
      'The details are in this update.',
    );
    await fireEvent.press(view.getByText('Publish post'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could not save',
        'Offline',
        expect.any(Array),
        expect.any(Object),
      ),
    );
    expect(view.getByText('Publish post').props.disabled).not.toBe(true);
  });

  test('Export my data shares the real account export', async () => {
    resetTestState({ session: { user: { id: 'member-1' } } });
    const view = await render(<PrivacyScreen navigation={navigation} />);
    await fireEvent.press(view.getByText('Export my data'));
    await waitFor(() => expect(exportCurrentAccount).toHaveBeenCalledWith('member-1'));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My ChodhiQ data export',
        message: expect.stringContaining('test export'),
      }),
    );
  });

  test('delete account requires confirmation then deletes after explicit confirmation', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      deleteAccount: jest.fn().mockResolvedValue(undefined),
    });
    const view = await render(<PrivacyScreen navigation={navigation} />);
    const deleteButton = view.getByRole('button', { name: 'Delete my account' });
    expect(deleteButton.props.accessibilityState?.disabled ?? deleteButton.props.disabled).toBe(
      true,
    );
    await fireEvent.press(deleteButton);
    expect(Alert.alert).not.toHaveBeenCalled();
    await fireEvent.changeText(view.getByLabelText(/Type DELETE/), 'DELETE');
    await fireEvent.press(view.getByText('Delete my account'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Permanently delete account?',
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
    );
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await actions.find((action) => action.text === 'Delete permanently').onPress();
    await waitFor(() => expect(state.deleteAccount).toHaveBeenCalledTimes(1));
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  });
});
