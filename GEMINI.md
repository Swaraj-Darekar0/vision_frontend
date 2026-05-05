# SpeakingCoach Frontend (VisionCoach)

AI-Powered Public Speaking Analysis platform that transforms subjective performance into objective, data-driven growth.

## 🚀 Project Overview

VisionCoach is an intelligent multimodal coaching platform integrating computer vision and speech processing. It provides real-time feedback on body language (posture, gestures) and acoustic performance (filler words, pitch, speech rate).

- **Main Technologies:** React Native (Expo), TypeScript, Zustand, Supabase, TanStack Query (React Query), React Native Vision Camera, @shopify/react-native-skia.
- **AI Integration:** Real-time pose tracking via MLKit (Android) and backend-based multimodal scoring (MediaPipe, AssemblyAI, Librosa, Groq LLM).

## 🏗️ Architecture

The project follows a modular structure within the `src` directory:

- **`api/`**: Axios client with interceptors for auth, Supabase client, and endpoint definitions.
- **`audio/`**: Audio decoding, extraction, and utility functions.
- **`cache/`**: Offline-first logic, including an offline upload queue and session caching.
- **`components/`**: UI components categorized by feature (recording, dashboard, onboarding, ui).
- **`hooks/`**: Custom hooks for permissions, layout, and domain-specific logic (e.g., `useMLKitPoseRecording`).
- **`navigation/`**: React Navigation configuration (Stack Navigator).
- **`pipeline/`**: Logic for preparing and bundling session data for backend analysis.
- **`screens/`**: High-level screen components.
- **`store/`**: Global state management using Zustand (auth, plan, session, streak).
- **`theme/`**: Design system tokens (colors, typography, spacing).
- **`utils/`**: Shared helper functions (formatting, scoring, math).

## 🛠️ Development Conventions

- **TypeScript:** Strictly typed codebase. Ensure all new components and functions have proper type definitions.
- **State Management:** Use Zustand for global state. Prefer local state (useState) or React Query for server-state caching where appropriate.
- **Styling:** Themed styling using constants from `src/theme`. Avoid hardcoded colors or spacing.
- **API Interactions:** Use the centralized `apiClient` in `src/api/client.ts` to ensure auth headers and token refreshing are handled automatically.
- **Offline Reliability:** Changes to session uploads should respect the offline queue logic in `src/cache/offlineQueue.ts`.
- **Testing:** Tests are located in `__tests__` folders adjacent to the source (e.g., `src/audio/__tests__`).

## 🚀 Key Commands

- **Start Expo:** `npm start`
- **Run Android:** `npm run android`
- **Run iOS:** `npm run ios`
- **Run Web:** `npm run web`
- **Test:** `npm test` (Note: Ensure Jest is configured if adding new tests)

## 📁 Key Files & Directories

- `App.tsx`: Entry point for the application.
- `src/api/supabase.ts`: Supabase initialization.
- `src/store/authStore.ts`: Central authentication and user profile logic.
- `src/screens/RecordingScreen.tsx`: Core recording interface integrating camera and pose capture.
- `src/hooks/useSessionUpload.ts`: Complex logic for uploading and processing sessions.
- `assets/`: Static assets, including fonts, images, and animations (Lottie).

## 🔌 Native Modules & Plugins

- **`mlKitPosePlugin.ts`**: Native plugin for high-performance, real-time pose estimation using Google's MLKit.
- **Vision Camera**: Utilized for high-fidelity video capture with frame processing support.
- **Razorpay**: Integrated for subscription payments (`react-native-razorpay`).
- **Skia**: Used for advanced graphics rendering and animations.
