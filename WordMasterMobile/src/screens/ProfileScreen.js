import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateProfile } from '../store/authSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { syncDatabase } from '../api/apiService';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);
  const [syncing, setSyncing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          onPress: () => dispatch(logout()),
          style: 'destructive'
        }
      ]
    );
  };

  const handleSyncDatabase = async () => {
    try {
      setSyncing(true);
      const result = await syncDatabase();
      
      let message = '';
      if (result.action === 'downloaded') {
        message = 'Veritabanı sunucudan başarıyla indirildi.';
      } else if (result.action === 'uploaded') {
        message = 'Veritabanı sunucuya başarıyla yüklendi.';
      } else {
        message = 'Veritabanı güncel, senkronizasyon gerekmedi.';
      }
      
      Alert.alert('Senkronizasyon Başarılı', message);
    } catch (error) {
      Alert.alert(
        'Senkronizasyon Hatası',
        'Veritabanı senkronize edilirken bir hata oluştu. Lütfen tekrar deneyin.'
      );
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const calculateProgress = () => {
    // Seviye başına gereken puan
    const pointsPerLevel = 100;
    const currentPoints = profile?.points || 0;
    const currentLevel = profile?.level || 1;
    
    // Bir sonraki seviye için gereken puanlar
    const nextLevelPoints = currentLevel * pointsPerLevel;
    
    // Mevcut seviyedeki ilerleme
    const currentLevelPoints = currentPoints % nextLevelPoints;
    const progress = currentLevelPoints / nextLevelPoints;
    
    return progress * 100;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: profile?.profile_pic || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        
        {profile?.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.level || 1}</Text>
          <Text style={styles.statLabel}>Seviye</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.points || 0}</Text>
          <Text style={styles.statLabel}>Puan</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Öğrenilen</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>
          Seviye İlerlemesi: {calculateProgress().toFixed(0)}%
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${calculateProgress()}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ayarlar</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Bildirimler</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={notificationsEnabled ? COLORS.primaryDark : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Ses Efektleri</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={soundEnabled ? COLORS.primaryDark : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Senkronizasyonu</Text>
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={handleSyncDatabase}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Veritabanını Senkronize Et</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.syncNote}>
          Bu işlem, mobil uygulama ve web sitesi arasında verileri senkronize eder.
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.l,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  profileImageContainer: {
    marginBottom: SPACING.m,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  name: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  username: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  bio: {
    fontSize: SIZES.medium,
    color: COLORS.text,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    marginTop: SPACING.m,
    ...SHADOWS.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  progressContainer: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    marginTop: SPACING.m,
    ...SHADOWS.small,
  },
  progressLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  section: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    marginTop: SPACING.m,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  syncNote: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
});

export default ProfileScreen; 