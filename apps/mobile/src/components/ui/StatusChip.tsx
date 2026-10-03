import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme';

export type StatusVariant =
  | 'default'
  | 'active'
  | 'passed'
  | 'ontime'
  | 'delayed'
  | 'emergency'
  | 'warning'
  | 'neutral';

export interface StatusChipProps {
  label: string;
  variant?: StatusVariant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  dot?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'default',
  icon,
  style,
  textStyle,
  dot = false,
}) => {
  const { colors, isDark } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'emergency':
      case 'delayed':
        return {
          bg: colors.emergencyBg,
          border: colors.emergencyBorder,
          text: colors.emergency,
          dotColor: colors.emergency,
        };
      case 'ontime':
      case 'active':
        return {
          bg: isDark ? '#142519' : '#EDFDF2',
          border: isDark ? '#1C4026' : '#BBF7D0',
          text: colors.success,
          dotColor: colors.success,
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          border: colors.warning,
          text: colors.warning,
          dotColor: colors.warning,
        };
      case 'passed':
        return {
          bg: colors.surfaceSubtle,
          border: colors.borderSubtle,
          text: colors.textSecondary,
          dotColor: colors.textSecondary,
        };
      case 'neutral':
      case 'default':
      default:
        return {
          bg: colors.surfaceSubtle,
          border: colors.border,
          text: colors.text,
          dotColor: colors.textSecondary,
        };
    }
  };

  const { bg, border, text, dotColor } = getColors();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      )}
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs + 2,
  },
  iconContainer: {
    marginRight: spacing.xs + 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
