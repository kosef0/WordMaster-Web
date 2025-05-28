import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';

// API fonksiyonları
import { 
  getCategoryDetails, 
  getLearningSteps,
  getUserProgress
} from '../database/api';

// Tip tanımlamaları
type RootStackParamList = {
  CategoryDetail: { categoryId: number };
  LearningStep: { stepId: number, categoryId: number };
  WordGameScreen: { gameType: string, categoryId: number };
  Home: undefined;
};

interface LearningStep {
  id: number;
  name: string;
  description?: string;
  order: number;
  step_type: string;
  category: number;
}

interface StepProgress {
  learning_step: LearningStep;
  completed: boolean;
  unlocked: boolean;
  score?: number;
  max_score?: number;
}

type CategoryDetailScreenProps = StackScreenProps<RootStackParamList, 'CategoryDetail'>;

const CategoryDetailScreen: React.FC<CategoryDetailScreenProps> = ({ navigation, route }) => {
  const { categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [category, setCategory] = useState<any>(null);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  useEffect(() => {
    loadCategoryData();
  }, [categoryId]);
  
  const loadCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Kategori bilgilerini getir
      const categoryData = await getCategoryDetails(categoryId);
      setCategory(categoryData);
      
      // Adımları getir
      const stepsData = await getLearningSteps();
      const categorySteps = stepsData.filter((step: any) => step.category === categoryId)
        .sort((a: any, b: any) => a.order - b.order);
      
      // Kullanıcı ilerlemesini getir
      const userProgress = await getUserProgress();
      
      // Adım ilerlemelerini oluştur
      const progressData = categorySteps.map((step: any, index: number) => {
        // Adım ilerleme bilgisini bul
        const stepProgress = userProgress?.steps?.find((p: any) => p.step === step.id);
        
        return {
          learning_step: step,
          completed: !!stepProgress?.completed,
          unlocked: index === 0 ? true : isStepUnlocked(index),
          score: stepProgress?.score || 0,
          max_score: stepProgress?.max_score || 0
        };
      });
      
      setStepsProgress(progressData);
      
      // Kategori ilerleme durumunu hesapla
      calculateProgress();
      
      setLoading(false);
    } catch (err) {
      console.error('Kategori verileri yüklenirken hata:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };
  
  const calculateProgress = () => {
    if (stepsProgress.length === 0) return 0;
    
    const completedSteps = stepsProgress.filter(step => step.completed).length;
    const totalSteps = stepsProgress.length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    
    setProgress(percentage);
    return percentage;
  };
  
  const isStepCompleted = (stepId: number) => {
    const step = stepsProgress.find(s => s.learning_step.id === stepId);
    return step?.completed || false;
  };
  
  const isStepUnlocked = (index: number) => {
    if (index === 0) return true;
    
    // Bir önceki adımın tamamlanma durumunu kontrol et
    const previousStep = stepsProgress[index - 1];
    if (!previousStep) return false;
    
    return previousStep.completed;
  };
  
  const handleStepPress = (stepId: number, unlocked: boolean) => {
    if (!unlocked) {
      Alert.alert('Kilitli Adım', 'Bu adımı açmak için önceki adımları tamamlamalısınız.');
      return;
    }
    
    navigation.navigate('LearningStep', { 
      stepId,
      categoryId
    });
  };
  
  const handleStartGame = (gameType: string) => {
    navigation.navigate('WordGameScreen', {
      gameType,
      categoryId
    });
  };
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'vocabulary':
        return <Ionicons name="book" size={24} color={COLORS.primary} />;
      case 'matching':
        return <Ionicons name="git-compare" size={24} color={COLORS.success} />;
      case 'multiple_choice':
        return <Ionicons name="list" size={24} color={COLORS.info} />;
      case 'writing':
        return <Ionicons name="create" size={24} color={COLORS.warning} />;
      case 'listening':
        return <Ionicons name="ear" size={24} color={COLORS.secondary} />;
      case 'final_quiz':
        return <Ionicons name="trophy" size={24} color={COLORS.danger} />;
      case 'treasure':
        return <Ionicons name="gift" size={24} color={COLORS.warning} />;
      default:
        return <Ionicons name="help-circle" size={24} color={COLORS.textSecondary} />;
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
  
  const getStepBadgeColor = (stepType: string) => {
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
        <TouchableOpacity style={styles.retryButton} onPress={loadCategoryData}>
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
          <Text style={styles.headerTitle}>{category?.name}</Text>
          <Text style={styles.headerDescription}>{category?.description}</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>İlerleme: {progress}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepsContainer}>
          {stepsProgress.map((stepProgress, index) => (
            <TouchableOpacity
              key={stepProgress.learning_step.id}
              style={[
                styles.stepCard,
                !stepProgress.unlocked && styles.lockedStep
              ]}
              onPress={() => handleStepPress(
                stepProgress.learning_step.id, 
                stepProgress.unlocked
              )}
              disabled={!stepProgress.unlocked}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{stepProgress.learning_step.name}</Text>
                <Text style={styles.stepDescription}>
                  {stepProgress.learning_step.description || 
                    `Bu adımda ${getStepTypeName(stepProgress.learning_step.step_type).toLowerCase()} aktivitesi yapacaksınız.`}
                </Text>
                
                <View style={styles.stepMeta}>
                  <View style={[
                    styles.stepTypeBadge,
                    { backgroundColor: getStepBadgeColor(stepProgress.learning_step.step_type) }
                  ]}>
                    {getStepIcon(stepProgress.learning_step.step_type)}
                    <Text style={styles.stepTypeText}>
                      {getStepTypeName(stepProgress.learning_step.step_type)}
                    </Text>
                  </View>
                  
                  {stepProgress.completed && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={styles.completedText}>Tamamlandı</Text>
                      {stepProgress.score !== undefined && stepProgress.max_score !== undefined && (
                        <Text style={styles.scoreText}>
                          {stepProgress.score}/{stepProgress.max_score}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.stepAction}>
                {stepProgress.unlocked ? (
                  <View style={[
                    styles.actionButton,
                    stepProgress.completed ? styles.repeatButton : styles.startButton
                  ]}>
                    {stepProgress.completed ? (
                      <Ionicons name="refresh" size={20} color="white" />
                    ) : (
                      <Ionicons name="play" size={20} color="white" />
                    )}
                  </View>
                ) : (
                  <View style={styles.lockedButton}>
                    <Ionicons name="lock-closed" size={20} color="white" />
                  </View>
                )}
              </View>
              
              {!stepProgress.unlocked && (
                <View style={styles.lockedOverlay}>
                  <View style={styles.lockedMessage}>
                    <Ionicons name="lock-closed" size={18} color={COLORS.secondary} />
                    <Text style={styles.lockedMessageText}>
                      Bu adımı açmak için önceki adımları tamamla
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
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
  progressContainer: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressText: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
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
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  stepsContainer: {
    position: 'relative',
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockedStep: {
    opacity: 0.7,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: SIZES.m,
  },
  stepContent: {
    flex: 1,
    marginRight: SPACING.m,
  },
  stepTitle: {
    fontSize: SIZES.l,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stepTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 5,
    marginRight: SPACING.s,
    marginBottom: SPACING.xs,
  },
  stepTypeText: {
    color: 'white',
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 5,
    marginBottom: SPACING.xs,
  },
  completedText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  scoreText: {
    color: COLORS.success,
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    marginLeft: SPACING.s,
  },
  stepAction: {
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  repeatButton: {
    backgroundColor: COLORS.success,
  },
  lockedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.disabled,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockedMessage: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
    ...SHADOWS.small,
  },
  lockedMessageText: {
    marginLeft: SPACING.xs,
    fontSize: SIZES.xs,
    color: COLORS.text,
    fontWeight: 'bold',
  },
});

export default CategoryDetailScreen; 