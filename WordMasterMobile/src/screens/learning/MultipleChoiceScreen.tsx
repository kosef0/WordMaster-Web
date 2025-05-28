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
import * as Haptics from 'expo-haptics';
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
  MultipleChoice: { stepId: number, categoryId: number };
  LearningStep: { stepId: number, categoryId: number };
};

type MultipleChoiceScreenProps = StackScreenProps<RootStackParamList, 'MultipleChoice'>;

const MultipleChoiceScreen: React.FC<MultipleChoiceScreenProps> = ({ navigation, route }) => {
  const { stepId, categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Öğrenme ilerlemesi hook'unu ekleyelim
  const { completeStepAndUnlockNext, loading: progressLoading } = useLearningProgress();

  useEffect(() => {
    loadStepData();
  }, [stepId]);

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      setCurrentWord(words[currentIndex]);
      generateOptions(words, currentIndex);
    }
  }, [currentIndex, words]);

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
      const wordsData = await getWordsByCategory(categoryId);
      
      // Bu adım için kelime sayısını sınırla
      const stepWords = wordsData.slice(0, selectedStep.word_count || 10);
      
      // Kelimeleri karıştır
      const shuffledWords = [...stepWords].sort(() => Math.random() - 0.5);
      setWords(shuffledWords);
      
      if (shuffledWords.length > 0) {
        setCurrentWord(shuffledWords[0]);
        generateOptions(shuffledWords, 0);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Adım verileri yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Çoktan seçmeli veri yükleme hatası:', err);
    }
  };

  const generateOptions = (wordsArray: any[], index: number) => {
    const correctWord = wordsArray[index];
    
    // Doğru cevap dışında 3 rastgele kelime seç
    const otherWords = wordsArray.filter(word => word.id !== correctWord.id);
    const shuffledOtherWords = [...otherWords].sort(() => Math.random() - 0.5);
    const wrongOptions = shuffledOtherWords.slice(0, 3);
    
    // Tüm seçenekleri birleştir ve karıştır
    const allOptions = [correctWord, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setOptions(allOptions);
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionSelect = (index: number) => {
    // Eğer zaten bir seçenek seçiliyse işlem yapma
    if (selectedOption !== null) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedOption(index);
    
    // Seçilen cevabın doğruluğunu kontrol et
    const isAnswerCorrect = options[index].id === currentWord.id;
    setIsCorrect(isAnswerCorrect);
    
    // Skor güncelle
    if (isAnswerCorrect) {
      setScore(score + 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // 1 saniye sonra sonraki soruya geç
    setTimeout(() => {
      goToNextQuestion();
    }, 1500);
  };

  const goToNextQuestion = () => {
    if (currentIndex === words.length - 1) {
      // Son soruya ulaşıldı, tamamlandı
      setIsCompleted(true);
      return;
    }
    
    // Sonraki soruya geç
    setCurrentIndex(currentIndex + 1);
  };

  const handleComplete = async () => {
    try {
      console.log(`Çoktan seçmeli tamamlandı. Kategori ID: ${step?.category}, Skor: ${score}`);
      
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
        
        // Kelime ilerlemesini güncelle
        let successCount = 0;
        let errorCount = 0;
        
        for (const word of words) {
          try {
            console.log(`Kelime ilerlemesi güncelleniyor: ID=${word.id}`);
            
            const wordResult = await updateWordProgress(word.id, {
              proficiency_level: 3, // Çoktan seçmeli tamamlandığında proficiency artar
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

  const handleRetry = () => {
    // Oyunu yeniden başlat
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setIsCompleted(false);
    
    // Kelimeleri karıştır
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
    
    if (shuffledWords.length > 0) {
      setCurrentWord(shuffledWords[0]);
      generateOptions(shuffledWords, 0);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCompleteQuiz = async () => {
    try {
      // Puan hesapla
      const totalQuestions = words.length;
      const correctAnswersCount = Math.floor(score / 10);
      const scorePercentage = Math.round((correctAnswersCount / totalQuestions) * 100);
      
      console.log(`Quiz tamamlandı. Skor: ${correctAnswersCount}/${totalQuestions} (${scorePercentage}%)`);
      
      // İşaretlenen kelimeleri güncelle
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        try {
          await updateWordProgress(word.id, {
            proficiency_level: 2, // Çoktan seçmeli tamamlandığında proficiency artar
            is_mastered: false
          });
        } catch (wordError) {
          console.error(`Kelime ilerlemesi hatası (ID: ${word.id}):`, wordError);
        }
      }
      
      // Adım ilerlemesini güncelle
      if (step) {
        // Custom hook'u kullanarak adımı tamamla ve sonraki adımın kilidini aç
        const stepCompleted = await completeStepAndUnlockNext(
          stepId,
          step.category,
          score, // Alınan puan
          words.length * 10  // Maksimum puan
        );
        
        if (stepCompleted) {
          // Başarı mesajı göster
          Alert.alert(
            'Quiz Tamamlandı!',
            `Puanınız: ${correctAnswersCount}/${totalQuestions}\nBu öğrenme adımını başarıyla tamamladınız. Bir sonraki adımın kilidi açıldı.`,
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
          return; // Alert.alert'ın onPress'i işlem yapacak
        }
      }
      
      // Sonuç ekranına dön
      setIsCompleted(true);
    } catch (error) {
      console.error('Quiz tamamlama hatası:', error);
      Alert.alert('Hata', 'Quiz sonuçları kaydedilirken bir hata oluştu.');
      
      // Hata olsa bile sonuçları göster
      setIsCompleted(true);
    }
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
        <Ionicons name="trophy" size={80} color={COLORS.warning} />
        
        <Text style={styles.completedTitle}>Tebrikler!</Text>
        <Text style={styles.completedText}>
          {words.length} sorudan {Math.floor(score / 10)} tanesini doğru cevapladınız.
        </Text>
        <Text style={styles.scoreText}>Puan: {score}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.retryGameButton]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color={COLORS.text} />
            <Text style={styles.retryGameButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.completeButton]}
            onPress={handleCompleteQuiz}
          >
            <Text style={styles.completeButtonText}>Tamamla</Text>
            <Ionicons name="checkmark" size={20} color="white" />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.title}>Çoktan Seçmeli</Text>
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
      
      {/* Skor */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Puan:</Text>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>
      
      {/* Soru Kartı */}
      {currentWord && (
        <View style={styles.questionCard}>
          {/* Kelime Resmi */}
          {currentWord.image && (
            <Image 
              source={{ uri: currentWord.image }} 
              style={styles.wordImage}
              resizeMode="cover"
            />
          )}
          
          {/* Soru */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>
              "{currentWord.turkish}" kelimesinin İngilizce karşılığı nedir?
            </Text>
          </View>
          
          {/* Seçenekler */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === index && styles.selectedOption,
                  selectedOption === index && isCorrect && styles.correctOption,
                  selectedOption === index && !isCorrect && styles.wrongOption,
                  selectedOption !== null && option.id === currentWord.id && styles.correctOption
                ]}
                onPress={() => handleOptionSelect(index)}
                disabled={selectedOption !== null}
              >
                <Text style={[
                  styles.optionText,
                  selectedOption === index && isCorrect && styles.correctOptionText,
                  selectedOption === index && !isCorrect && styles.wrongOptionText,
                  selectedOption !== null && option.id === currentWord.id && styles.correctOptionText
                ]}>
                  {option.english}
                </Text>
                
                {selectedOption === index && isCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
                )}
                
                {selectedOption === index && !isCorrect && (
                  <Ionicons name="close-circle" size={20} color={COLORS.danger} style={styles.optionIcon} />
                )}
                
                {selectedOption !== null && option.id === currentWord.id && selectedOption !== index && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
    marginBottom: SPACING.s,
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: SPACING.m,
  },
  scoreLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  questionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  wordImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: SPACING.m,
  },
  questionContainer: {
    marginBottom: SPACING.m,
  },
  questionText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  correctOption: {
    borderColor: COLORS.success,
    borderWidth: 2,
    backgroundColor: `${COLORS.success}10`,
  },
  wrongOption: {
    borderColor: COLORS.danger,
    borderWidth: 2,
    backgroundColor: `${COLORS.danger}10`,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  correctOptionText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  wrongOptionText: {
    color: COLORS.danger,
    fontWeight: 'bold',
  },
  optionIcon: {
    marginLeft: SPACING.s,
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
    marginBottom: SPACING.s,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  retryGameButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retryGameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginRight: SPACING.xs,
  },
});

export default MultipleChoiceScreen; 