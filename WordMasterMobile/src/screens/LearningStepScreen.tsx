import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';
import { useLearningProgress } from '../hooks/useLearningProgress';

// API fonksiyonları
import { 
  getLearningStepDetails, 
  getWordsByCategory,
  getUserProgress,
  updateStepProgress,
  getLearningSteps
} from '../database/api';

// Tip tanımlamaları
type RootStackParamList = {
  LearningStep: { stepId: number, categoryId: number };
  CategoryDetail: { categoryId: number };
  WordLearningScreen: { stepId: number, categoryId: number };
  MultipleChoiceScreen: { stepId: number, categoryId: number };
  WordMatchingScreen: { stepId: number, categoryId: number };
  WritingExerciseScreen: { stepId: number, categoryId: number };
  ListeningExerciseScreen: { stepId: number, categoryId: number };
  FinalQuizScreen: { stepId: number, categoryId: number };
  TreasureScreen: { stepId: number, categoryId: number };
};

type LearningStepScreenProps = StackScreenProps<RootStackParamList, 'LearningStep'>;

const LearningStepScreen: React.FC<LearningStepScreenProps> = ({ navigation, route }) => {
  const { stepId, categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [stepProgress, setStepProgress] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Öğrenme ilerlemesi hook'unu ekleyelim
  const { checkStepUnlocked } = useLearningProgress();
  
  useEffect(() => {
    loadStepData();
  }, [stepId]);
  
  const loadStepData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Adım bilgilerini getir
      const stepData = await getLearningStepDetails(stepId);
      if (!stepData) {
        throw new Error('Adım bilgileri alınamadı');
      }
      setStep(stepData);
      
      // Kategoriye ait kelimeleri getir
      const wordsData = await getWordsByCategory(categoryId);
      if (!wordsData || wordsData.length === 0) {
        console.warn(`Kategori ID: ${categoryId} için kelime bulunamadı`);
      }
      
      // Bu adım için kelime sayısını sınırla
      const stepWords = (wordsData || []).slice(0, stepData.word_count || 10);
      
      setWords(stepWords);
      
      // Kullanıcı ilerlemesini getir - hata durumunda varsayılan ilerleme döndürülecek
      const userProgress = await getUserProgress();
      console.log('Adım için kullanıcı ilerlemesi:', userProgress);
      
      // Adım ilerleme durumunu bul
      const progress = userProgress?.steps?.find((p: any) => p.step === stepId);
      setStepProgress(progress || null);
      
      // Adımın kilit durumunu kontrol et
      const isUnlocked = await checkStepUnlocked(stepId, categoryId);
      
      if (!isUnlocked) {
        // Adım kilitli, kullanıcıyı uyar
        Alert.alert(
          'Kilitli Adım',
          'Bu adımı açmak için önceki adımı tamamlamalısınız.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Adım verileri yüklenirken hata:', err);
      
      let errorMessage = 'Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
      
      // Daha açıklayıcı hata mesajları
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
        } else if (err.response.status === 404) {
          errorMessage = 'İstenen adım bulunamadı. Lütfen daha sonra tekrar deneyin.';
        } else if (err.response.status >= 500) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        }
      } else if (err.request) {
        errorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  const handleStartLearning = () => {
    if (!step || words.length === 0) {
      Alert.alert('Hata', 'Adım verileri yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    
    // Adım tipine göre uygun ekrana yönlendir
    switch (step.step_type) {
      case 'vocabulary':
        navigation.navigate('WordLearningScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'multiple_choice':
        navigation.navigate('MultipleChoiceScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'matching':
        navigation.navigate('WordMatchingScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'writing':
        navigation.navigate('WritingExerciseScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'listening':
        navigation.navigate('ListeningExerciseScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'final_quiz':
        navigation.navigate('FinalQuizScreen', {
          stepId,
          categoryId
        });
        break;
        
      case 'treasure':
        navigation.navigate('TreasureScreen', {
          stepId,
          categoryId
        });
        break;
        
      default:
        Alert.alert('Uyarı', 'Bu adım tipi henüz desteklenmiyor.');
        break;
    }
  };
  
  const handleGoBack = () => {
    navigation.navigate('CategoryDetail', { categoryId });
  };
  
  const getStepTypeIcon = (stepType: string) => {
    switch (stepType) {
      case 'vocabulary':
        return 'book';
      case 'matching':
        return 'git-compare';
      case 'multiple_choice':
        return 'list';
      case 'writing':
        return 'create';
      case 'listening':
        return 'ear';
      case 'final_quiz':
        return 'trophy';
      case 'treasure':
        return 'gift';
      default:
        return 'help-circle';
    }
  };
  
  const getStepTypeName = (stepType: string) => {
    switch (stepType) {
      case 'vocabulary':
        return 'Kelime Öğrenme';
      case 'matching':
        return 'Eşleştirme';
      case 'multiple_choice':
        return 'Çoktan Seçmeli';
      case 'writing':
        return 'Yazma';
      case 'listening':
        return 'Dinleme';
      case 'final_quiz':
        return 'Final Quiz';
      case 'treasure':
        return 'Hazine';
      default:
        return 'Bilinmeyen Adım';
    }
  };
  
  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'vocabulary':
        return COLORS.primary;
      case 'matching':
        return COLORS.success;
      case 'multiple_choice':
        return COLORS.info;
      case 'writing':
        return COLORS.warning;
      case 'listening':
        return COLORS.secondary;
      case 'final_quiz':
        return COLORS.danger;
      case 'treasure':
        return COLORS.warning;
      default:
        return COLORS.textSecondary;
    }
  };
  
  const getStepDescription = (stepType: string) => {
    switch (stepType) {
      case 'vocabulary':
        return 'Bu adımda yeni kelimeler öğrenecek ve telaffuzlarını dinleyebileceksiniz.';
      case 'matching':
        return 'Bu adımda kelimeleri Türkçe karşılıklarıyla eşleştireceksiniz.';
      case 'multiple_choice':
        return 'Bu adımda çoktan seçmeli sorularla kelime bilginizi test edeceksiniz.';
      case 'writing':
        return 'Bu adımda kelimelerin İngilizce karşılıklarını yazarak pratik yapacaksınız.';
      case 'listening':
        return 'Bu adımda kelimelerin telaffuzlarını dinleyip doğru kelimeyi seçeceksiniz.';
      case 'final_quiz':
        return 'Bu adımda öğrendiğiniz tüm kelimeleri kapsayan bir sınav yapacaksınız.';
      case 'treasure':
        return 'Tebrikler! Kategoriyi başarıyla tamamladınız.';
      default:
        return 'Bu adımda çeşitli alıştırmalar yaparak kelime bilginizi geliştireceksiniz.';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStepData}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{step?.name}</Text>
          <Text style={styles.headerDescription}>{step?.description}</Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepInfoCard}>
          <View style={[
            styles.stepTypeIcon,
            { backgroundColor: getStepTypeColor(step?.step_type) }
          ]}>
            <Ionicons 
              name={getStepTypeIcon(step?.step_type)} 
              size={32} 
              color="white" 
            />
          </View>
          
          <Text style={styles.stepTypeName}>
            {getStepTypeName(step?.step_type)}
          </Text>
          
          <Text style={styles.stepTypeDescription}>
            {getStepDescription(step?.step_type)}
          </Text>
          
          <View style={styles.wordCountContainer}>
            <Ionicons name="book" size={20} color={COLORS.primary} />
            <Text style={styles.wordCountText}>
              Bu adımda {words.length} kelime öğreneceksiniz
            </Text>
          </View>
          
          {stepProgress?.completed ? (
            <View style={styles.completedContainer}>
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.completedText}>Tamamlandı</Text>
              </View>
              
              {stepProgress.score !== undefined && stepProgress.max_score !== undefined && (
                <Text style={styles.scoreText}>
                  Puan: {stepProgress.score}/{stepProgress.max_score}
                </Text>
              )}
              
              <TouchableOpacity 
                style={styles.repeatButton}
                onPress={handleStartLearning}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Tekrar Et</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartLearning}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.buttonText}>Başla</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.wordListContainer}>
          <Text style={styles.sectionTitle}>Bu Adımdaki Kelimeler</Text>
          
          {words.length > 0 ? (
            words.map((word, index) => (
              <View key={word.id} style={styles.wordItem}>
                <View style={styles.wordIndex}>
                  <Text style={styles.wordIndexText}>{index + 1}</Text>
                </View>
                
                <View style={styles.wordContent}>
                  <Text style={styles.englishWord}>{word.english}</Text>
                  <Text style={styles.turkishWord}>{word.turkish}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="book" size={40} color={COLORS.disabled} />
              <Text style={styles.emptyStateText}>
                Bu adım için henüz kelime eklenmemiş
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
  loadingText: {
    marginTop: SPACING.m,
    color: COLORS.textSecondary,
    fontSize: SIZES.m,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  errorText: {
    marginTop: SPACING.m,
    marginBottom: SPACING.l,
    color: COLORS.danger,
    fontSize: SIZES.m,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.s,
    marginRight: SPACING.m,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerDescription: {
    fontSize: SIZES.m,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  stepInfoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.l,
    marginBottom: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  stepTypeIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  stepTypeName: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  stepTypeDescription: {
    fontSize: SIZES.m,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  wordCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    marginBottom: SPACING.l,
  },
  wordCountText: {
    fontSize: SIZES.s,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  completedContainer: {
    alignItems: 'center',
    width: '100%',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    marginBottom: SPACING.s,
  },
  completedText: {
    fontSize: SIZES.s,
    color: COLORS.success,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  scoreText: {
    fontSize: SIZES.m,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.m,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    width: '100%',
    ...SHADOWS.medium,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    width: '100%',
    ...SHADOWS.medium,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: SIZES.l,
    marginLeft: SPACING.s,
  },
  wordListContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.l,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wordIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  wordIndexText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: SIZES.s,
  },
  wordContent: {
    flex: 1,
  },
  englishWord: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  turkishWord: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateText: {
    fontSize: SIZES.m,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.m,
  },
});

export default LearningStepScreen;