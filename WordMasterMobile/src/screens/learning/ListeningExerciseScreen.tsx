import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
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
  ListeningExercise: { stepId: number };
  LearningStep: { stepId: number, categoryId: number };
};

type ListeningExerciseScreenProps = StackScreenProps<RootStackParamList, 'ListeningExercise'>;

const ListeningExerciseScreen: React.FC<ListeningExerciseScreenProps> = ({ navigation, route }) => {
  const { stepId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [showImage, setShowImage] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    loadStepData();
  }, [stepId]);

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      setCurrentWord(words[currentIndex]);
      resetInputState();
    }
    
    return () => {
      // Konuşma işlemini durdur
      Speech.stop();
    };
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
      const wordsData = await getWordsByCategory(selectedStep.category);
      
      // Bu adım için kelime sayısını sınırla
      const stepWords = wordsData.slice(0, selectedStep.word_count || 10);
      
      // Kelimeleri karıştır
      const shuffledWords = [...stepWords].sort(() => Math.random() - 0.5);
      setWords(shuffledWords);
      
      setLoading(false);
    } catch (err) {
      setError('Adım verileri yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Dinleme alıştırması veri yükleme hatası:', err);
    }
  };

  const resetInputState = () => {
    setUserInput('');
    setIsCorrect(null);
    setShowAnswer(false);
    setShowImage(false);
    setAttempts(0);
  };

  const handleSpeakWord = () => {
    if (!currentWord || isSpeaking) return;
    
    setIsSpeaking(true);
    
    Speech.speak(currentWord.english, {
      language: 'en-US',
      rate: 0.8,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleCheckAnswer = () => {
    // Cevabı kontrol et
    const normalizedUserInput = userInput.trim().toLowerCase();
    const normalizedAnswer = currentWord.english.trim().toLowerCase();
    
    // Doğruluk kontrolü
    const correct = normalizedUserInput === normalizedAnswer;
    setIsCorrect(correct);
    setAttempts(attempts + 1);
    
    // Haptic feedback
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(score + 10);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setShowImage(true);
    // Gösterilen cevap için puan düşürme
    setScore(Math.max(0, score - 5));
  };

  const handleNextWord = () => {
    if (currentIndex === words.length - 1) {
      // Son kelimeye ulaşıldı, tamamlandı
      setIsCompleted(true);
      return;
    }
    
    // Sonraki kelimeye geç
    setCurrentIndex(currentIndex + 1);
  };

  const handleComplete = async () => {
    try {
      // Adım tamamlama durumunu güncelle
      if (step) {
        await updateCategoryProgress(step.category, {
          score: score,
          completed: true,
        });
        
        // Kelime ilerlemesini güncelle
        for (const word of words) {
          await updateWordProgress(word.id, {
            proficiency_level: 5, // Dinleme alıştırması tamamlandığında proficiency artar
            is_mastered: false,
          });
        }
      }
      
      // Adım ekranına dön
      navigation.goBack();
    } catch (error) {
      console.error('İlerleme güncelleme hatası:', error);
      Alert.alert('Hata', 'İlerleme kaydedilirken bir hata oluştu');
    }
  };

  const handleRetry = () => {
    // Oyunu yeniden başlat
    setCurrentIndex(0);
    setScore(0);
    setIsCompleted(false);
    resetInputState();
    
    // Kelimeleri karıştır
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
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
        <Ionicons name="trophy" size={80} color={COLORS.warning} />
        
        <Text style={styles.completedTitle}>Tebrikler!</Text>
        <Text style={styles.completedText}>
          {words.length} dinleme alıştırmasını tamamladınız.
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
            onPress={handleComplete}
          >
            <Text style={styles.completeButtonText}>Tamamla</Text>
            <Ionicons name="checkmark" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Başlık ve Geri Butonu */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dinleme Alıştırması</Text>
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
        
        {/* Alıştırma Kartı */}
        {currentWord && (
          <View style={styles.exerciseCard}>
            {/* Dinleme Butonu */}
            <View style={styles.speakButtonContainer}>
              <TouchableOpacity 
                style={styles.speakButton}
                onPress={handleSpeakWord}
                disabled={isSpeaking}
              >
                <Ionicons 
                  name={isSpeaking ? "volume-high" : "volume-medium-outline"} 
                  size={48} 
                  color={COLORS.primary} 
                />
              </TouchableOpacity>
              <Text style={styles.speakInstructions}>
                Butona tıklayarak kelimeyi dinleyin
              </Text>
            </View>
            
            {/* Kelime Resmi (cevap gösterildiğinde) */}
            {showImage && currentWord.image && (
              <Image 
                source={{ uri: currentWord.image }} 
                style={styles.wordImage}
                resizeMode="cover"
              />
            )}
            
            {/* Giriş Alanı */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duyduğunuz kelimeyi yazın:</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isCorrect === true && styles.correctInput,
                  isCorrect === false && styles.wrongInput,
                ]}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="Cevabınızı buraya yazın"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={isCorrect !== true && !showAnswer}
              />
            </View>
            
            {/* Sonuç Gösterimi */}
            {isCorrect === true && (
              <View style={styles.resultContainer}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.correctText}>Doğru!</Text>
              </View>
            )}
            
            {isCorrect === false && !showAnswer && (
              <View style={styles.resultContainer}>
                <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                <Text style={styles.wrongText}>Yanlış. Tekrar deneyin veya cevabı görün.</Text>
              </View>
            )}
            
            {showAnswer && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerLabel}>Doğru Cevap:</Text>
                <Text style={styles.answerText}>{currentWord.english}</Text>
                <Text style={styles.answerTranslation}>
                  Türkçe: {currentWord.turkish}
                </Text>
              </View>
            )}
            
            {/* Aksiyon Butonları */}
            <View style={styles.actionContainer}>
              {!isCorrect && !showAnswer && (
                <TouchableOpacity 
                  style={styles.checkButton}
                  onPress={handleCheckAnswer}
                  disabled={userInput.trim() === ''}
                >
                  <Text style={styles.checkButtonText}>Kontrol Et</Text>
                </TouchableOpacity>
              )}
              
              {isCorrect === false && attempts >= 2 && !showAnswer && (
                <TouchableOpacity 
                  style={styles.showAnswerButton}
                  onPress={handleShowAnswer}
                >
                  <Text style={styles.showAnswerButtonText}>Cevabı Göster (-5 puan)</Text>
                </TouchableOpacity>
              )}
              
              {(isCorrect === true || showAnswer) && (
                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={handleNextWord}
                >
                  <Text style={styles.nextButtonText}>
                    {currentIndex === words.length - 1 ? 'Tamamla' : 'Sonraki'}
                  </Text>
                  <Ionicons 
                    name={currentIndex === words.length - 1 ? "checkmark" : "chevron-forward"} 
                    size={20} 
                    color="white" 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
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
  exerciseCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  speakButtonContainer: {
    alignItems: 'center',
    marginVertical: SPACING.l,
  },
  speakButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  speakInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  wordImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: SPACING.m,
  },
  inputContainer: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.m,
    fontSize: 16,
    color: COLORS.text,
  },
  correctInput: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}10`,
  },
  wrongInput: {
    borderColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}10`,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  correctText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginLeft: SPACING.s,
  },
  wrongText: {
    fontSize: 16,
    color: COLORS.danger,
    marginLeft: SPACING.s,
  },
  answerContainer: {
    backgroundColor: `${COLORS.primary}10`,
    padding: SPACING.m,
    borderRadius: 8,
    marginBottom: SPACING.m,
  },
  answerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  answerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  answerTranslation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  showAnswerButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: SPACING.s,
    alignItems: 'center',
    marginTop: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  showAnswerButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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

export default ListeningExerciseScreen; 