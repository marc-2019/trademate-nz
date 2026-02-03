/**
 * Home Screen
 * Dashboard with stats, quick actions, and recent documents
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { swmsApi, statsApi } from '../../src/services/api';

interface SWMSDocument {
  id: string;
  title: string;
  trade_type: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  swms: {
    total: number;
    thisMonth: number;
    signed: number;
    draft: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    unpaidAmount: number;
    thisMonth: number;
  };
  certifications: {
    total: number;
    expiringSoon: number;
    expired: number;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentDocs, setRecentDocs] = useState<SWMSDocument[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load recent docs and stats in parallel
      const [docsResponse, statsResponse] = await Promise.all([
        swmsApi.list({ limit: 3 }),
        statsApi.getDashboard().catch(() => null), // Don't fail if stats endpoint has issues
      ]);

      if (docsResponse.data.success) {
        setRecentDocs(docsResponse.data.data.documents || []);
      }

      if (statsResponse?.data?.success) {
        setStats(statsResponse.data.data.stats);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
    });
  }

  function formatCurrency(cents: number): string {
    return '$' + (cents / 100).toLocaleString('en-NZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'signed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#374151" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </Text>
          <Text style={styles.businessText}>
            {user?.businessName || 'Your Business'}
          </Text>
        </View>

        {/* Stats Overview */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/(tabs)/work')}
              >
                <Text style={styles.statValue}>{stats.swms.thisMonth}</Text>
                <Text style={styles.statLabel}>SWMS this month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/(tabs)/money')}
              >
                <Text style={[styles.statValue, stats.invoices.unpaid > 0 && styles.statValueWarning]}>
                  {stats.invoices.unpaid > 0
                    ? formatCurrency(stats.invoices.unpaidAmount)
                    : stats.invoices.thisMonth}
                </Text>
                <Text style={styles.statLabel}>
                  {stats.invoices.unpaid > 0 ? 'Unpaid invoices' : 'Invoices this month'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/(tabs)/people')}
              >
                <Text
                  style={[
                    styles.statValue,
                    (stats.certifications.expiringSoon > 0 || stats.certifications.expired > 0) &&
                      styles.statValueWarning,
                  ]}
                >
                  {stats.certifications.expiringSoon + stats.certifications.expired || stats.certifications.total}
                </Text>
                <Text style={styles.statLabel}>
                  {stats.certifications.expiringSoon > 0
                    ? 'Certs expiring'
                    : stats.certifications.expired > 0
                    ? 'Certs expired'
                    : 'Certifications'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/swms/generate')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="add-circle" size={28} color="#2563EB" />
            </View>
            <Text style={styles.actionLabel}>New SWMS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/invoices/create')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="receipt" size={28} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>New Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/certifications/add')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="ribbon" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>Add Cert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/work')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="folder-open" size={28} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Documents</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Documents */}
        <Text style={styles.sectionTitle}>Recent Documents</Text>
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => router.push(`/swms/${doc.id}`)}
            >
              <View style={styles.docInfo}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {doc.title}
                </Text>
                <Text style={styles.docMeta}>
                  {doc.trade_type} • {formatDate(doc.created_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(doc.status) + '20' },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: getStatusColor(doc.status) }]}
                >
                  {doc.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No documents yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/swms/generate')}
            >
              <Text style={styles.emptyButtonText}>Create Your First SWMS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  welcomeCard: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  businessText: {
    color: '#BFDBFE',
    fontSize: 14,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statValueWarning: {
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  docMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
