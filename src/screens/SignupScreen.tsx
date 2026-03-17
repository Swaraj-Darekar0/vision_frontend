import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/authStore';

type SignupNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupNavigationProp>();
  const { signup } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
    } catch (error: any) {
      Alert.alert('Signup Failed', error?.response?.data?.error || error.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your journey to public speaking mastery</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color={colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.signupButton, loading && styles.signupButtonDisabled]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  termsContainer: {
    marginBottom: spacing.xl,
  },
  termsText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  signupButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  loginText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
});

export default SignupScreen;
