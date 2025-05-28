import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, SHADOWS } from '../../styles/theme';
import { RootState } from '../../store';

// API fonksiyonları
import { 
  getLearningSteps, 
  getWordsByCategory, 
  updateWordProgress, 
  updateCategoryProgress 
} from '../../database/api';

// Tip tanımlamaları
type RootStackParamList = {
  Treasure: { stepId: number, categoryId: number };
  LearningStep: { stepId: number, categoryId: number };
};

type TreasureScreenProps = StackScreenProps<RootStackParamList, 'Treasure'>;

const { width } = Dimensions.get('window');

const TreasureScreen: React.FC<TreasureScreenProps> = ({ navigation, route }) => {
  const { stepId, categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [treasureOpened, setTreasureOpened] = useState<boolean>(false);
  const [reward, setReward] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  
  const shakeAnimation = new Animated.Value(0);
  const scaleAnimation = new Animated.Value(1);
  const rotateAnimation = new Animated.Value(0);
  const glowAnimation = new Animated.Value(0);

  useEffect(() => {
    loadStepData();
    startShakeAnimation();
  }, [stepId]);

  const loadStepData = async () => {
    try {
      setLoading(true);
      
      // Adım bilgilerini getir
      const stepsData = await getLearningSteps();
      const selectedStep = stepsData.find((s: any) => s.id === stepId);
      
      if (!selectedStep) {
        throw new Error('Öğrenme adımı bulunamadı');
      }
      
      setStep(selectedStep);
      
      // Hazine ödülünü belirle (burada varsayılan bir ödül oluşturuyoruz)
      const rewardTypes = ['experience', 'badge', 'bonus'];
      const randomRewardType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
      
      let rewardValue;
      let rewardDescription;
      
      switch (randomRewardType) {
        case 'experience':
          rewardValue = Math.floor(Math.random() * 100) + 50; // 50-150 arası XP
          rewardDescription = `${rewardValue} XP kazandınız!`;
          break;
        case 'badge':
          rewardValue = 'Kelime Ustası';
          rewardDescription = 'Yeni bir rozet kazandınız!';
          break;
        case 'bonus':
          rewardValue = Math.floor(Math.random() * 5) + 1; // 1-5 arası bonus puan
          rewardDescription = `${rewardValue} bonus puan kazandınız!`;
          break;
        default:
          rewardValue = 100;
          rewardDescription = '100 XP kazandınız!';
      }
      
      setReward({
        type: randomRewardType,
        value: rewardValue,
        description: rewardDescription
      });
      
      // Ödül için skor belirle
      setScore(randomRewardType === 'experience' ? Number(rewardValue) : 50);
      
      setLoading(false);
    } catch (err) {
      setError('Adım verileri yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Hazine veri yükleme hatası:', err);
    }
  };

  const startShakeAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        })
      ]),
      { iterations: 5 }
    ).start();
  };

  const handleOpenTreasure = () => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animasyonlar
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        })
      ]),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setTreasureOpened(true);
    });
  };

  const handleComplete = async () => {
    try {
      console.log(`Hazine tamamlandı. Kategori ID: ${step?.category}, Skor: ${score}`);
      
      // Adım tamamlama durumunu güncelle
      if (step) {
        try {
          console.log(`Kategori ilerlemesi güncelleniyor: ID=${step.category}`);
          
          const result = await updateCategoryProgress(step.category, {
            score: score,
            completed: true,
          });
          
          if (!result || result.success === false) {
            console.warn('Kategori ilerlemesi güncellenemedi:', result);
            Alert.alert('Uyarı', 'Kategori ilerlemesi kaydedilirken bir sorun oluştu, ancak devam edebilirsiniz.');
          } else {
            console.log('Kategori ilerlemesi başarıyla güncellendi');
          }
        } catch (categoryError) {
          console.error('Kategori ilerlemesi güncelleme hatası:', categoryError);
          Alert.alert('Uyarı', 'Kategori ilerlemesi kaydedilirken bir sorun oluştu, ancak devam edebilirsiniz.');
        }
      }
      
      // Adım ekranına dön
      navigation.goBack();
    } catch (error) {
      console.error('İlerleme güncelleme hatası:', error);
      Alert.alert('Hata', 'İlerleme kaydedilirken bir hata oluştu, ancak devam edebilirsiniz.');
      
      // Hata olsa bile kullanıcının devam etmesine izin ver
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadStepData}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.retryButton, { marginTop: SPACING.s }]}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Hazine açıldığında ödül gösterimi
  if (treasureOpened) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Hazine</Text>
        </View>
        
        <View style={styles.rewardContainer}>
          <Text style={styles.rewardTitle}>Tebrikler!</Text>
          <Text style={styles.rewardSubtitle}>Bir hazine buldunuz!</Text>
          
          <View style={styles.rewardIconContainer}>
            {reward?.type === 'experience' && (
              <Ionicons name="star" size={80} color={COLORS.warning} />
            )}
            {reward?.type === 'badge' && (
              <Ionicons name="ribbon" size={80} color={COLORS.primary} />
            )}
            {reward?.type === 'bonus' && (
              <Ionicons name="gift" size={80} color={COLORS.success} />
            )}
          </View>
          
          <Text style={styles.rewardDescription}>{reward?.description}</Text>
          <Text style={styles.rewardDetail}>
            {reward?.type === 'experience' && 'Deneyim puanınız arttı!'}
            {reward?.type === 'badge' && 'Profilinizde yeni bir rozet kazandınız!'}
            {reward?.type === 'bonus' && 'Skor tablonuzda bonus puan kazandınız!'}
          </Text>
          
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Text style={styles.completeButtonText}>Tamamla</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Shaking, rotation ve glowing efektleri
  const shake = shakeAnimation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-5, 0, 5]
  });
  
  const rotate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const glow = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10]
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Hazine</Text>
      </View>
      
      <View style={styles.treasureContainer}>
        <Text style={styles.treasureTitle}>
          Tebrikler! Bir hazine buldunuz!
        </Text>
        
        <Text style={styles.treasureInstructions}>
          Hazineyi açmak için üzerine tıklayın
        </Text>
        
        <TouchableOpacity 
          style={styles.treasureButtonContainer}
          onPress={handleOpenTreasure}
        >
          <Animated.View 
            style={[
              styles.treasureButton,
              { 
                transform: [
                  { translateX: shake },
                  { scale: scaleAnimation },
                  { rotate: rotate }
                ],
                shadowColor: COLORS.warning,
                shadowOpacity: glow,
              }
            ]}
          >
            <Ionicons name="cube" size={80} color={COLORS.warning} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.s,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  treasureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  treasureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  treasureInstructions: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  treasureButtonContainer: {
    marginTop: SPACING.l,
  },
  treasureButton: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.warning,
    ...SHADOWS.large,
  },
  rewardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  rewardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  rewardSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  rewardIconContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 75,
    marginBottom: SPACING.xl,
    ...SHADOWS.large,
  },
  rewardDescription: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.warning,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  rewardDetail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 8,
    ...SHADOWS.medium,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default TreasureScreen;