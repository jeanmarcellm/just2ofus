import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.just2ofus.app',
  appName: 'Just2Ofus',
  webDir: 'out',
  ios: {
    path: '../ios',
  },
  android: {
    path: '../android',
  },
};

export default config;
