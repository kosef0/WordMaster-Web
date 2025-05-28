// src/api/apiService.js
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { db, initDatabase } from '../database/db';

// Django API URL (bunu kendi sunucunuzun URL'si ile değiştirin)
const API_URL = 'http://192.168.1.100:8000/api';

// SQLite veritabanı dosya yolu
const DB_PATH = `${FileSystem.documentDirectory}SQLite/wordmaster.db`;

// API istekleri için axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Kimlik doğrulama token'ını ayarla
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Django'dan veritabanını indir
export const downloadDatabase = async () => {
  try {
    const response = await api.get('/database/download', {
      responseType: 'arraybuffer',
    });
    
    // Veritabanı dizinini oluştur
    const dbDirectory = `${FileSystem.documentDirectory}SQLite`;
    const dirInfo = await FileSystem.getInfoAsync(dbDirectory);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });
    }
    
    // Veritabanı dosyasını kaydet
    await FileSystem.writeAsStringAsync(
      DB_PATH,
      response.data,
      { encoding: FileSystem.EncodingType.Base64 }
    );
    
    console.log('Veritabanı başarıyla indirildi ve kaydedildi.');
    
    // Veritabanını başlat
    await initDatabase();
    
    return true;
  } catch (error) {
    console.error('Veritabanı indirme hatası:', error);
    throw error;
  }
};

// Veritabanını Django'ya yükle
export const uploadDatabase = async () => {
  try {
    // Veritabanı dosyasını oku
    const base64Data = await FileSystem.readAsStringAsync(
      DB_PATH,
      { encoding: FileSystem.EncodingType.Base64 }
    );
    
    // Veritabanını API'ye gönder
    await api.post('/database/upload', {
      database: base64Data,
    });
    
    console.log('Veritabanı başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error('Veritabanı yükleme hatası:', error);
    throw error;
  }
};

// Veritabanı senkronizasyonu
export const syncDatabase = async () => {
  try {
    // Sunucudan son güncelleme zamanını al
    const response = await api.get('/database/last-update');
    const serverLastUpdate = new Date(response.data.last_update);
    
    // Yerel son güncelleme zamanını al
    const localLastUpdateStr = await getLocalLastUpdate();
    const localLastUpdate = localLastUpdateStr ? new Date(localLastUpdateStr) : new Date(0);
    
    // Sunucudaki veritabanı daha yeniyse indir
    if (serverLastUpdate > localLastUpdate) {
      await downloadDatabase();
      await setLocalLastUpdate(serverLastUpdate.toISOString());
      return { action: 'downloaded', timestamp: serverLastUpdate };
    } 
    // Yerel veritabanı daha yeniyse yükle
    else if (localLastUpdate > serverLastUpdate) {
      await uploadDatabase();
      return { action: 'uploaded', timestamp: localLastUpdate };
    }
    
    // Değişiklik yoksa
    return { action: 'none', timestamp: serverLastUpdate };
  } catch (error) {
    console.error('Veritabanı senkronizasyon hatası:', error);
    throw error;
  }
};

// Yerel son güncelleme zamanını al
const getLocalLastUpdate = async () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'PRAGMA user_version',
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            const timestamp = rows._array[0].user_version;
            resolve(new Date(timestamp * 1000).toISOString());
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error('Son güncelleme zamanı alınırken hata:', error);
          reject(error);
        }
      );
    });
  });
};

// Yerel son güncelleme zamanını ayarla
const setLocalLastUpdate = async (isoDateString) => {
  const timestamp = Math.floor(new Date(isoDateString).getTime() / 1000);
  
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `PRAGMA user_version = ${timestamp}`,
        [],
        (_, result) => {
          resolve(result);
        },
        (_, error) => {
          console.error('Son güncelleme zamanı ayarlanırken hata:', error);
          reject(error);
        }
      );
    });
  });
};

export default api; 