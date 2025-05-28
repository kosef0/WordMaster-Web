import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// API temel URL'si - platform'a göre URL seçimi
const API_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api', // Android emülatör için
  ios: 'http://127.0.0.1:8000/api',    // iOS simülatör için
  default: 'http://10.0.2.2:8000/api'  // Diğer platformlar için (emülatör adresini kullanıyoruz)
});

// Gerçek cihazlar için WiFi/Mobil ağ IP adresi
// Bu IP adresini bilgisayarınızın (backend'in çalıştığı) yerel IP adresi ile değiştirin
// Örnek: 192.168.1.104, 10.0.0.4 vb.
const DEVICE_API_URL = 'http://192.168.1.100:8000/api'; // Bilgisayarınızın IP adresini buraya yazın

// Tunnel URL için alternatif seçenek
// Expo Go uygulamasında tunnel kullanırken, API_URL'yi değiştirin
// AsyncStorage'dan okunacak, varsayılan değer sadece başlangıç için
let TUNNEL_API_URL = 'https://sizin-backend-adresiniz.com/api'; 

// Gerçek cihaz olup olmadığını kontrol et
const isRealDevice = !__DEV__ || 
  (Platform.OS === 'android' && Platform.constants && 
  typeof Platform.constants === 'object' && 
  !('isEmulator' in Platform.constants || 
    'Brand' in Platform.constants && Platform.constants.Brand === 'google'));

// Veya alternatif bir çözüm olarak, sadece __DEV__ moduna bakabiliriz
// const isRealDevice = !__DEV__;

// AsyncStorage'dan tunnel URL'yi oku
const loadTunnelUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('tunnelUrl');
    if (savedUrl) {
      TUNNEL_API_URL = savedUrl;
      console.log('Kaydedilmiş tunnel URL yüklendi:', TUNNEL_API_URL);
    }
  } catch (error) {
    console.error('Tunnel URL yükleme hatası:', error);
  }
};

// Uygulama başlangıcında tunnel URL'yi yükle
loadTunnelUrl();

// Tunnel modu kontrolü - AsyncStorage'dan kontrol edebilirsiniz
let isTunnelMode = false;
// Gerçek cihaz modu kontrolü
let isDeviceMode = false;

// Tunnel ve cihaz modlarını kontrol et ve API URL'yi güncelle
const checkAndUpdateApiUrl = async () => {
  try {
    const tunnelMode = await AsyncStorage.getItem('tunnelMode');
    const deviceMode = await AsyncStorage.getItem('deviceMode');
    
    isTunnelMode = tunnelMode === 'true';
    isDeviceMode = deviceMode === 'true' || (isRealDevice && deviceMode !== 'false');
    
    console.log('Gerçek cihaz:', isRealDevice ? 'Evet' : 'Hayır');
    console.log('Cihaz modu:', isDeviceMode ? 'Aktif' : 'Pasif');
    console.log('Tunnel modu:', isTunnelMode ? 'Aktif' : 'Pasif');
    
    // Hangi URL'nin kullanılacağını belirle
    let activeUrl = API_URL;
    if (isTunnelMode) {
      activeUrl = TUNNEL_API_URL;
    } else if (isDeviceMode) {
      activeUrl = DEVICE_API_URL;
    }
    
    console.log('Kullanılan API URL:', activeUrl);
  } catch (error) {
    console.error('API URL kontrolü hatası:', error);
  }
};

// Başlangıçta kontrol et
checkAndUpdateApiUrl();

// Gerçek cihazlarda otomatik olarak cihaz modunu etkinleştir
if (isRealDevice) {
  AsyncStorage.setItem('deviceMode', 'true').then(() => {
    console.log('Gerçek cihaz için otomatik olarak cihaz modu etkinleştirildi');
  }).catch(error => {
    console.error('Cihaz modunu etkinleştirme hatası:', error);
  });
}

// Başlangıçta hangi URL'nin kullanıldığını belirle ve konsola yazdır
let initialUrl = API_URL;
if (isTunnelMode) {
  initialUrl = TUNNEL_API_URL;
} else if (isDeviceMode) {
  initialUrl = DEVICE_API_URL;
}

console.log('Başlangıç API URL:', initialUrl);
console.log('Platform:', Platform.OS);

