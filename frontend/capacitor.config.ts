import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.facturapro.enterprise',
  appName: 'FacturaPro',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    buildOptions: {
      keystorePath: './facturapro.keystore',
      keystoreAlias: 'facturapro',
    },
  },
};

export default config;
