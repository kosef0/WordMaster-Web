import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchUserProgress, fetchCategoryProgress } from '../store/wordSlice';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from 'react-native-reanimated';

// Tip tanımlamaları
type StatisticsScreenProps = StackScreenProps<RootStackParamList, 'Statistics'>;

interface UserProgressItem {
  word_id: number;
  proficiency_level: number;
  last_reviewed: string;
  is_mastered: boolean;
}

interface CategoryProgressItem {
  category: {
    id: number;
    name: string;
  };
  learned: number;
  total: number;
  percentage: number;
}

const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile } = useSelector((state: RootState) => state.auth);
  const { 
    userProgress, 
    categoryProgress, 
    loading, 
    categories 
  } = useSelector((state: RootState) => state.words);

  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'allTime'>('monthly');
  const [activityData, setActivityData] = useState<{date: string, count: number}[]>([]);
  
  // Ekran genişliğini hesapla
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - (2 * SPACING.l);
  
  // Animasyon değerleri
  const learnedWidthAnim = useSharedValue(0);
  const masteredWidthAnim = useSharedValue(0);
  const expWidthAnim = useSharedValue(0);
  const dailyGoalAnim = useSharedValue(0);
  const weeklyGoalAnim = useSharedValue(0);
  const monthlyGoalAnim = useSharedValue(0);
  
  // Kategori ilerlemesi için animasyon değerleri
  const categoryAnimValues = useMemo(() => {
    if (!categoryProgress) return [];
    return categoryProgress.map(() => useSharedValue(0));
  }, [categoryProgress?.length]);
  
  // Kategori ilerleme çubukları için animasyon stilleri - önceden hesapla
  const categoryProgressStyles = useMemo(() => {
    if (!categoryProgress || !categoryAnimValues.length) return [];
    
    return categoryAnimValues.map((animValue, index) => {
      return useAnimatedStyle(() => {
        return {
          width: `${animValue.value}%`,
          backgroundColor: pieChartData[index]?.color || COLORS.primary
        };
      });
    });
  }, [categoryProgress?.length, categoryAnimValues]);
  
  // İstatistik hesaplamaları
  const totalWords = categories.reduce((sum, cat) => sum + (cat.word_count || 0), 0) || 0;
  const learnedWords = userProgress?.filter((p: UserProgressItem) => p.proficiency_level >= 3).length || 0;
  const masteredWords = userProgress?.filter((p: UserProgressItem) => p.is_mastered).length || 0;
  const toReviewWords = userProgress?.filter((p: UserProgressItem) => p.proficiency_level < 3).length || 0;
  
  // Seviye ilerleme yüzdesi
  const currentLevel = profile?.level || 1;
  const nextLevelExp = currentLevel * 100; // Basit bir hesaplama
  const currentExp = profile?.experience_points || 0;
  const expPercentage = Math.min(100, Math.round((currentExp / nextLevelExp) * 100));
  
  // Kategori dağılımı için pasta grafik verileri
  const pieChartData = useMemo(() => {
    return categoryProgress?.map((cat: CategoryProgressItem, index) => ({
      name: cat.category?.name || `Kategori ${index + 1}`,
      population: cat.learned || 0,
      color: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#8AC54B', '#00A8C6'
      ][index % 8],
      legendFontColor: COLORS.text,
      legendFontSize: 12
    })) || [];
  }, [categoryProgress]);
  
  // Veri yükleme
  useEffect(() => {
    // Kullanıcı ilerlemesini ve kategori ilerlemesini getir
    dispatch(fetchUserProgress());
    dispatch(fetchCategoryProgress());
  }, [dispatch]);
  
  // Aktivite verilerini hesaplama
  useEffect(() => {
    if (userProgress) {
      // Son 7 günlük aktivite
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();
      
      // Her gün için aktivite sayısını hesapla
      const dailyActivity = last7Days.map(day => {
        const count = userProgress.filter((p: UserProgressItem) => 
          p.last_reviewed && p.last_reviewed.split('T')[0] === day
        ).length;
        
        return {
          date: day.split('-')[2] + '/' + day.split('-')[1], // Gün/Ay formatı
          count
        };
      });
      
      setActivityData(dailyActivity);
    }
  }, [userProgress]);

  // Tüm animasyonları başlat
  useEffect(() => {
    if (!loading) {
      // Öğrenilen kelimeler ilerleme çubuğu
      learnedWidthAnim.value = withTiming(
        totalWords > 0 ? (learnedWords / totalWords) * 100 : 0,
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Tam öğrenilen kelimeler ilerleme çubuğu
      masteredWidthAnim.value = withTiming(
        learnedWords > 0 ? (masteredWords / learnedWords) * 100 : 0,
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Seviye ilerleme çubuğu
      expWidthAnim.value = withTiming(
        expPercentage,
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Günlük hedef animasyonu
      dailyGoalAnim.value = withTiming(
        40, // %40 ilerleme
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Haftalık hedef animasyonu
      weeklyGoalAnim.value = withTiming(
        67, // %67 ilerleme
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Aylık hedef animasyonu
      monthlyGoalAnim.value = withTiming(
        78, // %78 ilerleme
        { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
      );
      
      // Kategori animasyonlarını başlat
      if (categoryProgress && categoryAnimValues.length > 0) {
        categoryProgress.forEach((progress, index) => {
          if (index < categoryAnimValues.length) {
            categoryAnimValues[index].value = withTiming(
              progress.percentage,
              { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
            );
          }
        });
      }
    }
  }, [
    loading, 
    learnedWords, 
    masteredWords, 
    expPercentage, 
    totalWords, 
    categoryProgress,
    categoryAnimValues
  ]);

  // Animated stil tanımları
  const learnedWidthAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${learnedWidthAnim.value}%`,
      backgroundColor: COLORS.primary
    };
  });

  const masteredWidthAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${masteredWidthAnim.value}%`,
      backgroundColor: "#FFD700"
    };
  });

  const expWidthAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${expWidthAnim.value}%`
    };
  });

  const dailyGoalAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${dailyGoalAnim.value}%`,
      backgroundColor: COLORS.danger
    };
  });

  const weeklyGoalAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${weeklyGoalAnim.value}%`,
      backgroundColor: COLORS.success
    };
  });

  const monthlyGoalAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${monthlyGoalAnim.value}%`,
      backgroundColor: COLORS.warning
    };
  });
  
  // Yükleniyor ekranı
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gelişim Raporların</Text>
        <View style={styles.timeRangeButtons}>
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              timeRange === 'weekly' && styles.activeTimeButton
            ]}
            onPress={() => setTimeRange('weekly')}
          >
            <Text style={[
              styles.timeButtonText,
              timeRange === 'weekly' && styles.activeTimeButtonText
            ]}>Haftalık</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              timeRange === 'monthly' && styles.activeTimeButton
            ]}
            onPress={() => setTimeRange('monthly')}
          >
            <Text style={[
              styles.timeButtonText,
              timeRange === 'monthly' && styles.activeTimeButtonText
            ]}>Aylık</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              timeRange === 'allTime' && styles.activeTimeButton
            ]}
            onPress={() => setTimeRange('allTime')}
          >
            <Text style={[
              styles.timeButtonText,
              timeRange === 'allTime' && styles.activeTimeButtonText
            ]}>Tüm Zamanlar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Özet Kartları */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="analytics" size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.statValue}>{learnedWords}</Text>
          <Text style={styles.statLabel}>Öğrenilen Kelime</Text>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                learnedWidthAnimStyle
              ]} 
            />
          </View>
          <Text style={styles.statSubtext}>Toplam {totalWords} kelimeden</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={30} color="#FFD700" />
          </View>
          <Text style={styles.statValue}>{masteredWords}</Text>
          <Text style={styles.statLabel}>Tam Öğrenilen</Text>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill, 
                masteredWidthAnimStyle
              ]} 
            />
          </View>
          <Text style={styles.statSubtext}>Öğrenilen {learnedWords} kelimeden</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="sync" size={30} color={COLORS.danger} />
          </View>
          <Text style={styles.statValue}>{toReviewWords}</Text>
          <Text style={styles.statLabel}>Tekrar Edilecek</Text>
          <View style={styles.pillContainer}>
            <View style={[styles.pill, { backgroundColor: COLORS.danger }]} />
            <View style={[styles.pill, { backgroundColor: COLORS.warning }]} />
            <View style={[styles.pill, { backgroundColor: COLORS.success }]} />
          </View>
          <Text style={styles.statSubtext}>Hafızanı tazele!</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="trending-up" size={30} color={COLORS.success} />
          </View>
          <Text style={styles.statValue}>
            {Math.round(activityData.reduce((sum, day) => sum + day.count, 0) / 7)}
          </Text>
          <Text style={styles.statLabel}>Günlük Ortalama</Text>
          <View style={styles.trendBadge}>
            <Ionicons name="arrow-up" size={12} color="#fff" />
            <Text style={styles.trendText}>5%</Text>
          </View>
          <Text style={styles.statSubtext}>Geçen haftaya göre</Text>
        </View>
      </View>

      {/* Seviye ve İlerleme */}
      {profile && (
        <View style={styles.section}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelTitle}>Seviye {profile.level}</Text>
              <Text style={styles.levelSubtext}>Kelime Ustası olmaya doğru ilerliyorsun!</Text>
            </View>
            <View style={styles.expContainer}>
              <View style={styles.expBadge}>
                <Text style={styles.expText}>{profile.experience_points} XP</Text>
              </View>
              <Text style={styles.expSubtext}>{profile.experience_points} / {nextLevelExp} XP</Text>
            </View>
          </View>
          
          <View style={styles.levelProgressContainer}>
            <View style={styles.levelProgressBar}>
              <Animated.View 
                style={[
                  styles.levelProgressFill, 
                  expWidthAnimStyle
                ]}
              >
                <Text style={styles.levelProgressText}>{expPercentage}%</Text>
              </Animated.View>
            </View>
            <View style={styles.levelLabels}>
              <Text style={styles.levelLabel}>Şimdiki seviye</Text>
              <Text style={styles.levelLabel}>Sonraki seviye: {profile.level + 1}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Aktivite Grafiği */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktivite Analizi</Text>
        <Text style={styles.sectionSubtitle}>Son 7 gündeki çalışma performansın</Text>
        
        {activityData.length > 0 && (
          <LineChart
            data={{
              labels: activityData.map(d => d.date),
              datasets: [{
                data: activityData.map(d => d.count)
              }]
            }}
            width={chartWidth}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(81, 92, 230, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: COLORS.primary
              }
            }}
            bezier
            style={{
              marginVertical: SPACING.m,
              borderRadius: SIZES.base,
            }}
        />
        )}
      </View>

      {/* Kategori İlerlemeleri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori İlerlemeleri</Text>
        <Text style={styles.sectionSubtitle}>Hangi kategorilerde ne kadar ilerledin?</Text>
        
        {pieChartData.length > 0 && (
          <PieChart
            data={pieChartData}
            width={chartWidth}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.card,
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
          />
        )}
        
        <View style={styles.categoryListHeader}>
          <Text style={styles.categoryListTitle}>Kategori Detayları</Text>
          <View style={styles.categoryFilterButtons}>
            <TouchableOpacity style={styles.categoryFilterButton}>
              <Text style={styles.categoryFilterText}>Tümü</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.categoryFilterButton, styles.categoryFilterActive]}>
              <Text style={[styles.categoryFilterText, styles.categoryFilterActiveText]}>En Çok İlerlenen</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.categoryScrollContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {categoryProgress?.map((progress, index) => (
            <View 
              key={index} 
              style={[
                styles.categoryCard, 
                { borderLeftWidth: 4, borderLeftColor: pieChartData[index]?.color || COLORS.primary }
              ]}
            >
              <View style={styles.categoryCardHeader}>
                <View style={styles.categoryNameContainer}>
                  <Text style={styles.categoryName}>{progress.category?.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {progress.learned} / {progress.total}
                    </Text>
                  </View>
                </View>
                <View style={[styles.categoryIcon, { backgroundColor: pieChartData[index]?.color || COLORS.primary }]}>
                  <Text style={styles.categoryIconText}>{progress.category?.name?.charAt(0) || '?'}</Text>
                </View>
              </View>
              
              <View style={styles.categoryProgressContainer}>
                <View style={styles.categoryProgressInfo}>
                  <Text style={styles.categoryPercentage}>
                    <Text style={styles.categoryPercentageBold}>{progress.percentage}%</Text> tamamlandı
                  </Text>
                  {progress.percentage >= 75 && (
                    <View style={styles.achievementBadge}>
                      <Ionicons name="trophy" size={12} color="#FFD700" />
                      <Text style={styles.achievementText}>Harika İlerleme</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.categoryProgressBar}>
                  {categoryProgressStyles[index] ? (
                    <Animated.View 
                      style={[
                        styles.categoryProgressFill, 
                        categoryProgressStyles[index]
                      ]} 
                    />
                  ) : (
                    <View 
                      style={[
                        styles.categoryProgressFill, 
                        { 
                          width: `${progress.percentage}%`, 
                          backgroundColor: pieChartData[index]?.color || COLORS.primary 
                        }
                      ]} 
                    />
                  )}
                </View>
              </View>
              
              <View style={styles.categoryActions}>
                <TouchableOpacity 
                  style={[styles.categoryButton, styles.categoryButtonPrimary]}
                >
                  <Ionicons name="book-outline" size={14} color="#fff" style={styles.categoryButtonIcon} />
                  <Text style={styles.categoryButtonPrimaryText}>Kelimelere Git</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.categoryButton}
                >
                  <Ionicons name="stats-chart" size={14} color={COLORS.primary} style={styles.categoryButtonIcon} />
                  <Text style={styles.categoryButtonText}>Detaylı İstatistik</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Öğrenme Hedefleri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Öğrenme Hedefleri</Text>
        <Text style={styles.sectionSubtitle}>İlerlemeni hızlandırmak için tamamlaman gereken görevler</Text>
        
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: COLORS.danger }]}>
              <Ionicons name="flame-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.goalTitle}>Günlük Hedef</Text>
              <Text style={styles.goalSubtext}>10 yeni kelime öğren</Text>
            </View>
          </View>
          <View style={styles.goalProgressBar}>
            <Animated.View 
              style={[
                styles.goalProgressFill, 
                dailyGoalAnimStyle
              ]} 
            />
          </View>
          <View style={styles.goalFooter}>
            <Text style={styles.goalCount}>4/10 kelime</Text>
            <Text style={styles.goalRemaining}>Kalan: 6</Text>
          </View>
        </View>
        
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: COLORS.success }]}>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.goalTitle}>Haftalık Hedef</Text>
              <Text style={styles.goalSubtext}>3 kategori tamamla</Text>
            </View>
          </View>
          <View style={styles.goalProgressBar}>
            <Animated.View 
              style={[
                styles.goalProgressFill, 
                weeklyGoalAnimStyle
              ]} 
            />
          </View>
          <View style={styles.goalFooter}>
            <Text style={styles.goalCount}>2/3 kategori</Text>
            <Text style={styles.goalRemaining}>Kalan: 1</Text>
          </View>
        </View>
        
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIcon, { backgroundColor: COLORS.warning }]}>
              <Ionicons name="star-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.goalTitle}>Aylık Meydan Okuma</Text>
              <Text style={styles.goalSubtext}>500 kelime öğren</Text>
            </View>
          </View>
          <View style={styles.goalProgressBar}>
            <Animated.View 
              style={[
                styles.goalProgressFill, 
                monthlyGoalAnimStyle
              ]} 
            />
          </View>
          <View style={styles.goalFooter}>
            <Text style={styles.goalCount}>390/500 kelime</Text>
            <Text style={styles.goalRemaining}>Kalan: 110</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.l,
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: SPACING.m,
  },
  timeButton: {
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginHorizontal: SPACING.xs,
  },
  activeTimeButton: {
    backgroundColor: COLORS.primary,
  },
  timeButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.s,
  },
  activeTimeButtonText: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: SPACING.m,
  },
  statCard: {
    backgroundColor: COLORS.card,
    width: '48%',
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  iconContainer: {
    marginBottom: SPACING.s,
  },
  statValue: {
    fontSize: SIZES.s,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    width: '100%',
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 2.5,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  statSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  pillContainer: {
    flexDirection: 'row',
    marginVertical: SPACING.s,
  },
  pill: {
    width: 15,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  trendText: {
    color: '#fff',
    fontSize: SIZES.xs,
    marginLeft: 2,
  },
  section: {
    backgroundColor: COLORS.card,
    margin: SPACING.m,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  levelTitle: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  levelSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  expContainer: {
    alignItems: 'flex-end',
  },
  expBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    marginBottom: 2,
  },
  expText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SIZES.s,
  },
  expSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  levelProgressContainer: {
    marginBottom: SPACING.s,
  },
  levelProgressBar: {
    width: '100%',
    height: 25,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.base,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelProgressText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SIZES.s,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  sectionSubtitle: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  chart: {
    marginVertical: SPACING.m,
    borderRadius: SIZES.base,
  },
  categoryListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.l,
    marginBottom: SPACING.s,
  },
  categoryListTitle: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  categoryFilterButtons: {
    flexDirection: 'row',
  },
  categoryFilterButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    marginLeft: SPACING.xs,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryFilterActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryFilterText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  categoryFilterActiveText: {
    color: '#fff',
  },
  categoryScrollContainer: {
    maxHeight: 350,
    marginTop: SPACING.s,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  categoryNameContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingVertical: 2,
    paddingHorizontal: SPACING.s,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
  },
  categoryIconText: {
    color: '#fff',
    fontSize: SIZES.m,
    fontWeight: 'bold',
  },
  categoryProgressContainer: {
    marginBottom: SPACING.s,
  },
  categoryProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryPercentage: {
    fontSize: SIZES.s,
    color: COLORS.textSecondary,
  },
  categoryPercentageBold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: 10,
  },
  achievementText: {
    fontSize: SIZES.xs,
    color: '#FFD700',
    marginLeft: 2,
  },
  categoryProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.s,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: SPACING.s,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginHorizontal: SPACING.xs,
  },
  categoryButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonIcon: {
    marginRight: 4,
  },
  categoryButtonText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  categoryButtonPrimaryText: {
    fontSize: SIZES.xs,
    color: '#fff',
    fontWeight: 'bold',
  },
  categoryProgressItem: {
    marginBottom: SPACING.m,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryCount: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCard: {
    marginBottom: SPACING.m,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  goalTitle: {
    fontSize: SIZES.s,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  goalSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  goalProgressBar: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCount: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  goalRemaining: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default StatisticsScreen; 