import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import GlassTabBar, { getTabBarWidth } from '../../src/components/GlassTabBar';
import { resetTestState } from './helpers';

const mockUseEffectsLevel = jest.fn();
const mockWithSpring = jest.fn((value) => value);
const mockWithTiming = jest.fn((value) => value);

jest.mock('../../src/hooks/useEffectsLevel', () => ({
  __esModule: true,
  default: () => mockUseEffectsLevel(),
}));

jest.mock('expo-blur', () => {
  const ReactMock = jest.requireActual('react');
  const ReactNativeMock = jest.requireActual('react-native');
  return {
    BlurView: ({ testID }: { testID?: string }) =>
      ReactMock.createElement(ReactNativeMock.View, { testID }),
  };
});

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('react-native-reanimated/mock');
  const ReactMock = jest.requireActual('react');
  return {
    ...mock,
    useAnimatedRef: jest.fn(() => jest.fn()),
    useSharedValue: (initialValue: unknown) => {
      const shared = ReactMock.useRef({ value: initialValue });
      return shared.current;
    },
    withSpring: (...args: unknown[]) => mockWithSpring(...args),
    withTiming: (...args: unknown[]) => mockWithTiming(...args),
  };
});

const routes = [
  { key: 'home', name: 'Home' },
  { key: 'explore', name: 'Explore' },
  { key: 'map', name: 'MapTab' },
  { key: 'community', name: 'CommunityTab' },
  { key: 'saved', name: 'Saved' },
  { key: 'profile', name: 'Profile' },
];
const labels = ['Home', 'Search', 'Map', 'Community', 'Saved', 'Profile'];
const testIds = ['tab-home', 'tab-search', 'tab-map', 'tab-community', 'tab-saved', 'tab-profile'];

function createProps(index = 0) {
  return {
    state: { index, routes },
    descriptors: Object.fromEntries(
      routes.map((route, routeIndex) => [route.key, { options: { title: labels[routeIndex] } }]),
    ),
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
  };
}

