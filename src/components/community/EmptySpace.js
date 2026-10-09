import { MotionTouchable as TouchableOpacity } from '../Motion';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Plus } from 'lucide-react-native';
import Text from './MelaText';
import { melaHeadingFont } from '../../theme/mela';

export default function EmptySpace({
  palette,
  name,
  filtered,
  generalPosts,
  onCompose,
  onGeneral,
}) {
  return (
    <View>
      <View
        style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Svg accessible={false} width={130} height={104} viewBox="0 0 130 104">
          <Circle cx={106} cy={20} r={12} fill={palette.primary} />
          <Path d="M22 45 L32 19 H96 L106 45 Z" fill={palette.primary} />
          <Path
            d="M39 20 L34 45 M56 20 L55 45 M73 20 L76 45 M90 20 L96 45"
            stroke={palette.accent}
            strokeWidth={8}
          />
          <Path
            d="M22 45 Q29 58 36 45 Q43 58 50 45 Q57 58 64 45 Q71 58 78 45 Q85 58 92 45 Q99 58 106 45"
            fill={palette.primary}
            stroke={palette.secondary}
            strokeWidth={2}
          />
          <Rect
            x={29}
            y={53}
            width={70}
            height={40}
            rx={4}
            fill={palette.surfaceAlt}
            stroke={palette.secondary}
            strokeWidth={2}
          />
          <Path d="M24 70 H104 M24 94 H105" stroke={palette.secondary} strokeWidth={3} />
          <Rect
            x={46}
            y={56}
            width={36}
            height={22}
            rx={4}
            fill={palette.surface}
            stroke={palette.border}
          />
          <Path d="M54 66 H74" stroke={palette.accent} strokeWidth={2} />
        </Svg>
        <Text
          style={{
            color: palette.text,
            fontFamily: melaHeadingFont,
            fontSize: 22,
            textAlign: 'center',
          }}
        >
          {name} is warming up
        </Text>
        <Text style={{ color: palette.text2, textAlign: 'center', lineHeight: 22 }}>
          {filtered
            ? 'No posts match these filters yet. Start a conversation or explore General.'
            : 'This space just opened — be the first to post.'}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Create the first post in ${name}`}
          onPress={onCompose}
          style={[styles.create, { backgroundColor: palette.primary }]}
        >
          <Plus size={18} color={palette.onPrimary} />
          <Text style={{ color: palette.onPrimary, fontWeight: '600' }}>Create post</Text>
        </TouchableOpacity>
      </View>
      <View
        style={[styles.strip, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Text style={{ color: palette.text, fontFamily: melaHeadingFont, fontSize: 18 }}>
          Active in General
        </Text>
        {generalPosts.length ? (
          generalPosts.slice(0, 3).map((post) => (
            <TouchableOpacity
              key={post.id}
              accessibilityRole="button"
              accessibilityLabel="Explore this conversation in General"
              onPress={onGeneral}
              style={[styles.preview, { borderLeftColor: palette.secondary }]}
            >
              <Text numberOfLines={2} style={{ color: palette.text2, fontSize: 13 }}>
                {post.body}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: palette.text2, marginTop: 8 }}>
            The stalls are ready. Your conversation can be the first.
          </Text>
        )}
        <TouchableOpacity accessibilityRole="button" onPress={onGeneral} style={styles.explore}>
          <Text style={{ color: palette.actionText, fontWeight: '600' }}>Explore General →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    margin: 18,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
  },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  strip: { marginHorizontal: 18, padding: 16, borderWidth: 1, borderRadius: 16 },
  preview: {
    marginTop: 12,
    paddingLeft: 10,
    borderLeftWidth: 3,
    minHeight: 44,
    justifyContent: 'center',
  },
  explore: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
});
