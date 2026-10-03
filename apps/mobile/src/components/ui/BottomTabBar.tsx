import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from 'lucide-react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  isEmergency?: boolean;
}

export interface BottomTabBarProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
}

export function BottomTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: BottomTabBarProps<T>) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          const activeColor = tab.isEmergency
            ? colors.emergency
            : isDark
            ? '#FFFFFF'
            : '#000000';

          const inactiveColor = tab.isEmergency
            ? colors.emergency
            : colors.textSecondary;

          const iconColor = isActive ? activeColor : inactiveColor;
          const textColor = isActive ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              {isActive && (
                <View
                  style={[
                    styles.activeBar,
                    {
                      backgroundColor: tab.isEmergency ? colors.emergency : colors.primary,
                    },
                  ]}
                />
              )}

              <View style={styles.iconWrap}>
                <Icon
                  size={20}
                  color={iconColor}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {tab.badge !== undefined && tab.badge !== 0 ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: tab.isEmergency
                          ? colors.emergency
                          : colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: tab.isEmergency
                            ? '#FFFFFF'
                            : colors.primaryContrast,
                        },
                      ]}
                    >
                      {typeof tab.badge === 'number' && tab.badge > 99
                        ? '99+'
                        : tab.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  { color: textColor },
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    paddingTop: 4,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '24%',
    right: '24%',
    height: 2.5,
    borderRadius: borderRadius.full,
  },
  iconWrap: {
    position: 'relative',
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
