import React, { useEffect, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  useWindowDimensions,
  Keyboard,
  EmitterSubscription,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/authStore';
import { useGradient } from '../context/GradientContext';
import { useGradientTransition } from '../hooks/useGradientTransition';
import { AUTH_WALLPAPER_IMAGE } from '../constants/gradients';

type SignupNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupNavigationProp>();
  const { signup } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const { setImageUri } = useGradient();
  const { ensureAuthState, handleSignIn, isTransitioning } = useGradientTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const horizontalInset = Math.max(18, Math.min(26, width * 0.055));
  const titleTop = Math.max(insets.top + 36, height * 0.15);
  const formBottom = Math.max(insets.bottom + 18, 24);
  const formTranslateY = React.useRef(new Animated.Value(0)).current;
  const keyboardLiftExtra = 48;

  useEffect(() => {
    setImageUri(AUTH_WALLPAPER_IMAGE);
    ensureAuthState();
  }, [ensureAuthState, setImageUri]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    let showSubscription: EmitterSubscription;
    let hideSubscription: EmitterSubscription;

    showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      Animated.timing(formTranslateY, {
        toValue: -Math.max(0, event.endCoordinates.height - insets.bottom - 18 + keyboardLiftExtra),
        duration: Platform.OS === 'ios' ? event.duration ?? 280 : 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event.duration ?? 360 : 320,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start(() => {
        setKeyboardVisible(false);
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [formTranslateY, insets.bottom, keyboardLiftExtra]);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      handleSignIn(navigation);
    } catch (error: any) {
      Alert.alert(
        'Signup Failed',
        error?.response?.data?.error || error.message || 'An error occurred during signup.',
      );
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0, 0, 0, 0.88)', 'rgba(0, 0, 0, 0.64)', 'rgba(0, 0, 0, 0.28)', 'rgba(0, 0, 0, 0.08)']}
          locations={[0, 0.4, 0.76, 1]}
          style={styles.screenGradient}
        />

        <View style={[styles.heroCopy, { top: titleTop }]}>
          <Text style={styles.heroTitle}>vision </Text>
          <View style={styles.heroDot} />
        </View>

        <Animated.View
          style={[
            styles.formShell,
            {
              left: horizontalInset,
              right: horizontalInset,
              bottom: formBottom,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          <View style={styles.formBackdrop}>
            <View style={styles.stack}>
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Email</Text>
                <View
                  style={[
                    styles.rowInput,
                    focusedField === 'email' && styles.rowInputFocused,
                  ]}
                >
                  <MaterialIcons
                    name="email"
                    size={18}
                    color={colors.textSecondary}
                    style={styles.leadingIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255,255,255,0.36)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.rowInput,
                    focusedField === 'password' && styles.rowInputFocused,
                  ]}
                >
                  <MaterialIcons
                    name="lock"
                    size={18}
                    color={colors.textSecondary}
                    style={styles.leadingIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="rgba(255,255,255,0.36)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((value) => !value)}
                    style={styles.trailingIcon}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.termsText}>
                By continuing, you agree to our <Text style={styles.termsLink}>Terms</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, (loading || isTransitioning) && styles.primaryButtonDisabled]}
                onPress={handleSignup}
                disabled={loading || isTransitioning}
              >
                {loading ? (
                  <ActivityIndicator color="#050505" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}> Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
  },
  screenGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#F7F8FA',
    fontSize: 28,
    fontFamily: fonts.extraBold,
    letterSpacing: -0.8,
  },
  heroDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DCE9FF',
    marginLeft: 2,
    transform: [{ translateY: 1 }],
  },
  formShell: {
    position: 'absolute',
  },
  formBackdrop: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  stack: {
    gap: spacing.xs,
  },
  inputBlock: {
    gap: 5,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rowInput: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
   backgroundColor: 'rgba(16, 16, 16, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm + 2,
  },
  rowInputFocused: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  leadingIcon: {
    marginRight: spacing.sm - 2,
  },
  trailingIcon: {
    paddingLeft: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  termsText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    lineHeight: 17,
    paddingTop: 2,
  },
  termsLink: {
    color: '#FFFFFF',
    fontFamily: fonts.medium,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#050505',
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  footerText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
  },
  footerLink: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
  },
});

export default SignupScreen;