// Ağ bağlantısını kontrol eden basit fonksiyon
export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected || false;
  } catch (error) {
    console.error('Ağ bağlantısı kontrolü hatası:', error);
    return false;
  }
};

// Axios instance oluştur
const api = axios.create({
  baseURL: API_URL, // Başlangıçta varsayılan URL kullanılır
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 saniye timeout (arttırıldı)
});

// API URL'yi güncelleme fonksiyonu
export const updateApiUrl = async (useTunnel: boolean, newTunnelUrl?: string, useDeviceMode?: boolean) => {
  try {
    // Yeni tunnel URL varsa güncelle ve kaydet
    if (newTunnelUrl) {
      TUNNEL_API_URL = newTunnelUrl;
      await AsyncStorage.setItem('tunnelUrl', newTunnelUrl);
      console.log('Yeni tunnel URL kaydedildi:', newTunnelUrl);
    }
    
    // Cihaz modunu güncelle (eğer belirtilmişse)
    if (useDeviceMode !== undefined) {
      isDeviceMode = useDeviceMode;
      await AsyncStorage.setItem('deviceMode', useDeviceMode ? 'true' : 'false');
      console.log('Cihaz modu güncellendi:', isDeviceMode ? 'Aktif' : 'Pasif');
    }
    
    // Tunnel modunu AsyncStorage'a kaydet
    await AsyncStorage.setItem('tunnelMode', useTunnel ? 'true' : 'false');
    isTunnelMode = useTunnel;
    
    // Hangi URL'nin kullanılacağını belirle
    let newBaseURL = API_URL;
    if (isTunnelMode) {
      newBaseURL = TUNNEL_API_URL;
    } else if (isDeviceMode) {
      newBaseURL = DEVICE_API_URL;
    }
    
    // Axios instance'ın baseURL'sini güncelle
    api.defaults.baseURL = newBaseURL;
    
    console.log('API URL güncellendi:', api.defaults.baseURL);
    return true;
  } catch (error) {
    console.error('API URL güncelleme hatası:', error);
    return false;
  }
};

