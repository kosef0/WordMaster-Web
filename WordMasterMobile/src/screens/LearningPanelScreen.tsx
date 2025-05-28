import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';

// API fonksiyonları
import { 
  getCategories,
  getLearningSteps,
  getUserProfile,
  getUserProgress,
  checkNetworkConnection
} from '../database/api';

// Tip tanımlamaları
type RootStackParamList = {
  LearningPanel: undefined;
  LearningStep: { stepId: number, categoryId: number };
  CategoryDetail: { categoryId: number };
};

// Kategori tipi
interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  difficulty_level: number;
}

// Öğrenme adımı tipi
interface LearningStep {
  id: number;
  name: string;
  description?: string;
  order: number;
  step_type: string;
  category: number;
  completed?: boolean;
  locked?: boolean;
  unlocked?: boolean;
  progress?: any;
}

// Kategori durumu tipi
interface CategoryStatus {
  category: Category;
  is_locked: boolean;
  progress: {
    percentage: number;
    completed: boolean;
  };
  steps: LearningStep[];
}

type LearningPanelScreenProps = StackScreenProps<RootStackParamList, 'LearningPanel'>;

const LearningPanelScreen: React.FC<LearningPanelScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus[]>([]);
  
  // Animasyon değerleri
  const animatedValues = useRef<Animated.Value[]>([]);

  useEffect(() => {
    loadData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  // Animasyonları başlat
  const startAnimations = (length: number) => {
    animatedValues.current = Array(length)
      .fill(0)
      .map(() => new Animated.Value(0));
    
    // Sıralı animasyonlar
    const animations = animatedValues.current.map((value, index) => {
      return Animated.timing(value, {
        toValue: 1,
        duration: 300,
        delay: index * 150,
        useNativeDriver: true,
      });
    });
    
    // Animasyonları başlat
    Animated.stagger(100, animations).start();
  };

  // Kategori kilitli mi kontrolü
  const isUnlocked = (categoryId: number, index: number) => {
    // İlk kategori her zaman açık
    if (index === 0) return true;
    
    // Bir önceki kategorinin tamamlanma durumunu kontrol et
    const previousCategory = categories[index - 1];
    if (!previousCategory) return false;
    
    const previousStatus = categoryStatus.find(s => s.category.id === previousCategory.id);
    return previousStatus?.progress.completed || false;
  };

  // Adım kilitli mi kontrolü - adım seviyesinde kilit kontrolü
  const isStepUnlocked = (step: any, categoryUnlocked: boolean, stepsInCategory: any[], stepIndex: number) => {
    // Eğer kategori kilitliyse, tüm adımlar kilitlidir
    if (!categoryUnlocked) {
      return false;
    }
    
    // İlk adım her zaman açık (kategori açıksa)
    if (stepIndex === 0) {
      return true;
    }
    
    // Açıkça belirtilmiş unlocked değeri varsa onu kullan
    if (step && step.unlocked !== undefined) {
      return step.unlocked;
    }
    
    // Bir önceki adım tamamlanmışsa, bu adım açıktır
    const previousStep = stepsInCategory[stepIndex - 1];
    return previousStep?.completed || false;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ağ bağlantısını kontrol et
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw new Error('İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.');
      }
      
      console.log('Öğrenme verileri yükleniyor...');
      
      // Kullanıcı profili işlemi
      let profile = null;
      if (user && user.id) {
        try {
          profile = await getUserProfile(user.id);
          if (profile && profile.id) {
            console.log('Kullanıcı profili yüklendi:', profile.id);
          } else {
            console.log('Kullanıcı profili yüklendi (ID yok)');
          }
        } catch (profileError) {
          console.error('Kullanıcı profili yüklenemedi:', profileError);
          // Profil hatası kritik değil, devam et
        }
      } else {
        console.warn('Kullanıcı bilgisi bulunamadı, profil yüklenemedi');
      }
      
      // Kategorileri getir
      let categoriesData: Category[] = [];
      try {
        categoriesData = await getCategories();
        console.log(`${categoriesData.length} kategori yüklendi`);
        setCategories(categoriesData);
      } catch (categoryError) {
        console.error('Kategori verileri alınamadı:', categoryError);
        setCategories([]);
        setError('Kategoriler yüklenemedi. Lütfen tekrar deneyin.');
        setLoading(false);
        return; // Kritik hata, işlemi sonlandır
      }
      
      // Adımları getir
      let stepsData: LearningStep[] = [];
      try {
        stepsData = await getLearningSteps();
        console.log(`${stepsData.length} öğrenme adımı yüklendi`);
      } catch (stepError) {
        console.error('Öğrenme adımları alınamadı:', stepError);
        stepsData = [];
        setError('Öğrenme adımları yüklenemedi. Lütfen tekrar deneyin.');
        setLoading(false);
        return; // Kritik hata, işlemi sonlandır
      }
      
      // Kullanıcı ilerlemesini getir
      let progressData: any = {
        categories: [],
        steps: [],
        words: []
      };
      
      try {
        progressData = await getUserProgress();
        console.log('Kullanıcı ilerlemesi yüklendi');
        
        // Adım ilerlemelerini konsola yazdır (debug için)
        if (progressData && progressData.steps && progressData.steps.length > 0) {
          console.log('Adım ilerlemeleri:');
          progressData.steps.forEach((step: any) => {
            console.log(`Adım ID: ${step.step}, Tamamlandı: ${step.completed}, Kilit: ${step.unlocked !== false ? 'Açık' : 'Kilitli'}`);
          });
        } else {
          console.log('Hiç adım ilerlemesi bulunamadı.');
        }
      } catch (progressError) {
        console.error('Kullanıcı ilerlemesi alınamadı:', progressError);
        // İlerleme verileri kritik değil, varsayılan veri yapısı kullan
      }
      
      // Kategori durumlarını oluştur
      const categoryStatusData: CategoryStatus[] = categoriesData.map((category, index) => {
        try {
          // Kategori için adımları bul
          const categorySteps = stepsData.filter(step => step.category === category.id);
          
          // Kategori için ilerleme durumunu bul
          const categoryProgress = progressData.categories?.find(
            (c: any) => {
              if (!c) return false;
              return c.category === category.id || c.category_id === category.id;
            }
          );
          
          // Kategori kilit durumunu belirle
          const isCategoryUnlocked = isUnlocked(category.id, index);
          
          // Adım ilerlemelerinin önişlemi
          const preparedSteps = categorySteps.map((step, idx) => {
            if (!progressData.steps) return { ...step, completed: false, locked: !isCategoryUnlocked };
            
            const stepProgress = progressData.steps.find((s: any) => {
              if (!s) return false;
              
              // Adım ID'lerini kontrol ederken farklı format olasılıklarını ele al
              const stepId = s.step && typeof s.step === 'object' ? s.step.id : s.step;
              return stepId === step.id;
            });
            
            return {
              ...step,
              progress: stepProgress,
              unlocked: stepProgress?.unlocked,
              completed: stepProgress?.completed || false
            };
          });
          
          // Adımların tamamlanma durumunu ve kilit durumunu hesapla
          const stepsWithProgress = preparedSteps.map((step, stepIndex) => {
            // İlk adım için veya açıkça "unlocked" olarak işaretlenmiş adım için
            if (stepIndex === 0 || step.unlocked === true) {
              return {
                ...step,
                locked: !isCategoryUnlocked // Kategori kilitliyse bu adım da kilitlidir
              };
            }
            
            // Açıkça kilitli olarak işaretlenmiş
            if (step.unlocked === false) {
              return {
                ...step,
                locked: true
              };
            }
            
            // Önceki adımın tamamlanma durumuna göre kilidi belirle
            const previousStep = preparedSteps[stepIndex - 1];
            const isStepLocked = !previousStep.completed;
            
            return {
              ...step,
              locked: isStepLocked
            };
          });
          
          // Tamamlanan adımların sayısını hesapla
          const completedSteps = stepsWithProgress.filter(step => step.completed).length;
          
          // İlerleme yüzdesini hesapla
          const progressPercentage = categorySteps.length > 0
            ? (completedSteps / categorySteps.length) * 100
            : 0;
          
          // Kategori durumunu oluştur
          return {
            category,
            is_locked: !isCategoryUnlocked,
            progress: {
              percentage: progressPercentage,
              completed: categoryProgress?.completed || false
            },
            steps: stepsWithProgress
          };
        } catch (err) {
          console.error(`Kategori durumu oluşturulurken hata (ID: ${category.id}):`, err);
          // Hata durumunda varsayılan kategori durumu döndür
          return {
            category,
            is_locked: index !== 0, // İlk kategori her zaman açık
            progress: {
              percentage: 0,
              completed: false
            },
            steps: []
          };
        }
      });
      
      setCategoryStatus(categoryStatusData);
      
      // Animasyonları başlat
      startAnimations(categoryStatusData.length);
      
      setLoading(false);
      console.log('Öğrenme verileri başarıyla yüklendi');
    } catch (error: any) {
      console.error('Öğrenme verileri yüklenirken hata oluştu:', error);
      setError(error.message || 'Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: number, unlocked: boolean) => {
    if (!unlocked) {
      Alert.alert('Kilitli Kategori', 'Bu kategoriyi açmak için önceki kategoriyi tamamlamalısınız.');
      return;
    }
    
    // Kategoriye ait adımları bul
    const status = categoryStatus.find(s => s.category.id === categoryId);
    if (!status || !status.steps || status.steps.length === 0) {
      Alert.alert('Hata', 'Bu kategoride henüz öğrenme adımı bulunmamaktadır.');
      return;
    }
    
    // İlk adımı veya tamamlanmamış ilk adımı bul
    const firstIncompleteStep = status.steps.find(step => !step.completed);
    const targetStep = firstIncompleteStep || status.steps[0];
    
    console.log(`Kategori seçildi: ${categoryId}, Adım: ${targetStep.id}`);
    
    // Adım ekranına yönlendir
    navigation.navigate('LearningStep', { 
      stepId: targetStep.id,
      categoryId: categoryId
    });
  };

  const calculateProgress = (categoryId: number) => {
    const status = categoryStatus.find(s => s.category.id === categoryId);
    return status?.progress.percentage || 0;
  };

  const isCompleted = (categoryId: number) => {
    const status = categoryStatus.find(s => s.category.id === categoryId);
    return status?.progress.completed || false;
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
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Kategori yoksa boş durum göster
  if (categoryStatus.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Öğrenme Paneli</Text>
          <Text style={styles.headerSubtitle}>
            Kategorileri sırayla tamamlayarak İngilizce kelime hazineni geliştir
          </Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color={COLORS.disabled} />
          <Text style={styles.emptyText}>Henüz hiç kategori bulunmuyor.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Öğrenme Paneli</Text>
        <Text style={styles.headerSubtitle}>
          Kategorileri sırayla tamamlayarak İngilizce kelime hazineni geliştir
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.pathContainer}>
          <Text style={styles.pathTitle}>İngilizce Öğrenme Yolu</Text>
          <Text style={styles.pathDescription}>
            Her kategoriyi adım adım tamamlayarak ilerle ve diğer kategorilerin kilidini aç
          </Text>
          
          <View style={styles.modulesPath}>
            {categoryStatus.map((status, index) => (
              <Animated.View 
                key={status.category.id}
                style={[
                  styles.moduleWrapper,
                  {
                    opacity: animatedValues.current[index] || 0,
                    transform: [{
                      translateY: animatedValues.current[index]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      }) || 0
                    }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={[
                    styles.moduleCard,
                    status.is_locked && styles.lockedModule
                  ]}
                  onPress={() => handleCategoryPress(status.category.id, !status.is_locked)}
                  activeOpacity={0.8}
                  disabled={status.is_locked}
                >
                  <View style={[
                    styles.moduleIcon,
                    status.is_locked && styles.lockedIcon,
                    status.progress.completed && styles.completedIcon
                  ]}>
                    {status.is_locked ? (
                      <Ionicons name="lock-closed" size={24} color="white" />
                    ) : status.progress.completed ? (
                      <Ionicons name="checkmark" size={24} color="white" />
                    ) : (
                      <Ionicons name="book" size={24} color="white" />
                    )}
                  </View>
                  
                  <View style={styles.moduleContent}>
                    <View style={[
                      styles.moduleStatus,
                      status.is_locked && styles.lockedStatus,
                      status.progress.completed && styles.completedStatus
                    ]}>
                      {status.is_locked ? (
                        <>
                          <Ionicons name="lock-closed" size={14} color="white" />
                          <Text style={styles.statusText}>Kilitli</Text>
                        </>
                      ) : status.progress.completed ? (
                        <>
                          <Ionicons name="checkmark" size={14} color="white" />
                          <Text style={styles.statusText}>Tamamlandı</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="play" size={14} color="white" />
                          <Text style={styles.statusText}>Devam Ediyor</Text>
                        </>
                      )}
                    </View>
                    
                    <Text style={styles.moduleTitle}>
                      {status.category.name}
                    </Text>
                    
                    <Text style={styles.moduleDescription}>
                      {status.category.description || "Bu kategori için henüz açıklama yok."}
                    </Text>
                    
                    {!status.is_locked && (
                      <>
                        <View style={styles.moduleProgress}>
                          <View 
                            style={[
                              styles.moduleProgressBar, 
                              { width: `${status.progress.percentage}%` }
                            ]} 
                          />
                        </View>
                        
                        <Text style={styles.lessonsTitle}>Öğrenme Adımları</Text>
                        <View style={styles.lessonsGrid}>
                          {status.steps.map((step, stepIndex) => (
                            <TouchableOpacity 
                              key={step.id}
                              style={[
                                styles.lessonItem,
                                step.locked && styles.lockedLesson,
                                step.completed && styles.completedLesson
                              ]}
                              onPress={() => {
                                if (!step.locked) {
                                  navigation.navigate('LearningStep', { 
                                    stepId: step.id,
                                    categoryId: status.category.id
                                  });
                                } else {
                                  Alert.alert('Kilitli Adım', 'Bu adımı açmak için önceki adımları tamamlamalısınız.');
                                }
                              }}
                              disabled={step.locked}
                            >
                              {step.locked ? (
                                <Ionicons name="lock-closed" size={16} color={COLORS.disabled} />
                              ) : step.completed ? (
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                              ) : (
                                <Text style={styles.lessonNumber}>{stepIndex + 1}</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  emptyText: {
    marginTop: SPACING.m,
    marginBottom: SPACING.l,
    color: COLORS.textSecondary,
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
    padding: SPACING.l,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: SIZES.s,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.m,
    paddingBottom: SPACING.xxl,
  },
  pathContainer: {
    marginBottom: SPACING.m,
  },
  pathTitle: {
    fontSize: SIZES.l,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  pathDescription: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  modulesPath: {
    marginTop: SPACING.s,
  },
  moduleWrapper: {
    marginBottom: SPACING.m,
  },
  moduleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  lockedModule: {
    opacity: 0.7,
  },
  moduleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: SPACING.m,
    left: SPACING.m,
    ...SHADOWS.small,
  },
  lockedIcon: {
    backgroundColor: COLORS.disabled,
  },
  completedIcon: {
    backgroundColor: COLORS.success,
  },
  moduleContent: {
    padding: SPACING.m,
    paddingLeft: 70, // Icon genişliği + padding
  },
  moduleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginBottom: SPACING.s,
  },
  lockedStatus: {
    backgroundColor: COLORS.disabled,
  },
  completedStatus: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    color: 'white',
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  moduleTitle: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  moduleDescription: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  moduleProgress: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: SPACING.m,
    overflow: 'hidden',
  },
  moduleProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  lessonsTitle: {
    fontSize: SIZES.s,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  lessonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  lessonItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.xs,
    ...SHADOWS.small,
  },
  lockedLesson: {
    backgroundColor: COLORS.disabled + '40',
  },
  completedLesson: {
    backgroundColor: COLORS.success + '20',
  },
  lessonNumber: {
    fontSize: SIZES.s,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default LearningPanelScreen; 