import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
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
  WordMatchingScreen: { stepId: number, categoryId: number };
  LearningStep: { stepId: number, categoryId: number };
};

type WordMatchingScreenProps = StackScreenProps<RootStackParamList, 'WordMatchingScreen'>;

const { width, height } = Dimensions.get('window');

const WordMatchingScreen: React.FC<WordMatchingScreenProps> = ({ navigation, route }) => {
  const { stepId, categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Kelime çiftleri
  const [words, setWords] = useState<any[]>([]);
  // Karıştırılmış İngilizce kelimeler
  const [englishWords, setEnglishWords] = useState<any[]>([]);
  // Karıştırılmış Türkçe kelimeler
  const [turkishWords, setTurkishWords] = useState<any[]>([]);
  
  // Seçilen kelimeler
  const [selectedEnglish, setSelectedEnglish] = useState<number | null>(null);
  const [selectedTurkish, setSelectedTurkish] = useState<number | null>(null);
  
  // Eşleştirilen kelimeler
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  
  // Oyun istatistikleri
  const [attempts, setAttempts] = useState<number>(0);
  const [correctMatches, setCorrectMatches] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  
  // Yükleniyor durumu
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<any>(null);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardAnims = useRef<{[key: string]: Animated.Value}>({}).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  
  // Verileri yükle
  useEffect(() => {
    loadGameData();
  }, []);
  
  // Skor değiştiğinde animasyon
  useEffect(() => {
    if (score > 0) {
      Animated.sequence([
        Animated.timing(scoreAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(scoreAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [score]);
  
  // Oyun tamamlandığında
  useEffect(() => {
    if (gameCompleted) {
      saveProgress();
    }
  }, [gameCompleted]);
  
  // Verileri yükle
  const loadGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Adım bilgilerini getir
      const stepsData = await getLearningSteps();
      const selectedStep = stepsData.find((s: any) => s.id === stepId);
      
      if (!selectedStep) {
        throw new Error('Öğrenme adımı bulunamadı');
      }
      
      setStep(selectedStep);
      
      // Kategori kelimelerini getir
      const wordsData = await getWordsByCategory(categoryId);
      
      if (!wordsData || wordsData.length === 0) {
        throw new Error('Bu kategori için kelime bulunamadı');
      }
      
      // Bu adım için kelime sayısını sınırla
      const gameWords = wordsData.slice(0, selectedStep.word_count || 10);
      
      // Oyunu başlat
      initializeGame(gameWords);
    } catch (err: any) {
      console.error('Eşleştirme oyunu veri yükleme hatası:', err);
      setError(err.message || 'Veriler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };
  
  // Oyunu başlat
  const initializeGame = (gameWords: any[]) => {
    setWords(gameWords);
    
    // İngilizce ve Türkçe kelimeleri karıştır
    const shuffledEnglish = [...gameWords].sort(() => Math.random() - 0.5);
    const shuffledTurkish = [...gameWords].sort(() => Math.random() - 0.5);
    
    setEnglishWords(shuffledEnglish);
    setTurkishWords(shuffledTurkish);
    
    // Her kart için animasyon değeri oluştur
    gameWords.forEach((word) => {
      cardAnims[`english_${word.id}`] = new Animated.Value(0);
      cardAnims[`turkish_${word.id}`] = new Animated.Value(0);
    });
    
    // Kart animasyonlarını başlat
    Object.keys(cardAnims).forEach((key, index) => {
      Animated.timing(cardAnims[key], {
        toValue: 1,
        duration: 300,
        delay: 100 + (index * 50),
        useNativeDriver: true
      }).start();
    });
    
    // Başlangıç animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
    
    setLoading(false);
  };
  
  // İngilizce kelime seçimi
  const handleEnglishSelect = (index: number) => {
    // Eğer bu kelime zaten eşleştirilmişse, işlemi iptal et
    if (matchedPairs.includes(englishWords[index].id)) {
      return;
    }
    
    // Hafif titreşim
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedEnglish(index);
    
    // Eğer bir Türkçe kelime seçilmişse, eşleşmeyi kontrol et
    if (selectedTurkish !== null) {
      checkMatch(index, selectedTurkish);
    }
  };
  
  // Türkçe kelime seçimi
  const handleTurkishSelect = (index: number) => {
    // Eğer bu kelime zaten eşleştirilmişse, işlemi iptal et
    if (matchedPairs.includes(turkishWords[index].id)) {
      return;
    }
    
    // Hafif titreşim
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedTurkish(index);
    
    // Eğer bir İngilizce kelime seçilmişse, eşleşmeyi kontrol et
    if (selectedEnglish !== null) {
      checkMatch(selectedEnglish, index);
    }
  };
  
  // Eşleşme kontrolü
  const checkMatch = (englishIndex: number, turkishIndex: number) => {
    // Deneme sayısını artır
    setAttempts(attempts + 1);
    
    // İngilizce ve Türkçe kelimeler aynı mı?
    const isMatch = englishWords[englishIndex].id === turkishWords[turkishIndex].id;
    
    if (isMatch) {
      // Doğru eşleşme
      const matchedWordId = englishWords[englishIndex].id;
      
      // Eşleşen kelimeleri ekle
      setMatchedPairs([...matchedPairs, matchedWordId]);
      
      // Doğru eşleşme sayısını artır
      setCorrectMatches(correctMatches + 1);
      
      // Skoru güncelle
      setScore(score + 10);
      
      // Başarılı eşleşme titreşimi
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Tüm kelimeler eşleştirildi mi?
      if (correctMatches + 1 === words.length) {
        // Oyun tamamlandı
        setGameCompleted(true);
      }
    } else {
      // Yanlış eşleşme
      // Hata titreşimi
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Seçimleri sıfırla
    setTimeout(() => {
      setSelectedEnglish(null);
      setSelectedTurkish(null);
    }, 1000);
  };
  
  // İlerlemeyi kaydet
  const saveProgress = async () => {
    try {
      if (!step) return;
      
      // Kelime ilerlemesini güncelle
      for (const word of words) {
        try {
          await updateWordProgress(word.id, {
            proficiency_level: 3,
            is_mastered: false,
          });
        } catch (error) {
          console.error(`Kelime ilerlemesi güncellenirken hata (ID: ${word.id}):`, error);
        }
      }
      
      // Kategori ilerlemesini güncelle
      try {
        await updateCategoryProgress(categoryId, {
          score: score,
          completed: true,
        });
      } catch (error) {
        console.error('Kategori ilerlemesi güncellenirken hata:', error);
      }
    } catch (error) {
      console.error('İlerleme kaydedilirken hata:', error);
    }
  };
  
  // Oyunu tamamla
  const handleComplete = () => {
    navigation.goBack();
  };
  
  // Geri dön
  const handleBack = () => {
    navigation.goBack();
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
        <TouchableOpacity style={styles.retryButton} onPress={loadGameData}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, { marginTop: SPACING.s, backgroundColor: COLORS.secondary }]}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (gameCompleted) {
    return (
      <View style={styles.completedContainer}>
        <Ionicons name="trophy" size={80} color={COLORS.warning} />
        
        <Text style={styles.completedTitle}>Tebrikler!</Text>
        <Text style={styles.completedText}>
          Tüm kelimeleri başarıyla eşleştirdiniz.
        </Text>
        <Text style={styles.scoreText}>
          Puan: {score} ({attempts} denemede)
        </Text>
        
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleComplete}
        >
          <Text style={styles.completeButtonText}>Tamamla</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Kelime Eşleştirme</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Eşleşmeler:</Text>
          <Animated.Text 
            style={[
              styles.statValue, 
              { transform: [{ scale: scoreAnim }] }
            ]}
          >
            {correctMatches}/{words.length}
          </Animated.Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Puan:</Text>
          <Animated.Text 
            style={[
              styles.statValue, 
              { transform: [{ scale: scoreAnim }] }
            ]}
          >
            {score}
          </Animated.Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.gameContainer}>
          <Text style={styles.sectionTitle}>İngilizce</Text>
          <View style={styles.cardsContainer}>
            {englishWords.map((word, index) => (
              <Animated.View 
                key={`english_${word.id}`}
                style={[
                  styles.cardWrapper,
                  { 
                    opacity: cardAnims[`english_${word.id}`] || 1,
                    transform: [{
                      translateY: cardAnims[`english_${word.id}`]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      }) || 0
                    }]
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    selectedEnglish === index && styles.selectedCard,
                    matchedPairs.includes(word.id) && styles.matchedCard
                  ]}
                  onPress={() => handleEnglishSelect(index)}
                  disabled={matchedPairs.includes(word.id)}
                >
                  <Text 
                    style={[
                      styles.cardText,
                      matchedPairs.includes(word.id) && styles.matchedCardText
                    ]}
                  >
                    {word.english}
                  </Text>
                  
                  {matchedPairs.includes(word.id) && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.matchIcon} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          
          <Text style={styles.sectionTitle}>Türkçe</Text>
          <View style={styles.cardsContainer}>
            {turkishWords.map((word, index) => (
              <Animated.View 
                key={`turkish_${word.id}`}
                style={[
                  styles.cardWrapper,
                  { 
                    opacity: cardAnims[`turkish_${word.id}`] || 1,
                    transform: [{
                      translateY: cardAnims[`turkish_${word.id}`]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      }) || 0
                    }]
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    selectedTurkish === index && styles.selectedCard,
                    matchedPairs.includes(word.id) && styles.matchedCard
                  ]}
                  onPress={() => handleTurkishSelect(index)}
                  disabled={matchedPairs.includes(word.id)}
                >
                  <Text 
                    style={[
                      styles.cardText,
                      matchedPairs.includes(word.id) && styles.matchedCardText
                    ]}
                  >
                    {word.turkish}
                  </Text>
                  
                  {matchedPairs.includes(word.id) && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.matchIcon} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
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
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.s,
  },
  title: {
    fontSize: SIZES.l,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.m,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: SIZES.m,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  statValue: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  gameContainer: {
    padding: SPACING.m,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.l,
  },
  cardWrapper: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: SPACING.s,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.m,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  matchedCard: {
    borderWidth: 2,
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  cardText: {
    fontSize: SIZES.m,
    color: COLORS.text,
    textAlign: 'center',
  },
  matchedCardText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  matchIcon: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
    backgroundColor: COLORS.background,
  },
  completedTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.l,
    marginBottom: SPACING.s,
  },
  completedText: {
    fontSize: SIZES.m,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  scoreText: {
    fontSize: SIZES.l,
    fontWeight: 'bold',
    color: COLORS.warning,
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
    fontSize: SIZES.m,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default WordMatchingScreen; 