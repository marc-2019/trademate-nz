/**
 * Invoice Detail Screen
 * View invoice details with actions to send, mark paid, edit, delete
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoicesApi } from '../../src/services/api';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  job_description: string | null;
  line_items: { id: string; description: string; amount: number }[];
  subtotal: number;
  gst_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string | null;
  paid_at: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  notes: string | null;
  created_at: string;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    try {
      const response = await invoicesApi.get(id);
      if (response.data.success) {
        setInvoice(response.data.data.invoice);
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(cents: number): string {
    return '$' + (cents / 100).toLocaleString('en-NZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'sent':
        return '#2563EB';
      case 'overdue':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'sent':
        return 'Sent';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Draft';
    }
  }

  async function handleMarkAsSent() {
    Alert.alert(
      'Send Invoice',
      'Mark this invoice as sent to the client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sent',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const response = await invoicesApi.markAsSent(id);
              if (response.data.success) {
                setInvoice(response.data.data.invoice);
                Alert.alert('Success', 'Invoice marked as sent');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update invoice');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }

  async function handleMarkAsPaid() {
    Alert.alert(
      'Mark as Paid',
      'Confirm this invoice has been paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const response = await invoicesApi.markAsPaid(id);
              if (response.data.success) {
                setInvoice(response.data.data.invoice);
                Alert.alert('Success', 'Invoice marked as paid');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update invoice');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const response = await invoicesApi.delete(id);
              if (response.data.success) {
                Alert.alert('Success', 'Invoice deleted');
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete invoice');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }

  async function handleShare() {
    if (!invoice) return;

    const lineItemsText = invoice.line_items
      .map((item) => `  - ${item.description}: ${formatCurrency(item.amount)}`)
      .join('\n');

    const message = `
Invoice ${invoice.invoice_number}

Client: ${invoice.client_name}
${invoice.job_description ? `Job: ${invoice.job_description}` : ''}

Items:
${lineItemsText}

Subtotal: ${formatCurrency(invoice.subtotal)}
${invoice.gst_amount > 0 ? `GST (15%): ${formatCurrency(invoice.gst_amount)}` : ''}
Total: ${formatCurrency(invoice.total)}

${invoice.due_date ? `Due: ${formatDate(invoice.due_date)}` : ''}
${invoice.bank_account_name ? `\nPay to: ${invoice.bank_account_name}` : ''}
${invoice.bank_account_number ? `Account: ${invoice.bank_account_number}` : ''}
    `.trim();

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Invoice not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(invoice.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
              {getStatusLabel(invoice.status)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Client Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Client</Text>
        <Text style={styles.clientName}>{invoice.client_name}</Text>
        {invoice.client_email && (
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" />
            <Text style={styles.contactText}>{invoice.client_email}</Text>
          </View>
        )}
        {invoice.client_phone && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.contactText}>{invoice.client_phone}</Text>
          </View>
        )}
      </View>

      {/* Job Description */}
      {invoice.job_description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Description</Text>
          <Text style={styles.jobDescription}>{invoice.job_description}</Text>
        </View>
      )}

      {/* Line Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {invoice.line_items.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <Text style={styles.lineItemDescription}>{item.description}</Text>
            <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
        </View>

        {invoice.gst_amount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (15%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.gst_amount)}</Text>
          </View>
        )}

        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Due Date</Text>
          <Text style={styles.paymentValue}>{formatDate(invoice.due_date)}</Text>
        </View>
        {invoice.bank_account_name && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Account Name</Text>
            <Text style={styles.paymentValue}>{invoice.bank_account_name}</Text>
          </View>
        )}
        {invoice.bank_account_number && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Account Number</Text>
            <Text style={styles.paymentValue}>{invoice.bank_account_number}</Text>
          </View>
        )}
        {invoice.paid_at && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Paid On</Text>
            <Text style={[styles.paymentValue, { color: '#10B981' }]}>
              {formatDate(invoice.paid_at)}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <Text style={styles.notes}>{invoice.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {invoice.status === 'draft' && (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleMarkAsSent}
              disabled={isProcessing}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Mark as Sent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/invoices/edit/${id}`)}
              disabled={isProcessing}
            >
              <Ionicons name="create-outline" size={20} color="#2563EB" />
              <Text style={styles.secondaryButtonText}>Edit Invoice</Text>
            </TouchableOpacity>
          </>
        )}

        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
            onPress={handleMarkAsPaid}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isProcessing}
        >
          <Text style={styles.deleteButtonText}>Delete Invoice</Text>
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 12,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    padding: 8,
  },
  card: {
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactText: {
    fontSize: 15,
    color: '#374151',
  },
  jobDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lineItemDescription: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  divider: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 15,
    color: '#374151',
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  notes: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: 12,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    padding: 12,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '500',
  },
});
