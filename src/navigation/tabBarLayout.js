export const TAB_BAR_HEIGHT = 48;
export const TAB_BAR_BOTTOM_PADDING = 8;
export const TAB_BAR_CONTENT_GAP = 16;

export function getTabBarSafeBottom(bottomInset = 0) {
  return Math.max(Number.isFinite(bottomInset) ? bottomInset : 0, TAB_BAR_BOTTOM_PADDING);
}

export function getTabBarOverlayHeight(bottomInset = 0) {
  return TAB_BAR_HEIGHT + getTabBarSafeBottom(bottomInset) + TAB_BAR_BOTTOM_PADDING;
}

export function getTabBarContentPadding(bottomInset = 0) {
  return getTabBarOverlayHeight(bottomInset) + TAB_BAR_CONTENT_GAP;
}
