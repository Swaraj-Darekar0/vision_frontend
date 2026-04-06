import { RootStackParamList } from '../types/navigation';

export type GradientPalette = [string, string, string];

const authPalette: GradientPalette = ['#2E2F1D', '#4A4633', '#080808'];

export const AUTH_WALLPAPER_IMAGE = require('../../assets/images/loginBg-t.png');

export const AUTH_CARD_OVERLAY = {
  cardBackground: 'rgba(0, 0, 0, 0.45)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  cardHighlight: 'rgba(255, 255, 255, 0.06)',
} as const;

export const WELCOME_OVERLAY = {
  darkTint: 'rgba(0, 0, 0, 0.15)',
  cardBackground: 'rgba(255, 255, 255, 0.18)',
  cardBorder: 'rgba(255, 255, 255, 0.25)',
} as const;

export const SCREEN_GRADIENTS: Record<keyof RootStackParamList, GradientPalette> = {
  Login: authPalette,
  Signup: authPalette,
  Welcome: authPalette,
  Dashboard: ['#161B24', '#3C6865', '#080B0D'],
  DiagnosticEntry: ['#1A202B', '#65472F', '#07090D'],
  PostAssessment: ['#211D31', '#65506E', '#09070D'],
  PersonalizationOnboarding: ['#132128', '#3B6650', '#070A0D'],
  Paywall: ['#261C2F', '#906537', '#09070C'],
  WeeklyReview: ['#11222B', '#3D6E66', '#081014'],
  Recording: ['#111214', '#611F23', '#050506'],
  Processing: ['#121723', '#495684', '#07090D'],
  Results: ['#171B28', '#556E60', '#090B0D'],
  SessionHistory: ['#161B23', '#476268', '#080A0D'],
  SessionDetail: ['#17202A', '#536A73', '#080A0D'],
};
