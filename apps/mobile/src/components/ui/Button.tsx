import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors, isDark } = useTheme();

  const getContainerStyles = (): ViewStyle => {
    let base: ViewStyle = {};

    switch (size) {
      case 'sm':
        base = {
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          minHeight: 34,
          borderRadius: borderRadius.sm,
        };
        break;
      case 'lg':
        base = {
          paddingVertical: spacing.lg - 2,
          paddingHorizontal: spacing.xxl,
          minHeight: 52,
          borderRadius: borderRadius.md,
        };
        break;
      case 'md':
      default:
        base = {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          minHeight: 46,
          borderRadius: borderRadius.md,
        };
        break;
    }

    switch (variant) {
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1.5,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: colors.emergency,
          borderColor: colors.emergency,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'primary':
      default:
        return {
          ...base,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          borderWidth: 1,
        };
    }
  };

  const getLabelColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.text;
      case 'primary':
      default:
        return colors.primaryContrast;
    }
  };

  const labelFontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getContainerStyles(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getLabelColor()}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { color: getLabelColor(), fontSize: labelFontSize },
              variant === 'primary' && styles.labelBold,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  labelBold: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});
