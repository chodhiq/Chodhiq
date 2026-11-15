import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import PulseDot from './PulseDot';
import { theme } from '../theme';

export interface AvatarProps {
  username: string;
  online?: boolean;
}

export default function Avatar({ username, online = false }: AvatarProps) {
  const initial = username.trim().charAt(0).toUpperCase();

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        pointerEvents="none"
        colors={[theme.colors.primaryDark, theme.colors.primaryDeep, '#061B13']}
        style={styles.avatar}
      >
        <Text style={styles.initial}>{initial}</Text>
      </LinearGradient>
      {online && (
        <View style={styles.onlineDot}>
          <PulseDot size={10} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 54,
    height: 54,
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
  },
  initial: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.surface,
  },
});
