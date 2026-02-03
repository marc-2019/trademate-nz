/**
 * Settings Screen
 * User profile and app settings (moved from profile tab)
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  color?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        { id: 'profile', icon: 'person-outline', label: 'Edit Profile', showChevron: true },
        { id: 'business', icon: 'business-outline', label: 'Business Details', showChevron: true },
        { id: 'bank', icon: 'card-outline', label: 'Bank Details', showChevron: true },
        { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', showChevron: true },
      ],
    },
    {
      title: 'Data',
      items: [
        { id: 'export', icon: 'download-outline', label: 'Export Data', showChevron: true },
        { id: 'sync', icon: 'sync-outline', label: 'Sync Status', showChevron: true },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: 'help-circle-outline', label: 'Help Centre', showChevron: true },
        { id: 'feedback', icon: 'chatbubble-outline', label: 'Send Feedback', showChevron: true },
        { id: 'about', icon: 'information-circle-outline', label: 'About TradeMate', showChevron: true },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'logout',
          icon: 'log-out-outline',
          label: 'Sign Out',
          color: '#EF4444',
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name[0].toUpperCase() : user?.email[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {user?.businessName && (
            <Text style={styles.profileBusiness}>{user.businessName}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Trade Badge */}
      {user?.tradeType && (
        <View style={styles.tradeBadge}>
          <Ionicons name="construct" size={16} color="#2563EB" />
          <Text style={styles.tradeText}>
            {user.tradeType.charAt(0).toUpperCase() + user.tradeType.slice(1)}
          </Text>
        </View>
      )}

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <View key={section.title || 'last'} style={styles.section}>
          {section.title ? (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          ) : null}
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.color || '#374151'}
                />
                <Text
                  style={[styles.menuLabel, item.color && { color: item.color }]}
                >
                  {item.label}
                </Text>
                {item.showChevron && (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>TradeMate NZ v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  profileBusiness: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  tradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 24,
  },
  tradeText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
});
