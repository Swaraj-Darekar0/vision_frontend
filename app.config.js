module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
  },
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_SECRET_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_SECRET_SUPABASE_ANON_KEY,
  },
});
