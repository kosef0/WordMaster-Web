import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  FlatList
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
  FinalQuiz: { stepId: number, categoryId: number };
  LearningStep: { stepId: number, categoryId: number };
};

type FinalQuizScreenProps = StackScreenProps<RootStackParamList, 'FinalQuiz'>;

// Soru tipi
interface Question {
  id: number;
  type: 'multiple' | 'truefalse' | 'match';
  word: any;
  options?: any[];
  answer?: boolean;
  answered: boolean;
  isCorrect: boolean | null;
  userAnswer: any;
}

const FinalQuizScreen: React.FC<FinalQuizScreenProps> = ({ navigation, route }) => {
  const { stepId, categoryId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [step, setStep] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);

  useEffect(() => {
    loadStepData();
  }, [stepId]);

  useEffect(() => {
    if (quizStarted && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (quizStarted && timeRemaining === 0) {
      // Süre bitti, quiz'i tamamla
      handleCompleteQuiz();
    }
  }, [timeRemaining, quizStarted]);

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
      
      setWords(stepWords);
      
      // Soruları oluştur
      generateQuestions(stepWords);
      
      // Quiz süresi (dakika cinsinden)
      const quizDuration = 5; // 5 dakika
      setTimeRemaining(quizDuration * 60);
      
      setLoading(false);
    } catch (err) {
      setError('Adım verileri yüklenirken bir hata oluştu');
      setLoading(false);
      console.error('Final Quiz veri yükleme hatası:', err);
    }
  };

  const generateQuestions = (wordsArray: any[]) => {
    const shuffledWords = [...wordsArray].sort(() => Math.random() - 0.5);
    
    const quizQuestions: Question[] = [];
    
    // Çoktan seçmeli sorular
    for (let i = 0; i < Math.min(5, shuffledWords.length); i++) {
      const word = shuffledWords[i];
      
      // Diğer kelimelerden rastgele 3 seçenek oluştur
      const otherWords = shuffledWords.filter(w => w.id !== word.id);
      const options = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => ({ id: w.id, text: w.english }));
      
      // Doğru cevabı ekle ve karıştır
      options.push({ id: word.id, text: word.english });
      options.sort(() => Math.random() - 0.5);
      
      quizQuestions.push({
        id: i + 1,
        type: 'multiple',
        word: word,
        options: options,
        answered: false,
        isCorrect: null,
        userAnswer: null
      });
    }
    
    // Doğru/Yanlış soruları
    for (let i = 5; i < Math.min(10, shuffledWords.length); i++) {
      const word = shuffledWords[i];
      
      // Rastgele doğru veya yanlış bir cevap oluştur
      const isCorrectAnswer = Math.random() > 0.5;
      
      // Yanlış cevap için başka bir kelime seç
      let translationText = word.turkish;
      if (!isCorrectAnswer) {
        const otherWord = shuffledWords.filter(w => w.id !== word.id)[0];
        translationText = otherWord.turkish;
      }
      
      quizQuestions.push({
        id: i + 1,
        type: 'truefalse',
        word: { ...word, displayTranslation: translationText },
        answer: isCorrectAnswer,
        answered: false,
        isCorrect: null,
        userAnswer: null
      });
    }
    
    setQuestions(quizQuestions);
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswer = (answer: any) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentQuestion = questions[currentQuestionIndex];
    let isCorrect = false;
    
    // Cevabın doğruluğunu kontrol et
    if (currentQuestion.type === 'multiple') {
      isCorrect = answer.id === currentQuestion.word.id;
    } else if (currentQuestion.type === 'truefalse') {
      isCorrect = answer === currentQuestion.answer;
    }
    
    // Skor güncelle
    if (isCorrect) {
      setScore(score + 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Soruyu güncelle
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      answered: true,
      isCorrect: isCorrect,
      userAnswer: answer
    };
    setQuestions(updatedQuestions);
    
    // 1 saniye sonra sonraki soruya geç
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleCompleteQuiz();
      }
    }, 1000);
  };

  const handleCompleteQuiz = () => {
    setIsCompleted(true);
    
    // Tüm cevapları kontrol et
    let totalCorrect = 0;
    questions.forEach(q => {
      if (q.isCorrect) {
        totalCorrect++;
      }
    });
    
    // Kullanıcının skorunu hesapla
    const finalScore = totalCorrect * 10;
    setScore(finalScore);
  };

  const handleFinishQuiz = async () => {
    try {
      // Adım tamamlama durumunu güncelle
      if (step) {
        console.log(`Final Quiz tamamlandı. Kategori ID: ${step.category}, Skor: ${score}`);
        
        try {
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
            // Doğru cevaplanan kelimeleri ustalık seviyesine çıkar
            const questionForWord = questions.find(q => q.word.id === word.id);
            const isMastered = questionForWord?.isCorrect || false;
            
            console.log(`Kelime ilerlemesi güncelleniyor: ID=${word.id}, Ustalık: ${isMastered ? 'Evet' : 'Hayır'}`);
            
            const wordResult = await updateWordProgress(word.id, {
              proficiency_level: 5,
              is_mastered: isMastered,
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
      
      // Hata olsa bile kullanıcıyı geri gönder
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const renderMultipleChoiceQuestion = (question: Question) => {
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          "{question.word.turkish}" kelimesinin İngilizce karşılığı nedir?
        </Text>
        
        <View style={styles.optionsContainer}>
          {question.options?.map((option, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.optionButton,
                question.answered && question.userAnswer?.id === option.id && question.isCorrect && styles.correctOption,
                question.answered && question.userAnswer?.id === option.id && !question.isCorrect && styles.wrongOption,
                question.answered && !question.isCorrect && option.id === question.word.id && styles.correctOption
              ]}
              onPress={() => handleAnswer(option)}
              disabled={question.answered}
            >
              <Text style={[
                styles.optionText,
                question.answered && question.userAnswer?.id === option.id && question.isCorrect && styles.correctOptionText,
                question.answered && question.userAnswer?.id === option.id && !question.isCorrect && styles.wrongOptionText,
                question.answered && !question.isCorrect && option.id === question.word.id && styles.correctOptionText
              ]}>
                {option.text}
              </Text>
              
              {question.answered && question.userAnswer?.id === option.id && question.isCorrect && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
              )}
              
              {question.answered && question.userAnswer?.id === option.id && !question.isCorrect && (
                <Ionicons name="close-circle" size={20} color={COLORS.danger} style={styles.optionIcon} />
              )}
              
              {question.answered && !question.isCorrect && option.id === question.word.id && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTrueFalseQuestion = (question: Question) => {
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>
          "{question.word.english}" kelimesinin Türkçe karşılığı "{question.word.displayTranslation}" midir?
        </Text>
        
        <View style={styles.trueFalseContainer}>
          <TouchableOpacity 
            style={[
              styles.trueFalseButton,
              question.answered && question.userAnswer === true && question.isCorrect && styles.correctOption,
              question.answered && question.userAnswer === true && !question.isCorrect && styles.wrongOption,
              question.answered && !question.isCorrect && question.answer === true && styles.correctOption
            ]}
            onPress={() => handleAnswer(true)}
            disabled={question.answered}
          >
            <Text style={[
              styles.trueFalseText,
              question.answered && question.userAnswer === true && question.isCorrect && styles.correctOptionText,
              question.answered && question.userAnswer === true && !question.isCorrect && styles.wrongOptionText,
              question.answered && !question.isCorrect && question.answer === true && styles.correctOptionText
            ]}>
              Doğru
            </Text>
            
            {question.answered && question.userAnswer === true && question.isCorrect && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
            )}
            
            {question.answered && question.userAnswer === true && !question.isCorrect && (
              <Ionicons name="close-circle" size={20} color={COLORS.danger} style={styles.optionIcon} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.trueFalseButton,
              question.answered && question.userAnswer === false && question.isCorrect && styles.correctOption,
              question.answered && question.userAnswer === false && !question.isCorrect && styles.wrongOption,
              question.answered && !question.isCorrect && question.answer === false && styles.correctOption
            ]}
            onPress={() => handleAnswer(false)}
            disabled={question.answered}
          >
            <Text style={[
              styles.trueFalseText,
              question.answered && question.userAnswer === false && question.isCorrect && styles.correctOptionText,
              question.answered && question.userAnswer === false && !question.isCorrect && styles.wrongOptionText,
              question.answered && !question.isCorrect && question.answer === false && styles.correctOptionText
            ]}>
              Yanlış
            </Text>
            
            {question.answered && question.userAnswer === false && question.isCorrect && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.optionIcon} />
            )}
            
            {question.answered && question.userAnswer === false && !question.isCorrect && (
              <Ionicons name="close-circle" size={20} color={COLORS.danger} style={styles.optionIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
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

  if (!quizStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Final Quiz</Text>
        </View>
        
        <View style={styles.startContainer}>
          <Ionicons name="trophy" size={80} color={COLORS.warning} />
          
          <Text style={styles.startTitle}>
            Final Quizine Hoş Geldiniz!
          </Text>
          
          <Text style={styles.startDescription}>
            Bu quiz, öğrendiğiniz kelimeleri ne kadar iyi hatırladığınızı test edecek.
            {'\n\n'}
            Quiz {questions.length} sorudan oluşmaktadır ve {formatTime(timeRemaining)} süreniz var.
          </Text>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartQuiz}
          >
            <Text style={styles.startButtonText}>Başlat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isCompleted) {
    // Doğru cevapların sayısını hesapla
    const correctCount = questions.filter(q => q.isCorrect).length;
    const percentage = (correctCount / questions.length) * 100;
    
    return (
      <View style={styles.completedContainer}>
        <Ionicons 
          name={percentage >= 70 ? "trophy" : "ribbon-outline"} 
          size={80} 
          color={percentage >= 70 ? COLORS.warning : COLORS.secondary} 
        />
        
        <Text style={styles.completedTitle}>
          {percentage >= 70 ? 'Tebrikler!' : 'Quiz Tamamlandı'}
        </Text>
        
        <Text style={styles.completedText}>
          {questions.length} sorudan {correctCount} tanesini doğru cevapladınız.
        </Text>
        
        <Text style={styles.scoreText}>
          Skor: {score} ({Math.round(percentage)}%)
        </Text>
        
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Sonuçlar:</Text>
          
          {questions.map((question, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultIcon}>
                <Ionicons 
                  name={question.isCorrect ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color={question.isCorrect ? COLORS.success : COLORS.danger} 
                />
              </View>
              
              <View style={styles.resultContent}>
                <Text style={styles.resultQuestion}>
                  {question.type === 'multiple' 
                    ? `"${question.word.turkish}" kelimesinin İngilizce karşılığı?` 
                    : `"${question.word.english}" = "${question.word.displayTranslation}" mi?`}
                </Text>
                
                <Text style={[
                  styles.resultAnswer,
                  question.isCorrect ? styles.correctText : styles.wrongText
                ]}>
                  {question.type === 'multiple' 
                    ? `Cevabınız: ${question.userAnswer?.text || '-'} (Doğru: ${question.word.english})` 
                    : `Cevabınız: ${question.userAnswer ? 'Doğru' : 'Yanlış'} (Doğru: ${question.answer ? 'Doğru' : 'Yanlış'})`}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.finishButton}
          onPress={handleFinishQuiz}
        >
          <Text style={styles.finishButtonText}>Tamamla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Final Quiz</Text>
      </View>
      
      <View style={styles.quizInfoContainer}>
        <View style={styles.questionInfo}>
          <Text style={styles.questionInfoText}>
            Soru {currentQuestionIndex + 1}/{questions.length}
          </Text>
        </View>
        
        <View style={styles.timeInfo}>
          <Ionicons name="time-outline" size={20} color={COLORS.warning} />
          <Text style={styles.timeInfoText}>{formatTime(timeRemaining)}</Text>
        </View>
      </View>
      
      <View style={styles.quizCard}>
        {currentQuestion.type === 'multiple' && renderMultipleChoiceQuestion(currentQuestion)}
        {currentQuestion.type === 'truefalse' && renderTrueFalseQuestion(currentQuestion)}
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
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.l,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.m,
    borderRadius: 8,
    ...SHADOWS.medium,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  quizInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  questionInfo: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  questionInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  timeInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginLeft: SPACING.xs,
  },
  quizCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  questionContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  optionsContainer: {
    marginTop: SPACING.m,
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
  trueFalseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
  },
  trueFalseButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.m,
    margin: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  trueFalseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  completedContainer: {
    flex: 1,
    padding: SPACING.m,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
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
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: SPACING.m,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  resultIcon: {
    marginRight: SPACING.m,
  },
  resultContent: {
    flex: 1,
  },
  resultQuestion: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  resultAnswer: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  correctText: {
    color: COLORS.success,
  },
  wrongText: {
    color: COLORS.danger,
  },
  finishButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default FinalQuizScreen; 