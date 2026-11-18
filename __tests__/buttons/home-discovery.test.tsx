import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  HomeBusinessCard,
  HomeCategory,
  HomeFeaturedCategories,
  HomeHero,
  HomeHeader,
  HomeSectionHeader,
} from '../../src/components/HomeComponents';
import {
  ExploreBusinessCard,
  ExploreHeader,
  ExploreSearch,
  SegmentedTabs,
} from '../../src/components/ExploreComponents';
import ExploreScreen from '../../src/screens/ExploreScreen';
import HomeScreen from '../../src/screens/HomeScreen';
import { resetTestState, testProvider } from './helpers';
import { MapScreen } from '../../src/screens/DiscoveryScreens';
import { openExternalUrl } from '../../src/lib/openExternalUrl';

jest.mock('../../src/components/ChodhiQMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockMap() {
    return React.createElement(View, { accessibilityLabel: 'Map canvas' });
  };
});

jest.mock('../../src/lib/openExternalUrl', () => ({
  openExternalUrl: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/data/adCampaignRepository', () => ({
  loadActiveCampaigns: jest.fn().mockResolvedValue([]),
  recordCampaignEvent: jest.fn().mockResolvedValue(undefined),
}));

const palette = globalThis.__CHODHIQ_TEST_PALETTE__;

