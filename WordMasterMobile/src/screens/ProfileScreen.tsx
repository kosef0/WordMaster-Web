import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Dimensions,
  StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { COLORS, SPACING, SIZES, SHADOWS, GRADIENTS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState, AppDispatch } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
  FadeInUp
} from 'react-native-reanimated';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';

type RootStackParamList = {
  Profile: undefined;
  ProfileEdit: undefined;
  PasswordChange: undefined;
  ProfilePhoto: undefined;
  Main: undefined;
  Login: undefined;
  Statistics: undefined;
};

type ProfileScreenProps = StackScreenProps<RootStackParamList, 'Profile'>;
const { width, height } = Dimensions.get('window');

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile } = useSelector((state: RootState) => state.auth);
  
  // Animasyon değerleri
  const headerHeight = useSharedValue(200);
  const levelProgress = useSharedValue(0);

  // Animasyon stilleri
  const progressAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${levelProgress.value * 100}%`,
    };
  });

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Seviye ilerleme çubuğu animasyonu
    const level = profile?.level || 1;
    const xp = profile?.experience_points || 0;
    const nextLevelXP = level * 100;
    const progress = Math.min(1, xp / nextLevelXP);
    
    levelProgress.value = withTiming(progress, { duration: 1000 });
  }, [profile]);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          onPress: () => {
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Kullanıcı bilgileri yüklenemedi.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Profil Başlık Bölümü */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profile.profile_pic || 'https://via.placeholder.com/100' }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.editProfilePicButton}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.fullName}>{`${user.first_name || ''} ${user.last_name || ''}`}</Text>
            <Text style={styles.email}>{user.email}</Text>
            
            <View style={styles.levelContainer}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelText}>Seviye {profile.level || 1}</Text>
                <Text style={styles.xpText}>{profile.experience_points || 0} XP</Text>
              </View>
              <View style={styles.levelProgressBar}>
                <Animated.View style={[styles.levelProgressFill, progressAnimStyle]} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        {/* Profil İstatistikleri */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <AnimatedCard style={styles.statsCard} variant="elevated">
            <View style={styles.statsHeader}>
              <Ionicons name="stats-chart" size={22} color={COLORS.primary} />
              <Text style={styles.statsTitle}>Öğrenme İstatistikleri</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Öğrenilen</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.streak_days || 1}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Quizler</Text>
              </View>
            </View>
          </AnimatedCard>
        </Animated.View>
        
        {/* Son Aktiviteler */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <AnimatedCard style={styles.recentCard} variant="bordered">
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={22} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Son Quizler</Text>
            </View>
            
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>Henüz quiz tamamlanmadı</Text>
            </View>
          </AnimatedCard>
        </Animated.View>
        
        {/* Başarılar */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <AnimatedCard style={styles.achievementsCard} variant="gradient" gradientColors={[COLORS.backgroundLight, COLORS.background]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy-outline" size={22} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Başarılar</Text>
            </View>
            
            <View style={styles.achievementsGrid}>
              <View style={styles.achievement}>
                <View style={[styles.achievementIcon, styles.achievementComplete]}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.achievementTitle}>İlk Giriş</Text>
              </View>
              
              <View style={styles.achievement}>
                <View style={[styles.achievementIcon, styles.achievementComplete]}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.achievementTitle}>İlk Kelime</Text>
              </View>
              
              <View style={styles.achievement}>
                <View style={[styles.achievementIcon, styles.achievementIncomplete]}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.achievementTitle}>50 Kelime</Text>
              </View>
              
              <View style={styles.achievement}>
                <View style={[styles.achievementIcon, styles.achievementIncomplete]}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.achievementTitle}>10 Gün Streak</Text>
              </View>
            </View>
            
            <AnimatedButton
              text="Tüm Başarıları Gör"
              onPress={() => {}}
              type="text"
              icon="chevron-forward"
              iconPosition="right"
              style={{ alignSelf: 'center', marginTop: SPACING.s }}
            />
          </AnimatedCard>
        </Animated.View>
        
        {/* Ayarlar Menüsü */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <AnimatedCard style={styles.menuCard} variant="default">
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Profil Bilgilerini Düzenle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Statistics')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="stats-chart-outline" size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Detaylı İstatistikler</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="settings-outline" size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Ayarlar</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Yardım ve Destek</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </AnimatedCard>
        </Animated.View>
        
        {/* Çıkış Butonu */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.logoutButtonContainer}>
          <AnimatedButton
            text="Çıkış Yap"
            onPress={handleLogout}
            type="outline"
            icon="log-out-outline"
            iconPosition="left"
            style={styles.logoutButton}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: SPACING.xl,
  },
  headerContent: {
    paddingTop: SPACING.m,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: SPACING.m,
    left: SPACING.m,
    zIndex: 10,
  },
  profileImageContainer: {
    marginTop: SPACING.l,
    marginBottom: SPACING.m,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editProfilePicButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.circle,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  username: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  fullName: {
    fontSize: SIZES.medium,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.m,
  },
  levelContainer: {
    width: '80%',
    marginTop: SPACING.s,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  levelText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.m,
  },
  statsCard: {
    marginBottom: SPACING.m,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  statsTitle: {
    marginLeft: SPACING.s,
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  recentCard: {
    marginBottom: SPACING.m,
    borderLeftColor: COLORS.info,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  cardTitle: {
    marginLeft: SPACING.s,
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.m,
  },
  emptyStateText: {
    marginTop: SPACING.s,
    color: COLORS.textSecondary,
    fontSize: SIZES.small,
  },
  achievementsCard: {
    marginBottom: SPACING.m,
  },
  achievementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: SPACING.s,
  },
  achievement: {
    alignItems: 'center',
    margin: SPACING.s,
    width: '20%',
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    ...SHADOWS.small,
  },
  achievementComplete: {
    backgroundColor: COLORS.success,
  },
  achievementIncomplete: {
    backgroundColor: COLORS.textLight,
  },
  achievementTitle: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  menuCard: {
    marginBottom: SPACING.m,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.m,
  },
  logoutButtonContainer: {
    marginBottom: SPACING.xxl,
    alignItems: 'center',
  },
  logoutButton: {
    width: '70%',
  },
});

export default ProfileScreen; 