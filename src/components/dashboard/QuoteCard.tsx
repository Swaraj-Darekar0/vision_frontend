import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../ui/Card';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { useStreakStore } from '../../store/streakStore';
import { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUOTES = [
  { text: "Anyone who don't agree with everything I say is wrong", name: "Kanye West" },
  { text: "Shut the f*ck up and enjoy the greatness", name: "Kanye West" },
  { text: "I no longer have a manager. I can't be managed.", name: "Kanye West" },
  { text: "I am the greatest, I said that even before I knew I was.", name: "Muhammad Ali" },
  { text: "If you even dream of beating me you'd better wake up and apologize.", name: "Muhammad Ali" },
  { text: "It's hard to be humble, when you're as great as I am.", name: "Muhammad Ali" },
  { text: "We're not here to take part; we're here to take over.", name: "Conor McGregor" },
  { text: "I am in a league of my own here, ahead of everyone in the game by a country mile.", name: "Conor McGregor" },
  { text: "They don't want us to win, so we're going to win.", name: "DJ Khaled" },
  { text: "Don't ever play yourself.", name: "DJ Khaled" },
  { text: "I'm not perfect, but I'm a limited edition.", name: "DJ Khaled" },
  { text: "I'm the biggest boss that you've seen thus far.", name: "Rick Ross" },
  { text: "Every boss started as a worker.", name: "Rick Ross" },
  { text: "A World Cup without me is not worth watching.", name: "Zlatan Ibrahimović" },
  { text: "People call it arrogant i call it confidence.", name: "Zlatan Ibrahimović" },
  { text: "I am a black diamond, unfaceted.", name: "Karl Lagerfeld" },
  { text: "I have no wish to be normal.", name: "Karl Lagerfeld" },
  { text: "Personality begins where comparison ends.", name: "Karl Lagerfeld" },
  { text: "If you look good, you feel good. If you feel good, you play good. If you play good, they pay good.", name: "Deion Sanders" },
  { text: "Innovation distinguishes between a leader and a follower.", name: "Steve Jobs" },
  { text: "You must expect great things of yourself before you can do them.", name: "Michael Jordan" },
  { text: "My unmatched perspicacity coupled with my sheer indefatigability makes me a feared opponent in any realm of human endeavor.", name: "Andrew Tate" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", name: "Steve Jobs" }
];

export const QuoteCard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { hasCompletedTodaySession } = useStreakStore();

  const quote = useMemo(() => {
    // Rotation logic: same quote for the entire day (local time)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % QUOTES.length;
    return QUOTES[index];
  }, []);

  const handle = `@${quote.name.replace(/\s+/g, '').toLowerCase()}`;

  const cardContent = (
    <View style={!hasCompletedTodaySession && styles.lockedContainer}>
      <View style={[styles.mainContent ]}>
        <View style={styles.tweetHeader}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={24} color={colors.textSecondary} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{quote.name}</Text>
              <MaterialIcons name="verified" size={14} color={colors.primary} style={styles.verifiedIcon} />
              <Text style={styles.handle} numberOfLines={1}>{handle} • 1d</Text>
            </View>
            <MaterialIcons name="more-horiz" size={18} color={colors.textMuted} />
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.quoteText}>{quote.text}</Text>
        </View>

        {/* <View style={styles.actions}>
          <View style={styles.actionItem}>
            <MaterialIcons name="chat-bubble-outline" size={16} color={colors.textMuted} />
            <Text style={styles.actionCount}>12</Text>
          </View>
          <View style={styles.actionItem}>
            <MaterialIcons name="repeat" size={16} color={colors.textMuted} />
            <Text style={styles.actionCount}>45</Text>
          </View>
          <View style={styles.actionItem}>
            <MaterialIcons name="favorite-border" size={16} color={colors.textMuted} />
            <Text style={styles.actionCount}>128</Text>
          </View>
          <View style={styles.actionItem}>
            <MaterialIcons name="share" size={16} color={colors.textMuted} />
          </View>
        </View> */}
      </View>

      {/* {!hasCompletedTodaySession && (
        <View style={styles.lockOverlay}>
          <MaterialIcons name="play-circle-outline" size={48} color={colors.primary} />
          <Text style={styles.lockText}>Complete today's session to unlock</Text>
        </View>
      )} */}
    </View>
  );

  if (!hasCompletedTodaySession) {
    return (
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate('Recording', { topicTitle: 'Daily Practice' })}
      >
        <Card style={styles.container}>{cardContent}</Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.container}>{cardContent}</Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  lockedContainer: {
    position: 'relative',
  },
  mainContent: {
    width: '100%',
  },
  blurredContent: {
    opacity: 0.15,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockText: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  tweetHeader: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  verifiedIcon: {
    marginLeft: 2,
    marginRight: 4,
  },
  handle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    flex: 1,
  },
  content: {
    paddingLeft: 48, // Aligned with header text
    marginBottom: spacing.md,
  },
  quoteText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 48,
    paddingRight: spacing.xl,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: 4,
    fontFamily: fonts.regular,
  },
});
