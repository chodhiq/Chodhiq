import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Bookmark, Check, Heart, Image as ImageIcon, Send } from 'lucide-react-native';
import GlowCard from '../components/GlowCard';
import GlowButton, {
  type GlowButtonStatus,
  type GlowButtonVariant,
} from '../components/ui/GlowButton';
import GlowChip from '../components/ui/GlowChip';
import GlowIconButton from '../components/ui/GlowIconButton';
import Screen, { type BackgroundVariant } from '../components/ui/Screen';
import { theme } from '../theme';

const variants: GlowButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const statuses: GlowButtonStatus[] = ['idle', 'loading', 'success', 'error'];
const backgroundVariants: BackgroundVariant[] = ['default', 'subtle', 'intense'];

export default function DevUIGallery() {
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>('default');
  const [input, setInput] = useState('');

  return (
    <Screen
      scroll
      variant={backgroundVariant}
      contentContainerStyle={styles.content}
      scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <Text style={styles.title}>UI Gallery</Text>
      <Text style={styles.subtitle}>Development-only previews of shared effects and controls.</Text>

      <GlowCard variant="settings" contentStyle={styles.cardContent}>
        <Text style={styles.sectionTitle}>Background variants</Text>
        <View style={styles.chipRow}>
          {backgroundVariants.map((variant) => (
            <GlowChip
              key={variant}
              label={variant}
              selected={backgroundVariant === variant}
              onPress={() => setBackgroundVariant(variant)}
            />
          ))}
        </View>
      </GlowCard>

      <GlowCard variant="settings" contentStyle={styles.cardContent}>
        <Text style={styles.sectionTitle}>Button variants and states</Text>
        {variants.map((variant) => (
          <View key={variant} style={styles.variantGroup}>
            <Text style={styles.variantTitle}>{variant}</Text>
            <View style={styles.buttonRow}>
              {statuses.map((status) => (
                <GlowButton
                  key={`${variant}-${status}`}
                  variant={variant}
                  size="sm"
                  label={status}
                  status={status}
                  haptic={false}
                />
              ))}
            </View>
          </View>
        ))}
        <GlowButton
          variant="primary"
          size="md"
          label="Disabled"
          disabled
          accessibilityLabel="Disabled button example"
          haptic={false}
        />
      </GlowCard>

      <GlowCard variant="settings" contentStyle={styles.cardContent}>
        <Text style={styles.sectionTitle}>Icon buttons</Text>
        <View style={styles.buttonRow}>
          <GlowIconButton
            icon={<ImageIcon color={theme.colors.primary} size={20} />}
            size={40}
            accessibilityLabel="Image"
            haptic={false}
          />
          <GlowIconButton
            icon={<Heart color={theme.colors.primary} size={21} />}
            size={48}
            accessibilityLabel="Like"
            haptic={false}
          />
          <GlowIconButton
            icon={<Bookmark color={theme.colors.primary} size={21} />}
            size={56}
            accessibilityLabel="Save"
            haptic={false}
          />
          <GlowIconButton
            icon={<Send color={theme.colors.primary} size={20} />}
            variant="danger"
            accessibilityLabel="Send"
            haptic={false}
          />
          <GlowIconButton
            icon={<Check color="#FFFFFF" size={20} />}
            status="success"
            accessibilityLabel="Success"
            haptic={false}
          />
        </View>
      </GlowCard>

      <GlowCard isNew variant="settings" contentStyle={styles.cardContent}>
        <Text style={styles.sectionTitle}>Glow card</Text>
        <Text style={styles.body}>New-card entrance and visibility effects.</Text>
      </GlowCard>

      <GlowCard variant="settings" contentStyle={styles.cardContent}>
        <Text style={styles.sectionTitle}>Text input</Text>
        <TextInput
          accessibilityLabel="Gallery text input"
          placeholder="Tap to test the focus glow"
          placeholderTextColor={theme.colors.textSecondary}
          value={input}
          onChangeText={setInput}
          style={styles.input}
        />
        <Text style={styles.body}>
          Shared app fields use the same dark glass and emerald focus treatment.
        </Text>
      </GlowCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  variantGroup: {
    gap: theme.spacing.sm,
  },
  variantTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card / 2,
    backgroundColor: 'rgba(11,18,16,0.84)',
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
  },
});
