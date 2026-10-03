import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme';

export interface StatBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  unit,
  icon,
  highlight = false,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: highlight ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text
          style={[styles.value, { color: colors.text }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[styles.unit, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {' '}{unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainer: {
    marginRight: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
  },
});
