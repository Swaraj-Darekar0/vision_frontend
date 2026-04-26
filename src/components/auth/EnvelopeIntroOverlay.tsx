import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts, fontSize, spacing } from '../../theme';

type Phase = 'INIT' | 'SLIDING' | 'IDLE' | 'OPENING' | 'REVEALED';

interface EnvelopeIntroOverlayProps {
  onDismiss: () => void;
}

const ENVELOPE_IMAGE = require('../../../assets/images/envelope 2.png');

const PAPER_BODY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

export function EnvelopeIntroOverlay({ onDismiss }: EnvelopeIntroOverlayProps) {
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('INIT');

  // ─────────────────────────────────────────────────────────────────────────────
  //  GEOMETRY
  //
  //  The envelope PNG is rotated 180°, so its OPEN FLAP is at the BOTTOM.
  //
  //  We treat the screen as a fixed canvas. Both envelope and paper are
  //  positioned absolutely relative to the overlay root.
  //
  //  IDLE state (target):
  //
  //    y=0 ┌──────────────────────┐   ← envelope top (closed bottom of PNG)
  //        │                      │
  //        │    ENVELOPE BODY     │   envelopeH = height * 0.82
  //        │                      │
  //        │   ┌──────────────┐   │   ← paper starts here (paperTop)
  //        │   │  75% hidden  │   │     paperTop = envelopeH - paperH + PEEK
  //        │   │  (inside env)│   │
  //   envelopeH│──────────────┴───│   ← envelope bottom edge (open flap)
  //        │   │  25% visible │   │     PEEK = paperH * 0.25
  //        └───┴──────────────┴───┘
  //            │  (peek zone) │
  //            └──────────────┘
  //
  //  The envelope has zIndex:2, paper has zIndex:1.
  //  The envelope body visually COVERS the top 75% of the paper.
  //  Only the bottom PEEK portion of the paper is visible.
  //
  //  ON TAP:
  //    - Envelope slides UP (translateY → -envelopeH - 100) and exits screen
  //    - Paper does NOT move at all
  //    - As envelope moves up, it progressively uncovers the paper from bottom to top
  //    - This creates the illusion of paper being drawn out of the envelope
  // ─────────────────────────────────────────────────────────────────────────────

  const envelopeH = height * 0.82;
  const envelopeW = useMemo(() => Math.min(width * 0.86, 400), [width]);
  const paperW    = useMemo(() => Math.min(width * 0.74, 330), [width]);
  const paperH    = 320;

  // How much of the paper peeks below the envelope in IDLE state
  const PEEK      = paperH * 0.25; // 80px visible, 240px hidden inside envelope

  // Paper's absolute top position (fixed, never changes):
  //   paperTop = envelopeH - PEEK  →  bottom of paper aligns at envelopeH + some px
  //   But we want the paper's BOTTOM at (envelopeH + PEEK), so:
  //   paperTop = envelopeH + PEEK - paperH
  //            = envelopeH - (paperH - PEEK)
  //            = envelopeH - paperH * 0.75
  const paperTop  = envelopeH - (paperH - PEEK);

  // ── Shared values ─────────────────────────────────────────────────────────────

  // Envelope: starts at -envelopeH (fully above screen), lands at translateY=0
  const envelopeTranslateY = useSharedValue(-envelopeH);
  const envelopeRotateZ    = useSharedValue(-4);

  // Overlay fade for dismiss
  const overlayOpacity = useSharedValue(1);

  // CTA button
  const buttonOpacity = useSharedValue(0);

  // ── Drop-in ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setPhase('SLIDING');

    envelopeTranslateY.value = withSpring(0, {
      damping: 22,
      stiffness: 80,
      mass: 1.6,
    }, (finished) => {
      if (finished) runOnJS(setPhase)('IDLE');
    });

    envelopeRotateZ.value = withSequence(
      withTiming(-2.5, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(-1.5, { duration: 300, easing: Easing.out(Easing.quad) }),
    );

    buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap: envelope slides away upward ─────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phase !== 'IDLE') return;
    setPhase('OPENING');

    envelopeTranslateY.value = withSpring(-(envelopeH + 120), {
      damping: 16,
      stiffness: 75,
      mass: 1.0,
    }, (finished) => {
      if (finished) runOnJS(setPhase)('REVEALED');
    });

    envelopeRotateZ.value = withTiming(-7, {
      duration: 520,
      easing: Easing.in(Easing.quad),
    });
  }, [envelopeH, envelopeRotateZ, envelopeTranslateY, phase]);

  // ── Dismiss ───────────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 260 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  }, [onDismiss, overlayOpacity]);

  // ── Animated styles ───────────────────────────────────────────────────────────

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const envelopeStyle = useAnimatedStyle(() => {
    // progress 0 = above screen, 1 = fully landed
    const progress = interpolate(
      envelopeTranslateY.value,
      [-envelopeH, 0],
      [0, 1],
      'clamp',
    );
    return {
      transform: [
        { translateY: envelopeTranslateY.value },
        { rotateZ: `${envelopeRotateZ.value}deg` },
      ],
      shadowOpacity: progress * 0.5,
      shadowRadius: progress * 24,
      shadowOffset: { width: 2, height: progress * 20 },
      elevation: progress * 20,
    };
  });

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: interpolate(buttonOpacity.value, [0, 1], [12, 0]) }],
  }));

  const hintText =
    phase === 'IDLE'
      ? 'Tap to open'
      : phase === 'OPENING' || phase === 'REVEALED'
        ? 'Tap to fold back'
        : '';

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>

      {/* Matte background */}
      <View style={styles.matteBg} />

      {/*
        PAPER — zIndex 1, absolutely positioned, NEVER moves.
        Its top is inside the envelope body. Only the bottom PEEK is visible
        because the envelope (zIndex 2) covers everything above the open flap.
      */}
      <Pressable
        onPress={handleTap}
        disabled={phase !== 'IDLE' && phase !== 'REVEALED'}
        style={[
          styles.paper,
          {
            top: paperTop,
            width: paperW,
            height: paperH,
            // Centre horizontally
            left: (width - paperW) / 2,
          },
        ]}
      >
        <Text style={styles.paperHeading}>Lorem Ipsum</Text>
        <Text style={styles.paperBody}>{PAPER_BODY}</Text>
        {hintText ? <Text style={styles.paperHint}>{hintText}</Text> : null}
      </Pressable>

      {/*
        ENVELOPE — zIndex 2, slides on translateY.
        Covers the top 75% of the paper when landed (IDLE).
        Slides away upward on tap, progressively revealing the paper.
        Pressable overlay allows tapping anywhere on the envelope too.
      */}
      <Animated.View
        style={[
          styles.envelopeWrap,
          envelopeStyle,
          { width: envelopeW, height: envelopeH, left: (width - envelopeW) / 2 },
        ]}
      >
        <Pressable
          onPress={handleTap}
          disabled={phase !== 'IDLE'}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={ENVELOPE_IMAGE}
          style={{ width: envelopeW, height: envelopeH, transform: [{ rotate: '180deg' }] }}
          resizeMode="stretch"
        />
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[styles.ctaWrap, ctaStyle]}>
        <Pressable onPress={handleDismiss} style={styles.ctaButton}>
          <Text style={styles.ctaText}>Get started</Text>
        </Pressable>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },

  matteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#100C08',
  },

  // ── Paper ──────────────────────────────────────────────────────────────────
  paper: {
    position: 'absolute',
    zIndex: 1,                     // BELOW the envelope
    borderRadius: 10,
    backgroundColor: '#F7F3E8',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(70, 50, 30, 0.13)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  paperHeading: {
    color: '#18100A',
    fontSize: 26,
    fontFamily: fonts.extraBold,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing.md,
  },

  paperBody: {
    color: '#3A2C1C',
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    lineHeight: 24,
    textAlign: 'center',
  },

  paperHint: {
    marginTop: spacing.lg,
    color: '#9A7D60',
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── Envelope ───────────────────────────────────────────────────────────────
  envelopeWrap: {
    position: 'absolute',
    top: 0,
    zIndex: 2,                     // ON TOP of paper, covers 75% of it
    shadowColor: '#000',
  },

  // ── CTA ────────────────────────────────────────────────────────────────────
  ctaWrap: {
    position: 'absolute',
    bottom: spacing['3xl'],
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 5,
  },

  ctaButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F7F3E8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },

  ctaText: {
    color: '#18100A',
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: 0.1,
  },
});