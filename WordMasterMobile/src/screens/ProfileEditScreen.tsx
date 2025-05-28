import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../store/authSlice';
import { updateUserProfile, updateApiUrl } from '../database/api';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState, AppDispatch } from '../store';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Profile: undefined;
  ProfileEdit: undefined;
  PasswordChange: undefined;
  ProfilePhoto: undefined;
};

type ProfileEditScreenProps = StackScreenProps<RootStackParamList, 'ProfileEdit'>;

const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'photo'>('profile');
  
  // Profil bilgileri için state
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  
  // Şifre değişikliği için state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Yükleniyor durumu
  const [isLoading, setIsLoading] = useState(false);
  
  // Tunnel modu için state
  const [tunnelMode, setTunnelMode] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  
  // Cihaz modu için state
  const [deviceMode, setDeviceMode] = useState(false);
  
  // Component yüklendiğinde tunnel modunu kontrol et
  useEffect(() => {
    const checkModes = async () => {
      try {
        const isTunnelMode = await AsyncStorage.getItem('tunnelMode');
        setTunnelMode(isTunnelMode === 'true');
        
        const isDeviceMode = await AsyncStorage.getItem('deviceMode');
        setDeviceMode(isDeviceMode === 'true');
        
        const savedTunnelUrl = await AsyncStorage.getItem('tunnelUrl');
        if (savedTunnelUrl) {
          setTunnelUrl(savedTunnelUrl);
        }
      } catch (error) {
        console.error('Bağlantı modu kontrol hatası:', error);
      }
    };
    
    checkModes();
  }, []);
  
  // Profil bilgilerini güncelle
  const handleUpdateProfile = async () => {
    if (!email.trim()) {
      Alert.alert('Hata', 'E-posta adresi boş olamaz.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Profil bilgilerini güncelle
      dispatch(updateProfile({
        email,
        first_name: firstName,
        last_name: lastName,
        bio
      }));
      
      Alert.alert('Başarılı', 'Profil bilgileriniz başarıyla güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Profil bilgileriniz güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Şifre değiştir
  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm şifre alanlarını doldurun.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter uzunluğunda olmalıdır.');
      return;
    }
    
    setIsLoading(true);
    
    // API'ye şifre değiştirme isteği göndermek için gerçek bir fonksiyon eklenmeli
    // Şimdilik simülasyon yapıyoruz
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.', [
        { text: 'Tamam', onPress: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          navigation.goBack();
        }}
      ]);
    }, 1000);
  };
  
  // Profil fotoğrafını güncelle
  const handleUpdatePhoto = () => {
    // Resim seçme işlemleri için gerçek bir fonksiyon eklenmeli
    Alert.alert('Bilgi', 'Bu özellik henüz uygulanmadı.');
  };
  
  // Tunnel modu değişikliğini işle
  const handleTunnelModeChange = async (value: boolean) => {
    setTunnelMode(value);
    
    if (value) {
      // Tunnel modu açıldığında cihaz modunu kapat
      setDeviceMode(false);
      
      // URL belirtilmemişse modal göster
      if (!tunnelUrl) {
        setShowUrlModal(true);
      } else {
        // Tunnel modunu etkinleştir, cihaz modunu kapat
        await updateApiUrl(value, undefined, false);
      }
    } else {
      // Tunnel modu kapatıldığında API URL'yi varsayılana döndür
      await updateApiUrl(false, undefined, deviceMode);
    }
  };
  
  // Tunnel URL'yi kaydet ve uygula
  const saveTunnelUrl = async () => {
    if (!tunnelUrl.trim()) {
      Alert.alert('Hata', 'Lütfen geçerli bir URL girin');
      return;
    }
    
    try {
      // URL'yi direkt updateApiUrl fonksiyonuna gönderiyoruz
      await updateApiUrl(true, tunnelUrl);
      
      setShowUrlModal(false);
      Alert.alert('Başarılı', 'API URL güncellendi. Uygulamayı yeniden başlatmanız gerekebilir.');
    } catch (error) {
      console.error('Tunnel URL kaydetme hatası:', error);
      Alert.alert('Hata', 'URL kaydedilirken bir hata oluştu');
    }
  };
  
  // Cihaz modu değişikliğini işle
  const handleDeviceModeChange = async (value: boolean) => {
    setDeviceMode(value);
    
    if (value) {
      // Cihaz modu açıldığında tunnel modunu kapat
      setTunnelMode(false);
      // Cihaz modunu etkinleştir, tunnel modunu kapat
      await updateApiUrl(false, undefined, true);
    } else {
      // Cihaz modu kapatıldığında API URL'yi varsayılana döndür
      await updateApiUrl(tunnelMode, undefined, false);
    }
  };
  
  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Kullanıcı bilgileri yüklenemedi.</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hesap Ayarları</Text>
          <View style={{width: 24}} />
        </View>
        
        {/* Açıklama */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Profil bilgilerinizi ve ayarlarınızı yönetin
          </Text>
        </View>
        
        {/* Sekmeler */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons 
              name="person" 
              size={20} 
              color={activeTab === 'profile' ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'profile' && styles.activeTabText
              ]}
            >
              Profil Bilgileri
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'password' && styles.activeTab]}
            onPress={() => setActiveTab('password')}
          >
            <Ionicons 
              name="key" 
              size={20} 
              color={activeTab === 'password' ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'password' && styles.activeTabText
              ]}
            >
              Şifre Değiştir
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'photo' && styles.activeTab]}
            onPress={() => setActiveTab('photo')}
          >
            <Ionicons 
              name="image" 
              size={20} 
              color={activeTab === 'photo' ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'photo' && styles.activeTabText
              ]}
            >
              Profil Fotoğrafı
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {/* Profil Bilgileri Sekmesi */}
          {activeTab === 'profile' && (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kullanıcı Adı:</Text>
                <View style={styles.disabledInput}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <Text style={styles.disabledInputText}>{user.username}</Text>
                  <Text style={styles.helperText}>Kullanıcı adı değiştirilemez</Text>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-posta Adresi:</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-posta adresiniz"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adınız:</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Adınız"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Soyadınız:</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Soyadınız"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hakkımda:</Text>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Kendinizi kısaca tanıtın"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
              
              {/* Tunnel Mode seçeneği */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bağlantı Modu:</Text>
                
                {/* Cihaz Modu - Gerçek cihazlar için */}
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    Gerçek Cihaz Modu (Bilgisayar IP'si)
                  </Text>
                  <Switch
                    value={!tunnelMode && deviceMode}
                    onValueChange={(value) => handleDeviceModeChange(value)}
                    trackColor={{ false: COLORS.textLight, true: COLORS.success }}
                  />
                </View>
                
                {/* Tunnel Modu */}
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    Tunnel Modu (Uzak Sunucu)
                  </Text>
                  <Switch
                    value={tunnelMode}
                    onValueChange={handleTunnelModeChange}
                    trackColor={{ false: COLORS.textLight, true: COLORS.primary }}
                    disabled={deviceMode && !tunnelMode}
                  />
                </View>
                
                {tunnelMode && (
                  <TouchableOpacity 
                    style={styles.urlButton}
                    onPress={() => setShowUrlModal(true)}
                  >
                    <Ionicons name="globe-outline" size={20} color="#fff" style={styles.inputIcon} />
                    <Text style={styles.urlButtonText}>Backend API URL'yi Ayarla</Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.helperText}>
                  Mobil ağ üzerinden bağlanıyorsanız Gerçek Cihaz Modunu, uzak bir sunucuya bağlanacaksanız Tunnel Modunu seçin
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                onPress={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.submitButtonText}>Güncelleniyor...</Text>
                ) : (
                  <Text style={styles.submitButtonText}>Değişiklikleri Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Şifre Değiştir Sekmesi */}
          {activeTab === 'password' && (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mevcut Şifre:</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mevcut şifreniz"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre:</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Yeni şifreniz"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
                <Text style={styles.helperText}>En az 8 karakter uzunluğunda olmalıdır</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre (Tekrar):</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Yeni şifrenizi tekrar girin"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.submitButtonText}>Değiştiriliyor...</Text>
                ) : (
                  <Text style={styles.submitButtonText}>Şifreyi Değiştir</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Profil Fotoğrafı Sekmesi */}
          {activeTab === 'photo' && (
            <View style={styles.formContainer}>
              <View style={styles.photoContainer}>
                <View style={styles.photoPreview}>
                  <Image
                    source={{ uri: profile.profile_pic || 'https://via.placeholder.com/150' }}
                    style={styles.photo}
                  />
                </View>
                
                <Text style={styles.photoHelpText}>
                  JPG, PNG veya GIF formatında bir resim yükleyin (max. 2MB)
                </Text>
                
                <TouchableOpacity
                  style={styles.photoSelectButton}
                  onPress={handleUpdatePhoto}
                >
                  <Ionicons name="image-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.photoSelectButtonText}>Dosya Seç</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, styles.updatePhotoButton, isLoading && styles.disabledButton]}
                  onPress={handleUpdatePhoto}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Text style={styles.submitButtonText}>Güncelleniyor...</Text>
                  ) : (
                    <Text style={styles.submitButtonText}>Profil Fotoğrafını Güncelle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.backToProfileButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} style={styles.buttonIcon} />
          <Text style={styles.backToProfileText}>Profile Dön</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tunnel URL Modal */}
      <Modal
        visible={showUrlModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>API URL'yi Girin</Text>
            <Text style={styles.modalDescription}>
              Backend sunucunuzun tam URL'sini girin (örn: https://example.com/api)
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={tunnelUrl}
              onChangeText={setTunnelUrl}
              placeholder="https://example.com/api"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowUrlModal(false);
                  if (!tunnelUrl) {
                    setTunnelMode(false);
                  }
                }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveTunnelUrl}
              >
                <Text style={styles.modalSaveText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Stil sabitleri için alternatif değerler
const modalTitleSize = 18;
const modalTextSize = 14;

// Stiller
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  descriptionContainer: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
  },
  descriptionText: {
    color: '#fff',
    fontSize: SIZES.small,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    padding: SPACING.m,
  },
  inputGroup: {
    marginBottom: SPACING.m,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.7,
    ...SHADOWS.small,
  },
  inputIcon: {
    padding: SPACING.s,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.m,
    paddingRight: SPACING.s,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  disabledInputText: {
    flex: 1,
    paddingVertical: SPACING.m,
    paddingRight: SPACING.s,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  helperText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginLeft: SPACING.s,
  },
  textAreaContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  textArea: {
    padding: SPACING.s,
    fontSize: SIZES.medium,
    color: COLORS.text,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    alignItems: 'center',
    marginTop: SPACING.m,
    ...SHADOWS.small,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  photoContainer: {
    alignItems: 'center',
    padding: SPACING.m,
  },
  photoPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoHelpText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  photoSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginBottom: SPACING.m,
  },
  buttonIcon: {
    marginRight: SPACING.xs,
  },
  photoSelectButtonText: {
    color: '#fff',
    fontSize: SIZES.small,
    fontWeight: 'bold',
  },
  updatePhotoButton: {
    marginTop: SPACING.m,
  },
  backToProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backToProfileText: {
    color: COLORS.primary,
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.l,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.base,
    padding: SPACING.l,
    width: '100%',
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: modalTitleSize,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  modalDescription: {
    fontSize: modalTextSize,
    color: COLORS.textLight,
    marginBottom: SPACING.m,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    fontSize: modalTextSize,
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.s,
  },
  modalCancelText: {
    color: COLORS.text,
    fontSize: modalTextSize,
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.s,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: modalTextSize,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.s,
    marginBottom: SPACING.xs,
  },
  switchLabel: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.text,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  urlButtonText: {
    color: '#fff',
    fontSize: SIZES.small,
    fontWeight: '500',
  },
});

export default ProfileEditScreen; 