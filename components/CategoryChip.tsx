import { Tag } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export interface CategoryChipProps {
  label: string;
}

export default function CategoryChip({ label }: CategoryChipProps) {
  return (
    <View style={styles.chip}>
      <Tag color={theme.colors.primary} size={14} strokeWidth={2} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryDeep,
  },
  label: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