describe('bottom navigation buttons', () => {
  beforeEach(() => {
    resetTestState();
    mockUseEffectsLevel.mockReturnValue('full');
    mockWithSpring.mockClear();
    mockWithTiming.mockClear();
  });

  test('centers a compact bar with six touch-sized slots at common phone widths', async () => {
    const view = await render(<GlassTabBar {...createProps()} />);
    const containerStyle = StyleSheet.flatten(
      view.getByTestId('glass-tabbar-container').props.style,
    );
    const frameStyle = StyleSheet.flatten(view.getByTestId('glass-tabbar-frame').props.style);

    expect(getTabBarWidth(360)).toBe(328);
    expect(getTabBarWidth(412)).toBe(380);
    expect(getTabBarWidth(480)).toBe(380);
    expect(containerStyle.paddingHorizontal).toBe(16);
    expect(frameStyle.width).toBe('100%');
    expect(frameStyle.maxWidth).toBe(380);
    expect(frameStyle.alignSelf).toBe('center');

    testIds.forEach((testId) => {
      const itemStyle = StyleSheet.flatten(view.getByTestId(testId).props.style);
      expect(itemStyle.flex).toBe(1);
      expect(itemStyle.minWidth).toBe(0);
      expect(itemStyle.height).toBeGreaterThanOrEqual(44);
    });
    expect(getTabBarWidth(360) / testIds.length).toBeCloseTo(54.67, 1);
    expect(getTabBarWidth(412) / testIds.length).toBeCloseTo(63.33, 1);
  });

  test('renders six accessible tabs with the stable tab test IDs', async () => {
    const view = await render(<GlassTabBar {...createProps()} />);

    expect(view.getAllByRole('tab')).toHaveLength(6);
    labels.forEach((label, index) => {
      expect(view.getByRole('tab', { name: label })).toBeTruthy();
      expect(view.getByTestId(testIds[index])).toBeTruthy();
    });
    expect(view.getByTestId('tab-home').props.accessibilityState.selected).toBe(true);
  });

  test('renders one icon and one label in each tab slot', async () => {
    const view = await render(<GlassTabBar {...createProps()} />);
    expect(view.getAllByTestId('tab-icon-slot')).toHaveLength(testIds.length);
    expect(view.getAllByTestId('tab-label-slot')).toHaveLength(testIds.length);
  });

  test('renders a blur layer behind the glass tab capsule', async () => {
    const view = await render(<GlassTabBar {...createProps()} blurTarget={{ current: {} }} />);
    const surfaceStyle = StyleSheet.flatten(view.getByTestId('glass-tabbar-surface').props.style);

    expect(view.getByTestId('glass-tabbar-background-blur')).toBeTruthy();
    expect(surfaceStyle.backgroundColor).toBe('transparent');
    expect(surfaceStyle.borderWidth).toBe(1);
  });

  test('Reduced effects use a solid theme tint without mounting BlurView', async () => {
    mockUseEffectsLevel.mockReturnValue('reduced');
    const view = await render(<GlassTabBar {...createProps()} />);
    const surfaceStyle = StyleSheet.flatten(view.getByTestId('glass-tabbar-surface').props.style);

    expect(view.queryByTestId('glass-tabbar-background-blur')).toBeNull();
    expect(surfaceStyle.backgroundColor).toMatch(/,0\.7\)$/);
  });

  test('selected state follows the active navigation route', async () => {
    const view = await render(<GlassTabBar {...createProps(0)} />);

    await view.rerender(<GlassTabBar {...createProps(3)} />);

    expect(view.getByTestId('tab-home').props.accessibilityState.selected).toBe(false);
    expect(view.getByTestId('tab-community').props.accessibilityState.selected).toBe(true);
  });

  test.each(routes.map((route, index) => [labels[index], route.name]))(
    '%s emits tabPress and navigates to its registered tab route',
    async (label, routeName) => {
      const props = createProps(0);
      const view = await render(<GlassTabBar {...props} />);

      await fireEvent.press(view.getByRole('tab', { name: label }));

      expect(props.navigation.emit).toHaveBeenCalledWith({
        type: 'tabPress',
        target: routes.find((route) => route.name === routeName)?.key,
        canPreventDefault: true,
      });
      if (routeName === 'Home') {
        expect(props.navigation.navigate).not.toHaveBeenCalled();
      } else {
        expect(props.navigation.navigate).toHaveBeenCalledWith(routeName, undefined);
      }
    },
  );

  test('measured capsule moves to the newly selected tab', async () => {
    const firstProps = createProps(0);
    const view = await render(<GlassTabBar {...firstProps} />);
    await fireEvent.layout(view.getByTestId('tab-home'), { x: 0, y: 0, width: 48, height: 60 });
    await fireEvent.layout(view.getByTestId('tab-search'), {
      x: 48,
      y: 0,
      width: 56,
      height: 60,
    });
    const searchProps = createProps(1);

    await view.rerender(<GlassTabBar {...searchProps} />);
    await view.rerender(<GlassTabBar {...searchProps} />);

    const capsuleStyle = StyleSheet.flatten(view.getByTestId('tab-active-capsule').props.style);
    expect(capsuleStyle.transform).toEqual([{ translateX: 52 }]);
    expect(capsuleStyle.width).toBe(48);
    expect(mockWithSpring).toHaveBeenCalledTimes(1);
  });

  test('Effects Off jumps to the active tab without calling animation helpers', async () => {
    mockUseEffectsLevel.mockReturnValue('off');
    const view = await render(<GlassTabBar {...createProps(0)} />);
    mockWithSpring.mockClear();
    mockWithTiming.mockClear();

    await view.rerender(<GlassTabBar {...createProps(1)} />);

    expect(mockWithSpring).not.toHaveBeenCalled();
    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(view.getAllByRole('tab')).toHaveLength(6);
    expect(view.getByRole('tab', { name: 'Search' }).props.accessibilityState.selected).toBe(true);
    expect(view.queryByTestId('glass-tabbar-background-blur')).toBeNull();
  });

  test('all rendered text is contained in a Text element', async () => {
    const view = await render(<GlassTabBar {...createProps()} />);
    const rawTextNodes: string[] = [];

    function inspect(node: unknown, insideText = false) {
      if (typeof node === 'string') {
        if (!insideText && node.trim()) rawTextNodes.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach((child) => inspect(child, insideText));
        return;
      }
      if (!node || typeof node !== 'object' || !('type' in node)) return;
      const element = node as { type?: unknown; children?: unknown };
      const isText =
        typeof element.type === 'string' && element.type.toLowerCase().includes('text');
      inspect(element.children, insideText || isText);
    }

    inspect(view.toJSON());
    expect(rawTextNodes).toEqual([]);
  });
});
