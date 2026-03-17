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

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.error || error.message || 'Check your credentials and try again.');
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
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="record-voice-over" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your coaching</Text>
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
                  placeholder="••••••••"
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupText}>Sign Up</Text>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  signupText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
});

export default LoginScreen;
