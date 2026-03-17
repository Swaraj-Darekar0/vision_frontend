import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

interface NameInputModalProps {
  visible: boolean;
  onSubmit: (name: string) => Promise<void>;
}

export const NameInputModal: React.FC<NameInputModalProps> = ({ visible, onSubmit }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your display name');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Please enter your display name to continue.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.negative,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});
