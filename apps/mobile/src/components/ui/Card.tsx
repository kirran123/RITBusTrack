import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'subtle' | 'outlined' | 'emergency';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  onPress,
  activeOpacity = 0.7,
}) => {
  const { colors, isDark } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return spacing.sm;
      case 'lg': return spacing.xl;
      case 'md':
      default: return spacing.lg;
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'subtle':
        return {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'emergency':
        return {
          backgroundColor: colors.emergencyBg,
          borderColor: colors.emergencyBorder,
          borderWidth: 1,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
    }
  };

  const containerStyle: StyleProp<ViewStyle> = [
    styles.card,
    getVariantStyles(),
    { padding: getPadding() },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
  },
});
