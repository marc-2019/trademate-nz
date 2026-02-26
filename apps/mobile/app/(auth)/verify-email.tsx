/**
 * Email Verification Screen
 * 6-digit code entry after registration
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function VerifyEmailScreen() {
  const { user, verifyEmail, resendVerification, logout } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  function handleCodeChange(text: string, index: number) {
    const newCode = [...code];

    if (text.length > 1) {
      // Handle paste - spread digits across inputs
      const digits = text.replace(/\D/g, '').slice(0, 6);
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || '';
      }
      setCode(newCode);
      // Focus last filled input or next empty
      const lastFilled = Math.min(digits.length - 1, 5);
      inputRefs.current[lastFilled]?.focus();

      // Auto-submit if all 6 digits filled
      if (digits.length === 6) {
        handleVerify(newCode.join(''));
      }
      return;
    }

    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);

    // Auto-advance to next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (text && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(codeStr?: string) {
    const verificationCode = codeStr || code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(verificationCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      Alert.alert('Verification Failed', message);
      // Clear code on failure
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const newCode = await resendVerification();
      setCountdown(60);
      // In dev mode, show the code
      if (__DEV__ && newCode) {
        Alert.alert('Dev Mode', `New verification code: ${newCode}`);
      } else {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend code';
      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>BossBoard</Text>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.email}>{user?.email || 'your email'}</Text>
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading || code.join('').length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              <Text style={styles.resendLink}>
                {isResending ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out option */}
        <TouchableOpacity style={styles.signOutButton} onPress={logout}>
          <Text style={styles.signOutText}>Sign out and use a different email</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: '#374151',
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  codeInputFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  signOutButton: {
    marginTop: 16,
  },
  signOutText: {
    color: '#9CA3AF',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
