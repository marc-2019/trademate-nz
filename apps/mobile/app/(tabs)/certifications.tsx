/**
 * Certifications Screen
 * Track trade licenses and certifications
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  expiryDate: string;
  status: 'valid' | 'expiring' | 'expired';
}

// Placeholder data - will be replaced with API calls
const DEMO_CERTS: Certification[] = [
  {
    id: '1',
    name: 'Electrical Registration',
    issuer: 'Electrical Workers Registration Board',
    expiryDate: '2026-08-15',
    status: 'valid',
  },
  {
    id: '2',
    name: 'First Aid Certificate',
    issuer: 'St John',
    expiryDate: '2026-03-01',
    status: 'expiring',
  },
];

export default function CertificationsScreen() {
  const [certifications] = useState<Certification[]>(DEMO_CERTS);

  function getStatusColor(status: string): string {
    switch (status) {
      case 'valid':
        return '#10B981';
      case 'expiring':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function getDaysUntilExpiry(dateString: string): number {
    const expiry = new Date(dateString);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function renderCertification({ item }: { item: Certification }) {
    const daysLeft = getDaysUntilExpiry(item.expiryDate);

    return (
      <View style={styles.certCard}>
        <View style={styles.certHeader}>
          <View style={styles.certIcon}>
            <Ionicons name="ribbon" size={24} color="#2563EB" />
          </View>
          <View style={styles.certInfo}>
            <Text style={styles.certName}>{item.name}</Text>
            <Text style={styles.certIssuer}>{item.issuer}</Text>
          </View>
        </View>

        <View style={styles.expiryRow}>
          <View style={styles.expiryInfo}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.expiryText}>
              Expires: {formatDate(item.expiryDate)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={certifications}
        keyExtractor={(item) => item.id}
        renderItem={renderCertification}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text style={styles.infoText}>
              Track your trade licenses and certifications. Get notified before
              they expire.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No certifications added</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 14,
    lineHeight: 20,
  },
  certCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  certHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  certIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  certInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  certName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  certIssuer: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
