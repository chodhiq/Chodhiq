import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import GlowCard from '../GlowCard';

interface GlowSurfaceProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  showAccentDecoration?: boolean;
  shadowTint?: 'primary' | 'none';
}

export function GlowListItem({ children, style, contentStyle }: GlowSurfaceProps) {
  return (
    <GlowCard variant="row" style={style} contentStyle={contentStyle}>
      {children}
    </GlowCard>
  );
}

export function GlowSettingsRow({ children, style, contentStyle }: GlowSurfaceProps) {
  return (
    <GlowCard variant="settings" style={style} contentStyle={contentStyle}>
      {children}
    </GlowCard>
  );
}

export function GlowProfileCard({
  children,
  style,
  contentStyle,
  showAccentDecoration,
  shadowTint,
}: GlowSurfaceProps) {
  return (
    <GlowCard
      variant="profile"
      style={style}
      contentStyle={contentStyle}
      showAccentDecoration={showAccentDecoration}
      shadowTint={shadowTint}
    >
      {children}
    </GlowCard>
  );
}

export function GlowMapInfoCard({ children, style, contentStyle }: GlowSurfaceProps) {
  return (
    <GlowCard variant="map" style={style} contentStyle={contentStyle}>
      {children}
    </GlowCard>
  );
}
