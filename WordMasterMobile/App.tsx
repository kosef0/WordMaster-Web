import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabaseConnection } from './src/database/db';

export default function App() {
  useEffect(() => {
    // Uygulama başlatıldığında veritabanı bağlantısını başlat
    initDatabaseConnection();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
} 