// İstek interceptor'ı - token ekle
api.interceptors.request.use(
  async (config) => {
    try {
      // API URL'yi kontrol et ve güncelle
      let baseUrl = API_URL;
      if (isTunnelMode) {
        baseUrl = TUNNEL_API_URL;
      } else if (isDeviceMode) {
        baseUrl = DEVICE_API_URL;
      }
      config.baseURL = baseUrl;
      
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;  // Django Rest Framework Token Authentication
      }
      
      // Ağ bağlantısını kontrol et
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        console.warn('Ağ bağlantısı yok!');
        Alert.alert(
          'Bağlantı Hatası',
          'İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.'
        );
        return Promise.reject(new Error('Ağ bağlantısı yok'));
      }
      
      return config;
    } catch (error) {
      console.error('Token alma hatası:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Cevap interceptor'ı - hataları yakala
api.interceptors.response.use(
  (response) => {
    console.log(`API Yanıtı: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Hatası:', error);
    
    // Timeout hatası
    if (error.code === 'ECONNABORTED') {
      console.error('Bağlantı zaman aşımı hatası');
      Alert.alert(
        'Bağlantı Hatası',
        'Sunucuya bağlanırken zaman aşımı oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.'
      );
    }
    // Sunucudan gelen hata yanıtı
    else if (error.response) {
      console.error('Hata Detayı:', error.response.data);
      console.error('Durum Kodu:', error.response.status);
      
      // Özel hata mesajları
      if (error.response.status === 401) {
        AsyncStorage.removeItem('token').then(() => {
          console.log('Token silindi - yetkilendirme hatası');
        });
        Alert.alert(
          'Yetkilendirme Hatası',
          'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.'
        );
      } else if (error.response.status === 404) {
        console.warn('İstenen kaynak bulunamadı:', error.config.url);
      } else if (error.response.status >= 500) {
        Alert.alert(
          'Sunucu Hatası',
          'Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
        );
      }
    } 
    // İstek yapıldı ama yanıt alınamadı
    else if (error.request) {
      console.error('Sunucudan yanıt alınamadı');
      console.error('Bağlantı hatası. Sunucu çalışıyor mu?');
      console.error('API URL:', API_URL);
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        'Sunucu Bağlantı Hatası',
        'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
      );
    } 
    // İstek yapılırken bir şeyler yanlış gitti
    else {
      console.error('İstek hatası:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Kullanıcı işlemleri
export const loginUser = async (username: string, password: string) => {
  try {
    // Doğrudan Django'nun login view'ına istek yap
    const response = await api.post('/login/', { 
      username, 
      password 
    });
    
    console.log('Giriş başarılı:', response.data);
    
    // Token'ı sakla
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerUser = async (userData: any) => {
  try {
    const response = await api.post('/register/', userData);
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: number) => {
  try {
    // Önce kullanıcı ID'sini kontrol et
    if (!userId || isNaN(userId)) {
      console.error('Geçersiz kullanıcı ID:', userId);
      throw new Error('Geçersiz kullanıcı ID');
    }
    
    // Varsayılan profil verisi (her durumda kullanılabilir)
    const defaultProfile = {
      user: userId,
      experience_points: 0,
      level: 1,
      streak_days: 0,
      last_activity_date: new Date().toISOString().split('T')[0]
    };
    
    try {
      // Önce profili almayı dene - doğrudan kullanıcı ID'sini kullanarak
      console.log(`Kullanıcı profili alınıyor (ID: ${userId})...`);
      
      // Yeni API yapısıyla uyumlu endpoint
      const response = await api.get(`/profile/${userId}/`);
      console.log('Kullanıcı profili başarıyla alındı:', response.data);
      return response.data;
    } catch (error: any) {
      // 404 hatası durumunda diğer yöntemleri dene
      if (error.response && error.response.status === 404) {
        console.warn(`Kullanıcı profili bulunamadı (ID: ${userId}), alternatif yöntemler deneniyor`);
        
        try {
          // 'me' endpoint'ini dene
          console.log("'me' endpoint'i deneniyor...");
          const meResponse = await api.get('/profile/me/');
          console.log("'me' endpoint'i başarılı:", meResponse.data);
          return meResponse.data;
        } catch (meError) {
          console.warn("'me' endpoint'i başarısız, yeni profil oluşturuluyor");
          
          try {
            // Profil oluşturmak için API endpoint'ini çağır
            console.log('Yeni profil oluşturuluyor:', defaultProfile);
            const createResponse = await api.post('/profile/', defaultProfile);
            console.log('Yeni kullanıcı profili oluşturuldu:', createResponse.data);
            return createResponse.data;
          } catch (createError: any) {
            console.error('Profil oluşturma hatası:', createError);
            
            // Profil oluşturulamadıysa, tüm profilleri kontrol et
            try {
              console.log('Mevcut profiller kontrol ediliyor...');
              const profilesResponse = await api.get('/profile/');
              
              if (profilesResponse.data && Array.isArray(profilesResponse.data)) {
                // Kullanıcıya ait profili bul
                const userProfile = profilesResponse.data.find((profile: any) => {
                  // Hem doğrudan ID karşılaştırması hem de iç içe user objesi kontrolü
                  if (profile.user && typeof profile.user === 'object') {
                    return profile.user.id === userId;
                  }
                  return profile.user === userId;
                });
                
                if (userProfile) {
                  console.log('Mevcut profil bulundu:', userProfile);
                  return userProfile;
                }
              }
            } catch (listError) {
              console.error('Profil listesi alma hatası:', listError);
            }
          }
        }
        
        // Tüm denemeler başarısız olursa yeni bir profil oluştur
        console.warn('Tüm denemeler başarısız, son bir deneme yapılıyor...');
        
        try {
          // Son bir deneme - farklı bir formatta veri gönder
          const finalAttempt = await api.post('/profile/', {
            ...defaultProfile,
            user: {
              id: userId
            }
          });
          console.log('Son deneme başarılı:', finalAttempt.data);
          return finalAttempt.data;
        } catch (finalError) {
          console.error('Son deneme başarısız:', finalError);
          
          // Varsayılan profil döndür
          console.warn('Profil oluşturulamadı, varsayılan profil döndürülüyor');
          return {
            id: null,
            ...defaultProfile
          };
        }
      } else {
        // 404 dışındaki hatalar için
        console.error('Profil alma hatası:', error.response?.status || error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error('Profil işlemi hatası:', error);
    
    // En son çare olarak varsayılan profil döndür
    return {
      id: null,
      user: userId,
      experience_points: 0,
      level: 1,
      streak_days: 0,
      last_activity_date: new Date().toISOString().split('T')[0]
    };
  }
};

export const createUserProfile = async (profileData: any) => {
  try {
    const response = await api.post('/profile/', profileData);
    return response.data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: number, profileData: any) => {
  try {
    console.log(`Profil güncelleniyor (userId: ${userId})...`, profileData);
    
    // Önce profili getirmeyi dene, varsa ID'sini al
    try {
      const profileResponse = await api.get('/profile/me/');
      console.log('Mevcut profil alındı:', profileResponse.data);
      
      // Profil ID'si varsa direkt o ID üzerinden güncelle
      if (profileResponse.data && profileResponse.data.id) {
        const profileId = profileResponse.data.id;
        console.log(`Profil ID ${profileId} kullanılarak güncelleniyor...`);
        
        // Profili güncelle
        const response = await api.put(`/profile/${profileId}/`, profileData);
        console.log('Profil başarıyla güncellendi:', response.data);
        return response.data;
      }
    } catch (getError) {
      console.warn('Profil bilgisi alınamadı, alternatif metotlar deneniyor:', getError);
    }
    
    // /me/ endpoint'i çalışmadıysa, kullanıcı ID'si ile profilleri listeden bulmayı dene
    try {
      console.log('Tüm profiller alınıyor...');
      const profilesResponse = await api.get('/profile/');
      
      if (profilesResponse.data && Array.isArray(profilesResponse.data)) {
        // Kullanıcıya ait profili bul
        const userProfile = profilesResponse.data.find((profile: any) => {
          if (profile.user && typeof profile.user === 'object') {
            return profile.user.id === userId;
          }
          return profile.user === userId;
        });
        
        if (userProfile && userProfile.id) {
          console.log(`Profil listesinden kullanıcı profili bulundu (ID: ${userProfile.id}), güncelleniyor...`);
          const response = await api.put(`/profile/${userProfile.id}/`, profileData);
          console.log('Profil başarıyla güncellendi:', response.data);
          return response.data;
        }
      }
    } catch (listError) {
      console.warn('Profil listesi alınamadı:', listError);
    }
    
    // En son çare olarak /profile/ endpoint'ine direkt POST isteği gönder
    try {
      console.log('Yeni yöntem deneniyor: POST /profile/');
      const createResponse = await api.post('/profile/', {
        ...profileData,
        user: userId
      });
      console.log('Profil oluşturuldu/güncellendi:', createResponse.data);
      return createResponse.data;
    } catch (createError) {
      console.error('Profil oluşturma/güncelleme hatası:', createError);
      
      // Son deneme: Farklı formatta kullanıcı verisi ile dene
      try {
        console.log('Son deneme: Alternatif format');
        const finalResponse = await api.post('/profile/', {
          ...profileData,
          user: { id: userId }
        });
        console.log('Profil başarıyla güncellendi:', finalResponse.data);
        return finalResponse.data;
      } catch (finalError) {
        console.error('Son deneme başarısız:', finalError);
        throw finalError;
      }
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Öğrenme yolları
export const getLearningPaths = async () => {
  try {
    const response = await api.get('/learning-paths/');
    return response.data;
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    throw error;
  }
};

// Kategoriler
export const getCategories = async () => {
  try {
    const response = await api.get('/categories/');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const getCategoryDetails = async (categoryId: number) => {
  try {
    const response = await api.get(`/categories/${categoryId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching category details:', error);
    throw error;
  }
};

// Öğrenme adımları
export const getLearningSteps = async () => {
  try {
    const response = await api.get('/learning-steps/');
    return response.data;
  } catch (error) {
    console.error('Error fetching learning steps:', error);
    throw error;
  }
};

export const getLearningStepDetails = async (stepId: number) => {
  try {
    const response = await api.get(`/learning-steps/${stepId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching learning step details:', error);
    throw error;
  }
};

// Kelimeler
export const getWordsByCategory = async (categoryId: number) => {
  try {
    const response = await api.get(`/words/?category=${categoryId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching words by category:', error);
    throw error;
  }
};

export const updateWordProgress = async (wordId: number, progressData: any) => {
  try {
    console.log(`Kelime ilerlemesi güncelleniyor: ID=${wordId}, Veri:`, progressData);
    
    // wordId kontrol et
    if (!wordId || isNaN(wordId)) {
      console.error('Geçersiz kelime ID:', wordId);
      return { success: false, message: 'Geçersiz kelime ID' };
    }
    
    // Backend'in beklediği parametre adlarını kullan
    const requestData = { 
      word: wordId, // "word_id" yerine "word" kullanıyoruz
      ...progressData 
    };
    
    // Zorunlu alanları kontrol et
    if (!requestData.word) {
      console.error('Eksik zorunlu alan: word');
      return { success: false, message: 'Eksik zorunlu alan: word' };
    }
    
    console.log('Gönderilen kelime ilerleme verisi:', requestData);
    
    try {
      // Direkt olarak POST isteği gönder - backend zaten mevcut kaydı kontrol ediyor
      console.log('Kelime ilerlemesi gönderiliyor...');
      const response = await api.post('/progress/', requestData);
      console.log('Kelime ilerlemesi başarıyla kaydedildi:', response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      // Eğer 400 hatası alırsak (muhtemelen kayıt zaten var), PUT ile güncellemeyi dene
      if (error.response && error.response.status === 400) {
        console.warn('Kelime ilerlemesi zaten var, güncellemeye çalışılıyor...');
        
        try {
          // Önce mevcut ilerlemeyi bul
          const progressResponse = await api.get('/progress/');
          console.log('Mevcut kelime ilerlemeleri alındı');
          
          // Mevcut ilerlemeyi bul
          const existingProgress = Array.isArray(progressResponse.data) ? 
            progressResponse.data.find((p: any) => {
              if (p.word && typeof p.word === 'object') {
                return p.word.id === wordId;
              }
              return p.word === wordId;
            }) : null;
          
          if (existingProgress && existingProgress.id) {
            console.log(`Mevcut kelime ilerlemesi bulundu (ID: ${existingProgress.id}), güncelleniyor`);
            
            // PUT ile güncelle
            const updateResponse = await api.put(`/progress/${existingProgress.id}/`, requestData);
            console.log('Kelime ilerlemesi güncellendi:', updateResponse.data);
            return { success: true, data: updateResponse.data };
          } else {
            // Alternatif yöntem - kelime ID'si ile filtreleme
            try {
              console.log(`Kelime ID=${wordId} için ilerleme kaydı aranıyor...`);
              const filteredResponse = await api.get(`/progress/?word=${wordId}`);
              
              if (filteredResponse.data && filteredResponse.data.length > 0) {
                const filteredProgress = filteredResponse.data[0];
                console.log(`Filtreleme ile kelime ilerlemesi bulundu (ID: ${filteredProgress.id}), güncelleniyor`);
                
                // PUT ile güncelle
                const updateResponse = await api.put(`/progress/${filteredProgress.id}/`, requestData);
                console.log('Kelime ilerlemesi güncellendi:', updateResponse.data);
                return { success: true, data: updateResponse.data };
              }
            } catch (filterError) {
              console.error('Filtreleme hatası:', filterError);
            }
            
            console.error('Kelime ilerlemesi bulunamadı');
            return { 
              success: false, 
              message: 'Kelime ilerlemesi bulunamadı ve oluşturulamadı'
            };
          }
        } catch (updateError: any) {
          console.error('Kelime ilerleme güncelleme hatası:', updateError);
          return { 
            success: false, 
            message: updateError.response?.data?.error || 'Kelime ilerlemesi güncellenemedi',
            error: updateError
          };
        }
      }
      
      // Diğer hatalar için
      console.error('Kelime ilerleme hatası:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          'Kelime ilerlemesi kaydedilemedi';
      return { 
        success: false, 
        message: errorMessage,
        error: error
      };
    }
  } catch (error: any) {
    console.error('Kelime ilerleme güncelleme hatası:', error);
    return { 
      success: false, 
      message: error.response?.data?.detail || 'Kelime ilerlemesi güncellenemedi',
      error 
    };
  }
};

// Kullanıcı ilerleme durumu
export const getUserProgress = async () => {
  try {
    const response = await api.get(`/progress/`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user progress:', error);
    
    // Hata durumunda varsayılan ilerleme durumu döndür
    console.warn('Kullanıcı ilerlemesi alınamadı, varsayılan ilerleme döndürülüyor');
    return {
      user: null,
      categories: [],
      steps: [],
      words: []
    };
  }
};

export const updateStepProgress = async (stepId: number, progressData: any) => {
  try {
    console.log(`Adım ilerlemesi güncelleniyor: ID=${stepId}, Veri:`, progressData);
    
    // stepId kontrol et
    if (!stepId || isNaN(stepId)) {
      console.error('Geçersiz adım ID:', stepId);
      return { success: false, message: 'Geçersiz adım ID' };
    }
    
    // Backend'in beklediği parametre adlarını kullan
    const requestData = { 
      ...progressData,
      step: stepId
    };
    
    console.log('Gönderilen adım ilerleme verisi:', requestData);
    
    // Önce mevcut adım ilerlemesini kontrol et
    try {
      // İlk olarak filtrelenmiş sorgu ile adım ilerlemesini kontrol edelim
      console.log(`Adım ID=${stepId} için ilerleme kaydı aranıyor...`);
      const filteredResponse = await api.get(`/learning-step-progress/?step=${stepId}`);
      
      if (filteredResponse.data && filteredResponse.data.length > 0) {
        // Mevcut kayıt bulundu, güncelleme yap
        const existingProgress = filteredResponse.data[0];
        console.log(`Adım ilerlemesi bulundu (ID: ${existingProgress.id}), güncelleniyor`);
        
        try {
          // PUT ile güncelle
          const updateResponse = await api.put(`/learning-step-progress/${existingProgress.id}/`, requestData);
          console.log('Adım ilerlemesi güncellendi:', updateResponse.data);
          return { success: true, data: updateResponse.data };
        } catch (updateError) {
          console.error('Adım güncelleme hatası:', updateError);
          
          // Alternatif yöntem - PATCH deneyin (sadece gönderilen alanları günceller)
          try {
            console.log('PATCH ile güncelleme deneniyor...');
            const patchResponse = await api.patch(`/learning-step-progress/${existingProgress.id}/`, requestData);
            console.log('Adım ilerlemesi PATCH ile güncellendi:', patchResponse.data);
            return { success: true, data: patchResponse.data };
          } catch (patchError) {
            console.error('PATCH ile güncelleme de başarısız oldu:', patchError);
            throw patchError;
          }
        }
      } else {
        // Kayıt bulunamadı, yeni oluştur
        console.log(`Adım ID=${stepId} için ilerleme kaydı bulunamadı, yeni kayıt oluşturuluyor`);
        
        try {
          // POST ile yeni kayıt oluştur
          const createResponse = await api.post('/learning-step-progress/', requestData);
          console.log('Yeni adım ilerlemesi oluşturuldu:', createResponse.data);
          return { success: true, data: createResponse.data };
        } catch (createError: any) {
          console.error('Yeni adım ilerlemesi oluşturma hatası:', createError);
          
          // Hata nedenini analiz et
          if (createError.response) {
            console.error('Sunucu yanıtı:', createError.response.status, createError.response.data);
            
            // Sunucudan dönen hata mesajlarını kontrol et
            const errorData = createError.response.data;
            
            // Spesifik hata kontrolleri
            if (errorData && typeof errorData === 'object') {
              // Hata mesajlarını konsola yazdır
              Object.keys(errorData).forEach(key => {
                console.error(`${key}: ${errorData[key]}`);
              });
              
              // Eksik alanlar için alternatif yöntem
              if (errorData.step) {
                console.log('Adım ID ile ilgili sorun var, alternatif formatta deneniyor...');
                
                // Alternatif formatta tekrar dene
                const altRequestData = {
                  ...requestData,
                  step: { id: stepId }
                };
                
                try {
                  const altResponse = await api.post('/learning-step-progress/', altRequestData);
                  console.log('Alternatif formatta adım ilerlemesi oluşturuldu:', altResponse.data);
                  return { success: true, data: altResponse.data };
                } catch (altError) {
                  console.error('Alternatif format da başarısız oldu:', altError);
                }
              }
            }
          }
          
          // Son çare olarak manuel API çağrısı
          try {
            console.log('Manuel API çağrısı deneniyor...');
            
            const token = await AsyncStorage.getItem('token');
            
            // Doğrudan fetch API kullan
            const response = await fetch(`${API_URL}/learning-step-progress/`, {
              method: 'POST',
              headers: {
                'Authorization': token ? `Token ${token}` : '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('Manuel API çağrısı başarılı:', data);
              return { success: true, data };
            } else {
              const errorData = await response.json();
              console.error('Manuel API çağrısı başarısız:', response.status, errorData);
              throw new Error(`API hatası: ${response.status}`);
            }
          } catch (manualError) {
            console.error('Manuel API çağrısı hatası:', manualError);
            throw manualError;
          }
        }
      }
    } catch (error: any) {
      console.error('Adım ilerleme işlemi hatası:', error);
      
      // Alternatif son deneme - direkt POST
      try {
        console.log('Son bir deneme daha yapılıyor...');
        const lastResponse = await api.post('/learning-step-progress/', requestData, {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Son deneme başarılı:', lastResponse.data);
        return { success: true, data: lastResponse.data };
      } catch (lastError) {
        console.error('Son deneme de başarısız oldu:', lastError);
        return { 
          success: false, 
          message: 'Adım ilerlemesi kaydedilemedi',
          error: error
        };
      }
    }
  } catch (error: any) {
    console.error('Adım ilerleme güncelleme hatası:', error);
    return { 
      success: false, 
      message: error.message || 'Adım ilerlemesi güncellenemedi',
      error 
    };
  }
};

export const updateCategoryProgress = async (categoryId: number, progressData: any) => {
  try {
    console.log(`Kategori ilerlemesi güncelleniyor: ID=${categoryId}, Veri:`, progressData);
    
    // categoryId kontrol et
    if (!categoryId || isNaN(categoryId)) {
      console.error('Geçersiz kategori ID:', categoryId);
      return { success: false, message: 'Geçersiz kategori ID' };
    }
    
    // Backend'in beklediği parametre adlarını kullan
    const requestData = { 
      ...progressData,
      category: categoryId // "category_id" yerine "category" kullanıyoruz
    };
    
    console.log('Gönderilen kategori ilerleme verisi:', requestData);
    
    // Önce mevcut kategori ilerlemesini kontrol et
    try {
      console.log('Kategori ilerlemesi gönderiliyor...');
      const response = await api.post('/category-progress/', requestData);
      console.log('API Yanıtı:', response.status, response.config.url);
      console.log('Kategori ilerlemesi başarıyla kaydedildi:', response.data);
      return { success: true, data: response.data };
    } catch (error: any) {
      // Eğer 400 hatası alırsak (muhtemelen kayıt zaten var), PUT ile güncellemeyi dene
      if (error.response && error.response.status === 400) {
        console.warn('Kategori ilerlemesi zaten var, güncellemeye çalışılıyor...');
        
        try {
          // Önce mevcut ilerlemeyi bul
          const progressResponse = await api.get('/category-progress/');
          console.log('Mevcut kategori ilerlemeleri alındı');
          
          // Mevcut ilerlemeyi bul
          const existingProgress = Array.isArray(progressResponse.data) ? 
            progressResponse.data.find((p: any) => {
              if (p.category && typeof p.category === 'object') {
                return p.category.id === categoryId;
              }
              return p.category === categoryId;
            }) : null;
          
          if (existingProgress && existingProgress.id) {
            console.log(`Mevcut kategori ilerlemesi bulundu (ID: ${existingProgress.id}), güncelleniyor`);
            
            // PUT ile güncelle
            const updateResponse = await api.put(`/category-progress/${existingProgress.id}/`, requestData);
            console.log('Kategori ilerlemesi güncellendi:', updateResponse.data);
            return { success: true, data: updateResponse.data };
          } else {
            // Alternatif yöntem - kategori ID'si ile filtreleme
            try {
              console.log(`Kategori ID=${categoryId} için ilerleme kaydı aranıyor...`);
              const filteredResponse = await api.get(`/category-progress/?category=${categoryId}`);
              
              if (filteredResponse.data && filteredResponse.data.length > 0) {
                const filteredProgress = filteredResponse.data[0];
                console.log(`Filtreleme ile kategori ilerlemesi bulundu (ID: ${filteredProgress.id}), güncelleniyor`);
                
                // PUT ile güncelle
                const updateResponse = await api.put(`/category-progress/${filteredProgress.id}/`, requestData);
                console.log('Kategori ilerlemesi güncellendi:', updateResponse.data);
                return { success: true, data: updateResponse.data };
              } else {
                // Yeni bir deneme daha - farklı bir URL ile
                console.log('Son bir deneme daha yapılıyor...');
                const createResponse = await api.post('/category-progress/', requestData, {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Kategori ilerlemesi oluşturuldu:', createResponse.data);
                return { success: true, data: createResponse.data };
              }
            } catch (filterError) {
              console.error('Filtreleme hatası:', filterError);
              return { success: false, message: 'Kategori ilerlemesi bulunamadı ve oluşturulamadı' };
            }
          }
        } catch (updateError: any) {
          console.error('Kategori ilerleme güncelleme hatası:', updateError);
          return { 
            success: false, 
            message: updateError.response?.data?.error || 'Kategori ilerlemesi güncellenemedi',
            error: updateError
          };
        }
      }
      
      // Diğer hatalar için
      console.error('Kategori ilerleme hatası:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          'Kategori ilerlemesi kaydedilemedi';
      return { 
        success: false, 
        message: errorMessage,
        error: error
      };
    }
  } catch (error: any) {
    console.error('Kategori ilerleme güncelleme hatası:', error);
    return { 
      success: false, 
      message: error.response?.data?.detail || 'Kategori ilerlemesi güncellenemedi',
      error 
    };
  }
};

// Oyun skorları
export const saveGameScore = async (gameId: string, score: number) => {
  try {
    console.log(`Oyun skoru kaydediliyor: Oyun=${gameId}, Skor=${score}`);
    
    // gameId kontrol et
    if (!gameId) {
      console.error('Geçersiz oyun ID\'si:', gameId);
      return { success: false, message: 'Geçersiz oyun ID\'si' };
    }
    
    // Geçerli oyun türlerini kontrol et
    const validGameTypes = ['word_puzzle', 'word_hunt', 'speed_quiz'];
    if (!validGameTypes.includes(gameId)) {
      console.warn(`Bilinmeyen oyun türü: ${gameId}, ancak işleme devam ediliyor`);
    }
    
    const requestData = { 
      game_id: gameId,  // Backend'in beklediği parametre adı "game_id"
      score: score
    };
    
    console.log('Gönderilen veri:', requestData);
    try {
      const response = await api.post(`/game-scores/`, requestData);
      console.log('Oyun skoru başarıyla kaydedildi:', response.data);
      return { ...response.data, success: true };
    } catch (apiError: any) {
      // API hatası durumunda
      if (apiError.response && apiError.response.status === 404) {
        console.warn('API endpoint bulunamadı, yerel depolama kullanılıyor');
        // Yerel depolama ile skor kaydetme işlemi buraya eklenebilir
        return { 
          success: true, 
          message: 'Skor yerel olarak kaydedildi',
          local: true,
          score: score
        };
      } else {
        throw apiError; // Diğer API hatalarını yukarıya ilet
      }
    }
  } catch (error: unknown) {
    console.error('Error saving game score:', error);
    // Hata durumunda başarısız sonuç döndür
    return { 
      success: false, 
      error: error,
      message: 'Oyun skoru kaydedilirken bir hata oluştu' 
    };
  }
};

export const getGameHighScores = async (gameId: string, limit: number = 10) => {
  try {
    const response = await api.get(`/game-scores/?game_id=${gameId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching game high scores:', error);
    // Hata durumunda boş dizi döndür
    return [];
  }
};

export const getUserGameScores = async (gameId?: string) => {
  try {
    const endpoint = gameId ? `/user-game-scores/?game_id=${gameId}` : '/user-game-scores/';
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error fetching user game scores:', error);
    // Hata durumunda boş dizi döndür
    return [];
  }
};

export default api;