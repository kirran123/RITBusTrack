import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  roleBadge?: string;
  isLive?: boolean;
  onNotificationPress?: () => void;
  unreadCount?: number;
  rightAction?: ReactNode;
  showThemeToggle?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  roleBadge,
  isLive = true,
  onNotificationPress,
  unreadCount = 0,
  rightAction,
  showThemeToggle = true,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 10 : 8) + 6,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {isLive ? (
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.textSecondary }]}>
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          {roleBadge || subtitle ? (
            <View style={styles.subtitleRow}>
              {roleBadge ? (
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.roleBadgeText, { color: colors.textSecondary }]}>
                    {roleBadge.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              {subtitle ? (
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.actionsArea}>
          {showThemeToggle && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Theme"
            >
              {isDark ? (
                <Sun size={17} color={colors.text} />
              ) : (
                <Moon size={17} color={colors.text} />
              )}
            </TouchableOpacity>
          )}

          {onNotificationPress && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              onPress={onNotificationPress}
              activeOpacity={0.7}
              accessibilityLabel="Notifications"
            >
              <Bell size={17} color={colors.text} />
              {unreadCount > 0 ? (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.emergency },
                  ]}
                >
                  <Text style={styles.unreadCountText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}

          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    flexShrink: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    marginRight: spacing.xs + 2,
    flexShrink: 0,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
  actionsArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
