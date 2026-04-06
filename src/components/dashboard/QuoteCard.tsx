import React, { useMemo } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fonts, fontSize, radius, spacing } from '../../theme';
import { useStreakStore } from '../../store/streakStore';
import { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUOTE_BACKGROUND = require('../../../assets/images/quotebg2.png');

const QUOTES = [
  "Anyone who don't agree with everything I say is wrong",
  'Shut the f*ck up and enjoy the greatness',
  "I no longer have a manager. I can't be managed.",
  'I am the greatest, I said that even before I knew I was.',
  "If you even dream of beating me you'd better wake up and apologize.",
  "It's hard to be humble, when you're as great as I am.",
  "We're not here to take part; we're here to take over.",
  'I am in a league of my own here, ahead of everyone in the game by a country mile.',
  "They don't want us to win, so we're going to win.",
  "Don't ever play yourself.",
  "I'm not perfect, but I'm a limited edition.",
  "I'm the biggest boss that you've seen thus far.",
  'Every boss started as a worker.',
  'A World Cup without me is not worth watching.',
  'People call it arrogant i call it confidence.',
  'I am a black diamond, unfaceted.',
  'I have no wish to be normal.',
  'Personality begins where comparison ends.',
  'If you look good, you feel good. If you feel good, you play good. If you play good, they pay good.',
  'Innovation distinguishes between a leader and a follower.',
  'You must expect great things of yourself before you can do them.',
  'My unmatched perspicacity coupled with my sheer indefatigability makes me a feared opponent in any realm of human endeavor.',
  'The people who are crazy enough to think they can change the world are the ones who do.',
] as const;

export const QuoteCard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { hasCompletedTodaySession } = useStreakStore();

  const quote = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  const card = (
    <ImageBackground
      source={QUOTE_BACKGROUND}
      resizeMode="cover"
      imageStyle={styles.image}
      style={styles.container}
    >
      <View style={styles.overlay}>
        <Text style={styles.quoteText}>"{quote}"</Text>
      </View>
    </ImageBackground>
  );

  // if (!hasCompletedTodaySession) {
  //   return (
  //     <TouchableOpacity
  //       activeOpacity={0.92}
  //       onPress={() => navigation.navigate('Recording', { topicTitle: 'Daily Practice' })}
  //     >
  //       {card}
  //     </TouchableOpacity>
  //   );
  // }

  return card;
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    minHeight: 112,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  image: {
    borderRadius: radius.xl,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  quoteText: {
    color: '#ece0c8',
    fontSize: 21,
    lineHeight: 23,
    fontFamily: fonts.bold,
    textAlign: 'center',
    maxWidth: '82%',
  },
});