describe('home and discovery buttons', () => {
  beforeEach(() => resetTestState());

  test('home notifications, profile, area picker, location and search dispatch their actions', async () => {
    const handlers = {
      notifications: jest.fn(),
      profile: jest.fn(),
      area: jest.fn(),
      currentLocation: jest.fn(),
      search: jest.fn(),
    };
    const view = await render(
      <HomeHeader
        palette={palette}
        unreadCount={2}
        location="Birmingham"
        profile={{ name: 'Test' }}
        onNotifications={handlers.notifications}
        onProfile={handlers.profile}
        onLocation={handlers.area}
        onCurrentLocation={handlers.currentLocation}
        onSearch={handlers.search}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: /Open notifications/ }));
    await fireEvent.press(view.getByRole('button', { name: 'Open profile' }));
    await fireEvent.press(view.getByRole('button', { name: 'Choose your area' }));
    await fireEvent.press(view.getByRole('button', { name: 'Use current location' }));
    await fireEvent.press(view.getByRole('button', { name: /Search for restaurants/ }));
    expect(handlers.notifications).toHaveBeenCalledTimes(1);
    expect(handlers.profile).toHaveBeenCalledTimes(1);
    expect(handlers.area).toHaveBeenCalledTimes(1);
    expect(handlers.currentLocation).toHaveBeenCalledTimes(1);
    expect(handlers.search).toHaveBeenCalledTimes(1);
  });

  test('disabled location control does not request another location', async () => {
    const onCurrentLocation = jest.fn();
    const view = await render(
      <HomeHeader
        palette={palette}
        location="Birmingham"
        currentLocationLoading
        onCurrentLocation={onCurrentLocation}
      />,
    );
    const button = view.getByRole('button', { name: 'Use current location' });
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBe(true);
    await fireEvent.press(button);
    expect(onCurrentLocation).not.toHaveBeenCalled();
  });

  test('category shortcuts, More and See all invoke their real callbacks', async () => {
    const onCategory = jest.fn();
    const onMore = jest.fn();
    const onSeeAll = jest.fn();
    const categories = await render(
      <>
        <HomeCategory
          palette={palette}
          category={{ id: 'barber', name: 'Barber' }}
          onPress={onCategory}
        />
        <HomeCategory palette={palette} more onPress={onMore} />
        <HomeSectionHeader palette={palette} title="Popular" onPress={onSeeAll} />
      </>,
    );
    await fireEvent.press(categories.getByText('Barber'));
    await fireEvent.press(categories.getByText('More'));
    await fireEvent.press(categories.getByText('See all'));
    expect(onCategory).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  test('Explore now, Visit sponsor, and Explore filters reach their outcomes', async () => {
    const explore = jest.fn();
    const sponsoredPress = jest.fn();
    const sponsoredImpression = jest.fn();
    const campaign = {
      id: 'campaign-1',
      title: 'Local sponsor',
      subtitle: 'A nearby offer',
      image: { uri: 'file:///sponsor.jpg' },
    };
    const hero = await render(
      <>
        <HomeHero palette={palette} image={{ uri: 'file:///hero.jpg' }} onPress={explore} />
        <HomeHero
          palette={palette}
          image={{ uri: 'file:///hero.jpg' }}
          campaign={campaign}
          onCampaignPress={sponsoredPress}
          onCampaignImpression={sponsoredImpression}
        />
      </>,
    );
    await fireEvent.press(hero.getByLabelText('Explore nearby places'));
    await fireEvent.press(hero.getByLabelText('Sponsored: Local sponsor'));
    expect(explore).toHaveBeenCalledTimes(1);
    expect(sponsoredPress).toHaveBeenCalledWith(campaign);
    expect(sponsoredImpression).toHaveBeenCalledWith(campaign);

    const screen = await render(
      <ExploreScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} route={{ params: {} }} />,
    );
    expect(screen.getByTestId('btn-explore-sort')).toBeTruthy();
    expect(screen.queryByLabelText('Back to Home')).toBeNull();
    expect(screen.getAllByLabelText('Open search filters')).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText('Open search filters'));
    expect(screen.getAllByText('Filters')).toHaveLength(1);
    await fireEvent.press(screen.getByText('Highest rated'));
    await fireEvent.press(screen.getByText('Reset'));
    await fireEvent.press(screen.getByRole('button', { name: /Show \d+ result/ }));
    expect(screen.queryByText('Reset')).toBeNull();
  });

  test('map controls filter, reset, change map type, save a business and open directions', async () => {
    const state = resetTestState({
      session: { user: { id: 'member-1' } },
      providers: [
        {
          ...testProvider,
          baseLatitude: 52.4862,
          baseLongitude: -1.8904,
        },
      ],
    });
    const navigation = globalThis.__CHODHIQ_TEST_NAVIGATION__;
    const view = await render(<MapScreen navigation={navigation} route={{ name: 'MapTab' }} />);

    await fireEvent.press(view.getByLabelText('Switch to satellite map'));
    expect(view.getByLabelText('Switch to standard map')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Show map filters'));
    await fireEvent.press(view.getByLabelText('Birmingham'));
    await fireEvent.press(view.getByLabelText('Reset all map filters'));
    expect(view.getByText('Everywhere')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Save Test Barber'));
    expect(state.toggleSaved).toHaveBeenCalledWith(testProvider.id);
    await fireEvent.press(view.getByLabelText('Directions to Test Barber'));
    expect(openExternalUrl).toHaveBeenCalledWith(
      expect.stringContaining('destination=52.4862%2C-1.8904'),
      expect.objectContaining({ title: 'Directions unavailable' }),
    );
  });

  test('business card opens details and toggles save state', async () => {
    const onPress = jest.fn();
    const onSave = jest.fn();
    const view = await render(
      <HomeBusinessCard
        palette={palette}
        provider={testProvider}
        saved={false}
        onPress={onPress}
        onSave={onSave}
      />,
    );
    await fireEvent.press(view.getByLabelText(/View Test Barber/));
    await fireEvent.press(view.getByLabelText('Save Test Barber'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('Search root has no back arrow while its filter entry, tabs and listing controls work', async () => {
    const handlers = {
      filters: jest.fn(),
      tab: jest.fn(),
      card: jest.fn(),
      save: jest.fn(),
    };
    const view = await render(
      <>
        <ExploreHeader palette={palette} />
        <ExploreSearch
          palette={palette}
          value=""
          onChange={jest.fn()}
          onFilters={handlers.filters}
        />
        <SegmentedTabs palette={palette} value="Businesses" onChange={handlers.tab} />
        <ExploreBusinessCard
          palette={palette}
          provider={testProvider}
          saved={false}
          onPress={handlers.card}
          onSave={handlers.save}
        />
      </>,
    );
    await fireEvent.press(view.getByLabelText('Open search filters'));
    await fireEvent.press(view.getByText('Events'));
    await fireEvent.press(view.getByLabelText('View Test Barber'));
    await fireEvent.press(view.getByLabelText('Save Test Barber'));
    expect(view.queryByLabelText('Back to Home')).toBeNull();
    expect(handlers.filters).toHaveBeenCalledTimes(1);
    expect(handlers.tab).toHaveBeenCalledWith('Events');
    expect(handlers.card).toHaveBeenCalledTimes(1);
    expect(handlers.save).toHaveBeenCalledTimes(1);
  });

  test('home featured categories keep empty categories visible', async () => {
    const categories = await render(
      <HomeFeaturedCategories
        palette={palette}
        categories={[
          { id: 'events', name: 'Event Catering' },
          { id: 'south-indian', name: 'South Indian Restaurants' },
        ]}
        providers={[{ ...testProvider, categoryId: 'events', category: 'Event Catering' }]}
        onCategory={jest.fn()}
      />,
    );
    expect(categories.getByText('Event Catering')).toBeTruthy();
    expect(categories.getByText('1 place')).toBeTruthy();
    expect(categories.getByText('South Indian Restaurants')).toBeTruthy();
    expect(categories.getByText('No places yet')).toBeTruthy();
  });

  test('Home, Featured collections and Search show all five categories with one provider', async () => {
    const categories = Array.from({ length: 5 }, (_, index) => ({
      id: `category-${index + 1}`,
      name: `Category ${index + 1}`,
    }));
    resetTestState({
      categories,
      providers: [{ ...testProvider, categoryId: categories[0].id, category: categories[0].name }],
    });

    const home = await render(<HomeScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} />);
    expect(home.queryAllByLabelText('Browse Category 1').length).toBeGreaterThan(0);
    expect(home.queryAllByLabelText('Browse Category 2').length).toBeGreaterThan(0);
    expect(home.queryAllByLabelText('Browse Category 3').length).toBeGreaterThan(0);
    expect(home.getByLabelText('See more categories')).toBeTruthy();
    expect(home.getByText('Featured collections')).toBeTruthy();
    expect(home.queryAllByText(categories[0].name).length).toBeGreaterThan(0);
    expect(home.getByText('1 place')).toBeTruthy();

    const search = await render(
      <ExploreScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} route={{ params: {} }} />,
    );
    for (const category of categories) expect(search.getByLabelText(category.name)).toBeTruthy();
  });

  test('Search hides sort controls when there are no results', async () => {
    resetTestState({ providers: [] });
    const screen = await render(
      <ExploreScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} route={{ params: {} }} />,
    );
    expect(screen.getByText('0 results')).toBeTruthy();
    expect(screen.queryByTestId('btn-explore-sort')).toBeNull();
  });

  test('explore-zero-results-filters', async () => {
    resetTestState({ providers: [] });
    const screen = await render(
      <ExploreScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} route={{ params: {} }} />,
    );
    await fireEvent.press(screen.getByLabelText('Open search filters'));
    expect(screen.queryByText('Sort by')).toBeNull();
    expect(screen.getByText('Price range')).toBeTruthy();
  });

  test('Home does not repeat a provider shown in Recently added', async () => {
    resetTestState({
      providers: [
        {
          ...testProvider,
          id: 'listing-1',
          publishedAt: '2026-11-01T10:00:00Z',
          categoryId: 'barber',
          category: 'Barber',
        },
      ],
      categories: [{ id: 'barber', name: 'Barber' }],
    });
    const home = await render(<HomeScreen navigation={globalThis.__CHODHIQ_TEST_NAVIGATION__} />);
    expect(home.getAllByTestId('btn-home-provider')).toHaveLength(1);
  });
});
