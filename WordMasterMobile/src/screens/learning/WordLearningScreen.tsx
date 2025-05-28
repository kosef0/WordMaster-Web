import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { COLORS, SPACING, SHADOWS } from '../../styles/theme';
import { RootState } from '../../store';
import { useLearningProgress } from '../../hooks/useLearningProgress';

// API fonksiyonları
import { 
  getLearningSteps, 
  getWordsByCategory, 
  updateWordProgress,
  updateCategoryProgress,
  updateStepProgress
} from '../../database/api';

// Tip tanımlamaları
type RootStackParamList = {
  WordLearning: { stepId: number, stepType: string };
  LearningStep: { stepId: number, categoryId: number };
};

type WordLearningScreenProps = StackScreenProps<RootStackParamList, 'WordLearning'>;

const { width } = Dimensions.get('window');

const WordLearningScreen: React.FC<WordLearningScreenProps> = ({ navigation, route }) => {
  const { stepId, stepType } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showTurkish, setShowTurkish] = useState<boolean>(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Öğrenme ilerlemesi hook'unu ekleyelim
  const { completeStepAndUnlockNext, loading: progressLoading } = useLearningProgress();

  useEffect(() => {
    loadStepData();
    
    // Temizleme işlevi
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
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
      
      // Kategori kelimelerini getir
      const wordsData = await getWordsByCategory(selectedStep.category);
      
      // Bu adım için kelime sayısını sınırla
      const stepWords = wordsData.slice(0, selectedStep.word_count || 10);
      setWords(stepWords);
      
      setLoading(false);
    } catch (err) {
      setError('Adım verileri yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Kelime öğrenme veri yükleme hatası:', err);
    }
  };

  const handleNext = () => {
    if (currentIndex === words.length - 1) {
      // Son kelimeye ulaşıldı, tamamlandı
      setIsCompleted(true);
      return;
    }
    
    // Animasyon ile sonraki kelimeye geç
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setCurrentIndex(currentIndex + 1);
      setShowTurkish(false);
      
      // Animasyonu sıfırla
      slideAnim.setValue(50);
      
      // Yeni kelimeyi görünür yap
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;
    
    // Animasyon ile önceki kelimeye geç
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setCurrentIndex(currentIndex - 1);
      setShowTurkish(false);
      
      // Animasyonu sıfırla
      slideAnim.setValue(-50);
      
      // Yeni kelimeyi görünür yap
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const handleShowTurkish = () => {
    setShowTurkish(true);
  };

  const handleSpeak = async () => {
    if (!words[currentIndex]) return;
    
    try {
      // Telaffuzu başlat
      Speech.speak(words[currentIndex].english, {
        language: 'en-US',
        rate: 0.8,
        onStart: () => setIsPlaying(true),
        onDone: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch (error) {
      console.error('Ses çalma hatası:', error);
      Alert.alert('Hata', 'Ses çalınırken bir hata oluştu');
    }
  };

  const handleComplete = async () => {
    try {
      console.log(`Kelime öğrenme tamamlandı. ${words.length} kelime için ilerleme kaydediliyor.`);
      
      // Tüm kelimelerin öğrenme durumunu güncelle
      let successCount = 0;
      let errorCount = 0;
      
      for (const word of words) {
        try {
          console.log(`Kelime ilerlemesi güncelleniyor: ID=${word.id}`);
          
          const wordResult = await updateWordProgress(word.id, {
            proficiency_level: 1,
            is_mastered: false,
          });
          
          if (!wordResult || wordResult.success === false) {
            console.warn(`Kelime ilerlemesi güncellenemedi (ID: ${word.id}):`, wordResult);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (wordError) {
          console.error(`Kelime ilerlemesi güncelleme hatası (ID: ${word.id}):`, wordError);
          errorCount++;
        }
      }
      
      if (errorCount > 0) {
        console.warn(`${successCount} kelime başarıyla güncellendi, ${errorCount} kelime güncellenemedi.`);
        Alert.alert('Bilgi', `${successCount} kelime başarıyla kaydedildi, ${errorCount} kelime kaydedilemedi.`);
      } else {
        console.log(`${successCount} kelime başarıyla güncellendi.`);
      }
      
      // Adım tamamlama durumunu güncelle
      if (step) {
        // Custom hook'u kullanarak adımı tamamla ve sonraki adımın kilidini aç
        const stepCompleted = await completeStepAndUnlockNext(
          stepId,
          step.category,
          words.length * 10, // Her kelime için 10 puan
          words.length * 10  // Maksimum puan
        );
        
        if (stepCompleted) {
          // Başarı mesajı göster
          Alert.alert(
            'Tebrikler!',
            'Bu öğrenme adımını başarıyla tamamladınız. Bir sonraki adımın kilidi açıldı.',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
          return; // Alert.alert'ın onPress'i işlem yapacak
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

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        
        <Text style={styles.completedTitle}>Tebrikler!</Text>
        <Text style={styles.completedText}>
          {words.length} yeni kelime öğrendiniz.
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

  // Geçerli kelime
  const currentWord = words[currentIndex];

  if (!currentWord) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kelime bulunamadı</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Başlık ve Geri Butonu */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{step?.name || 'Kelime Öğrenme'}</Text>
      </View>
      
      {/* İlerleme Çubuğu */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / words.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{currentIndex + 1}/{words.length}</Text>
      </View>
      
      {/* Kelime Kartı */}
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        {currentWord.image && (
          <Image 
            source={{ uri: currentWord.image }} 
            style={styles.wordImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.wordContainer}>
          <Text style={styles.englishWord}>{currentWord.english}</Text>
          
          <TouchableOpacity 
            style={styles.speakButton}
            onPress={handleSpeak}
            disabled={isPlaying}
          >
            <Ionicons 
              name={isPlaying ? "volume-high" : "volume-medium-outline"} 
              size={24} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
          
          {currentWord.pronunciation && (
            <Text style={styles.pronunciation}>{currentWord.pronunciation}</Text>
          )}
          
          {!showTurkish ? (
            <TouchableOpacity 
              style={styles.showButton}
              onPress={handleShowTurkish}
            >
              <Text style={styles.showButtonText}>Türkçe Anlamı Göster</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.turkishContainer}>
              <Text style={styles.turkishWord}>{currentWord.turkish}</Text>
              
              {currentWord.definition && (
                <Text style={styles.definition}>{currentWord.definition}</Text>
              )}
              
              {currentWord.example_sentence && (
                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleLabel}>Örnek Cümle:</Text>
                  <Text style={styles.exampleSentence}>{currentWord.example_sentence}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
      
      {/* Navigasyon Butonları */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={currentIndex === 0 ? COLORS.textSecondary : COLORS.primary} 
          />
          <Text 
            style={[
              styles.navButtonText,
              currentIndex === 0 && styles.disabledButtonText
            ]}
          >
            Önceki
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === words.length - 1 ? 'Tamamla' : 'Sonraki'}
          </Text>
          <Ionicons 
            name={currentIndex === words.length - 1 ? "checkmark" : "chevron-forward"} 
            size={24} 
            color="white" 
          />
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginRight: SPACING.s,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
  },
  wordImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: SPACING.m,
  },
  wordContainer: {
    alignItems: 'center',
  },
  englishWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  speakButton: {
    padding: SPACING.s,
  },
  pronunciation: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  showButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    marginTop: SPACING.s,
  },
  showButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  turkishContainer: {
    alignItems: 'center',
    marginTop: SPACING.m,
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
  },
  turkishWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  definition: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  exampleContainer: {
    width: '100%',
    backgroundColor: `${COLORS.primary}10`,
    padding: SPACING.m,
    borderRadius: 8,
    marginTop: SPACING.s,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  exampleSentence: {
    fontSize: 16,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.s,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginRight: SPACING.xs,
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  completedText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  completeButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default WordLearningScreen; 