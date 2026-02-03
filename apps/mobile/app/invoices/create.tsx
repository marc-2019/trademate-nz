/**
 * Create Invoice Screen
 * Form for creating new invoices with line items
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoicesApi } from '../../src/services/api';

interface LineItem {
  id: string;
  description: string;
  amount: string;
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', amount: '' },
  ]);
  const [includeGst, setIncludeGst] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', amount: '' },
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  }

  function updateLineItem(id: string, field: 'description' | 'amount', value: string) {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    const dollars = parseFloat(cleaned) || 0;
    return Math.round(dollars * 100); // Convert to cents
  }

  function calculateSubtotal(): number {
    return lineItems.reduce((sum, item) => sum + parseAmount(item.amount), 0);
  }

  function calculateGst(): number {
    return includeGst ? Math.round(calculateSubtotal() * 0.15) : 0;
  }

  function calculateTotal(): number {
    return calculateSubtotal() + calculateGst();
  }

  function formatCurrency(cents: number): string {
    return '$' + (cents / 100).toLocaleString('en-NZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function handleSubmit() {
    // Validation
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => item.description.trim() && parseAmount(item.amount) > 0
    );

    if (validLineItems.length === 0) {
      Alert.alert('Error', 'Please add at least one line item with a description and amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await invoicesApi.create({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
        lineItems: validLineItems.map((item) => ({
          description: item.description.trim(),
          amount: parseAmount(item.amount),
        })),
        includeGst,
        dueDate: dueDate || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Invoice created successfully', [
          {
            text: 'View Invoice',
            onPress: () => router.replace(`/invoices/${response.data.data.invoice.id}`),
          },
          {
            text: 'Create Another',
            onPress: () => {
              // Reset form
              setClientName('');
              setClientEmail('');
              setClientPhone('');
              setJobDescription('');
              setLineItems([{ id: '1', description: '', amount: '' }]);
              setDueDate('');
              setNotes('');
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Client Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client or company name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="client@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="021 123 4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={jobDescription}
              onChangeText={setJobDescription}
              placeholder="Brief description of work performed"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>

          {lineItems.map((item, index) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemContent}>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={item.description}
                  onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                  placeholder="Description (e.g., Labour, Materials)"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.amountRow}>
                  <Text style={styles.currencyPrefix}>$</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={item.amount}
                    onChangeText={(text) => updateLineItem(item.id, 'amount', text)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                  {lineItems.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeLineItem(item.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
            <Ionicons name="add" size={20} color="#2563EB" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* GST Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Include GST (15%)</Text>
              <Text style={styles.toggleDescription}>
                NZ Goods and Services Tax
              </Text>
            </View>
            <Switch
              value={includeGst}
              onValueChange={setIncludeGst}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={includeGst ? '#2563EB' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateSubtotal())}</Text>
            </View>
            {includeGst && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST (15%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(calculateGst())}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(calculateTotal())}</Text>
            </View>
          </View>
        </View>

        {/* Bank Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholder="Your business name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              placeholder="00-0000-0000000-00"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD (e.g., 2026-03-01)"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes for the client"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  lineItem: {
    marginBottom: 12,
  },
  lineItemContent: {
    gap: 8,
  },
  descriptionInput: {
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    borderRadius: 10,
    gap: 8,
  },
  addItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 15,
    color: '#374151',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginBottom: 0,
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
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
