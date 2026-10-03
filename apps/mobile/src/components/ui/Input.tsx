import React, { useState, ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error
              ? colors.emergency
              : isFocused
              ? colors.primary
              : colors.border,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.textInput,
            { color: colors.text },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightIcon ? (
          onRightIconPress ? (
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              activeOpacity={0.7}
            >
              {rightIcon}
            </TouchableOpacity>
          ) : (
            <View style={styles.rightIconContainer}>{rightIcon}</View>
          )
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.emergency }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.sm + 2,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  leftIconContainer: {
    marginRight: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    marginLeft: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: spacing.sm + 2,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
