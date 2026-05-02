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
  // 100 quotes converted to second-person tone
  ["You don't chase dreams, you hunt goals.", "Unknown"],
  ["Pressure is your privilege.", "Billie Jean King"],
  ["You were built for this.", "Unknown"],
  ["No one can outwork you.", "Unknown"],
  ["You don't compete, you dominate.", "Unknown"],
  ["Winners focus on winning. You don't waste time watching others.", "Unknown"],
  ["You are the standard.", "Unknown"],
  ["You make it look easy because you work when nobody's watching.", "Unknown"],
  ["Your respect is earned, not given.", "Unknown"],
  ["You don't wait for opportunity, you create it.", "Unknown"],
  ["You either level up or stay average.", "Unknown"],
  ["You're not lucky, you're relentless.", "Unknown"],
  ["Greatness is your baseline.", "Unknown"],
  ["If you're in the room, you're the threat.", "Unknown"],
  ["You're built different.", "Unknown"],
  ["Excuses don't build your empire.", "Unknown"],
  ["You don't fold under pressure, you apply it.", "Unknown"],
  ["You're not here to fit in, you're here to stand out.", "Unknown"],
  ["The grind never lies to you.", "Unknown"],
  ["You turn setbacks into comebacks.", "Unknown"],
  ["You're too focused to be distracted.", "Unknown"],
  ["Your results speak louder than opinions.", "Unknown"],
  ["You don't need approval to be unstoppable.", "Unknown"],
  ["You break limits, you don't respect them.", "Unknown"],
  ["Fear doesn't live in you.", "Unknown"],
  ["You move different because you think different.", "Unknown"],
  ["Success is your only option.", "Unknown"],
  ["You came, you saw, you conquered.", "Julius Caesar"],
  ["You don't follow waves, you make them.", "Unknown"],
  ["Your silence is strategy, your success is noise.", "Unknown"],
  ["You don't dream small.", "Unknown"],
  ["Average is not in your vocabulary.", "Unknown"],
  ["You demand more from yourself than anyone else ever could.", "Unknown"],
  ["You're not done until you win.", "Unknown"],
  ["Every move you make is calculated.", "Unknown"],
  ["You thrive where others break.", "Unknown"],
  ["You don't stop, you evolve.", "Unknown"],
  ["You are the storm.", "Unknown"],
  ["You don't talk, you execute.", "Unknown"],
  ["Your mindset is your weapon.", "Unknown"],
  ["If it's easy, it's not worth it to you.", "Unknown"],
  ["You don't lose focus.", "Unknown"],
  ["Winning is your habit.", "Unknown"],
  ["You build, you don't beg.", "Unknown"],
  ["Your ambition scares people.", "Unknown"],
  ["You don't do average days.", "Unknown"],
  ["You push past limits daily.", "Unknown"],
  ["You were never meant to be ordinary.", "Unknown"],
  ["You don't need luck, you have discipline.", "Unknown"],
  ["You stay dangerous.", "Unknown"],
  ["Every day is your proving ground.", "Unknown"],
  ["You don't hesitate, you dominate.", "Unknown"],
  ["The mission is bigger than your mood.", "Unknown"],
  ["You show up when it matters.", "Unknown"],
  ["You turn pressure into power.", "Unknown"],
  ["You don't chase validation.", "Unknown"],
  ["You earn your spot every day.", "Unknown"],
  ["You're built for war, not comfort.", "Unknown"],
  ["You don't crack, you adapt.", "Unknown"],
  ["The crown is yours to take.", "Unknown"],
  ["You refuse to be outworked.", "Unknown"],
  ["You sharpen yourself daily.", "Unknown"],
  ["You don't back down.", "Unknown"],
  ["Your focus is deadly.", "Unknown"],
  ["You don't need motivation, you have discipline.", "Unknown"],
  ["You came to win, not to participate.", "Unknown"],
  ["You're always one step ahead.", "Unknown"],
  ["You turn dreams into plans.", "Unknown"],
  ["You don't fear competition.", "Unknown"],
  ["You are your biggest competition.", "Unknown"],
  ["You don't settle, you level up.", "Unknown"],
  ["You stay ready so you don't have to get ready.", "Unknown"],
  ["You don't play safe.", "Unknown"],
  ["Your grind is unmatched.", "Unknown"],
  ["You don't miss opportunities.", "Unknown"],
  ["You make pressure your ally.", "Unknown"],
  ["You don't wait for perfect timing.", "Unknown"],
  ["You create momentum.", "Unknown"],
  ["You don't follow paths, you create them.", "Unknown"],
  ["You rise every single time.", "Unknown"],
  ["You don't stop at good, you aim for great.", "Unknown"],
  ["You build legacies, not moments.", "Unknown"],
  ["You don't doubt, you execute.", "Unknown"],
  ["You trust your process.", "Unknown"],
  ["You outgrow limits.", "Unknown"],
  ["You don't look back.", "Unknown"],
  ["You bring intensity every day.", "Unknown"],
  ["You don't just compete, you separate.", "Unknown"],
  ["You make winning look normal.", "Unknown"],
  ["You don't get comfortable.", "Unknown"],
  ["You upgrade your mindset constantly.", "Unknown"],
  ["You don't waste potential.", "Unknown"],
  ["You dominate your domain.", "Unknown"],
  ["You don't need hype, you deliver.", "Unknown"],
  ["You stay ten steps ahead.", "Unknown"],
  ["You don't slow down.", "Unknown"],
  ["You make history, not excuses.", "Unknown"],
  ["You don't wait your turn, you take it.", "Unknown"],
  ["You turn effort into excellence.", "Unknown"],
  ["You don't fold, you rise.", "Unknown"],
  ["You came to leave a mark.", "Unknown"],
  ["Anyone who doesn't agree with everything you say is wrong.", "Mike Tyson"],
  ["Shut the f*ck up and enjoy the greatness around you.", "Conor McGregor"],
  ["You no longer have a manager. You can't be managed.", "Kanye West"],
  ["You are the greatest—you said that even before you knew it.", "Muhammad Ali"],
  ["If someone even dreams of beating you, they’d better wake up and apologize.", "Muhammad Ali"],
  ["It's hard for you to be humble when you're this great.", "Muhammad Ali"],
  ["You're not here to take part; you're here to take over.", "Conor McGregor"],
  ["You are in a league of your own, ahead of everyone in the game by a country mile.", "Conor McGregor"],
  ["They don't want you to win, so you're going to win.", "Jay-Z"],
  ["Don't ever play yourself.", "DJ Khaled"],
  ["You're not perfect, but you're a limited edition.", "Unknown"],
  ["You're the biggest boss they've seen thus far.", "Rick Ross"],
  ["Every boss started as a worker—you did too.", "Unknown"],
  ["A World Cup without you is not worth watching.", "Ronaldo (R9)"],
  ["People call it arrogant—you call it confidence.", "Cristiano Ronaldo"],
  ["You are a black diamond, unfaceted.", "Kanye West"],
  ["You have no wish to be normal.", "Kanye West"],
  ["Your personality begins where comparison ends.", "Karl Lagerfeld"],
  ["If you look good, you feel good. If you feel good, you play good. If you play good, they pay good.", "Deion Sanders"],
  ["Innovation distinguishes you as a leader, not a follower.", "Steve Jobs"],
  ["You must expect great things of yourself before you can do them.", "Michael Jordan"],
  ["Your unmatched perspicacity coupled with your sheer indefatigability makes you a feared opponent in any realm of human endeavor.", "Andrew Tate"],
  ["You are crazy enough to think you can change the world—and that's why you do.", "Steve Jobs"],

  // Converted 50 quotes
  ["You decide to be successful rather than lucky.", "Unknown"],
  ["You don't stop when you're tired; you stop when you're done.", "David Goggins"],
  ["Make yourself a lion and everyone else becomes prey to you.", "Andrew Tate"],
  ["The top is not crowded; most people quit before you get there.", "Unknown"],
  ["You never lose. Either you win or you learn.", "Nelson Mandela"],
  ["Some people want it to happen, some wish it would happen—you make it happen.", "Michael Jordan"],
  ["You've failed over and over again in your life—and that is why you succeed.", "Michael Jordan"],
  ["Champions aren't made in gyms. You're made from something deep inside you.", "Muhammad Ali"],
  ["Float like a butterfly, sting like a bee—your style defines you.", "Muhammad Ali"],
  ["Impossible is just your opinion to reject.", "Paulo Coelho"],
  ["Your pain is temporary, your glory is forever.", "Unknown"],
  ["You'd rather be hated for who you are than loved for who you're not.", "Kurt Cobain"],
  ["The louder they doubt you, the louder you win.", "Unknown"],
  ["Obsessed is what the lazy call your dedication.", "Unknown"],
  ["Wake up with determination, go to bed with satisfaction—you earned it.", "Unknown"],
  ["Success isn't given to you. You earn it.", "Unknown"],
  ["You're not the next Usain Bolt—you're the first you.", "Yohan Blake"],
  ["You've got a dream worth more than your sleep.", "Unknown"],
  ["Your only limit is your mind.", "Unknown"],
  ["They see your glory but not your story.", "Unknown"],
  ["Hard work beats talent when talent doesn't work as hard as you.", "Tim Notke"],
  ["You didn't come this far to only come this far.", "Unknown"],
  ["The only way for you to do great work is to love what you do.", "Steve Jobs"],
  ["Stay hungry, stay foolish—you grow that way.", "Steve Jobs"],
  ["Be so good they can't ignore you.", "Steve Martin"],
  ["Either you run the day, or the day runs you.", "Jim Rohn"],
  ["Your best revenge is massive success.", "Frank Sinatra"],
  ["You think, therefore you are dangerous.", "Unknown"],
  ["Don't let anyone tell you the sky is the limit when there are footprints on the moon.", "Paul Brandt"],
  ["Work until your idols become your rivals.", "Drake"],
  ["You started from the bottom, now you're here.", "Drake"],
  ["Legends like you don't retire; you reload.", "Jay-Z"],
  ["Live fast, die old—do it backwards, your way.", "Unknown"],
  ["They ask you how you do it—you say God.", "DJ Khaled"],
  ["You want to be what you once dreamed of becoming.", "Richie Havens"],
  ["Be the change you wish to see in the world—you start it.", "Mahatma Gandhi"],
  ["You have a dream that one day the world will live up to its creed.", "Martin Luther King Jr."],
  ["Your future belongs to you when you believe in your dreams.", "Eleanor Roosevelt"],
  ["You only live once—but if you do it right, once is enough.", "Mae West"],
  ["In the middle of your difficulty lies your opportunity.", "Albert Einstein"],
  ["Your life is what happens while you're busy making other plans.", "John Lennon"],
  ["To be yourself in a world that tries to change you is your greatest accomplishment.", "Ralph Waldo Emerson"],
  ["You're selfish, impatient, and imperfect—but if someone can't handle you at your worst, they don't deserve you at your best.", "Marilyn Monroe"],
  ["Two things are infinite: the universe and human stupidity—and you're still questioning one of them.", "Albert Einstein"],
  ["Get busy living, or get busy dying—your choice.", "Stephen King"],
  ["You've got to dance like nobody's watching you.", "William W. Purkey"],
  ["You accept the love you think you deserve.", "Stephen Chbosky"],
  ["It doesn't matter how slowly you go as long as you don't stop.", "Confucius"],
  ["Everything you've ever wanted is on the other side of your fear.", "George Addair"],
  ["You think the most important thing is to keep doing what you love.", "Unknown"],

  
] as const;

export const QuoteCard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { hasCompletedTodaySession } = useStreakStore();

  const [quote, speaker] = useMemo(() => {
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
        <Text style={styles.speakerText}>~ {speaker}</Text>
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
    alignItems: 'stretch',
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
    alignSelf: 'center',
    maxWidth: '82%',
  },
  speakerText: {
    color: 'rgba(236, 224, 200, 0.78)',
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    textAlign: 'right',
    marginTop: spacing.sm,
    paddingRight: spacing.lg,
  },
});
