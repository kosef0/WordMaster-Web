import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { saveQuizResult } from '../database/db';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import * as Speech from 'expo-speech';

const QuizScreen = ({ route, navigation }) => {
  const { categoryId } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { currentCategoryWords } = useSelector(state => state.words);
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Quiz sorularını oluştur
  useEffect(() => {
    if (currentCategoryWords && currentCategoryWords.length > 0) {
      // Kelimeleri karıştır ve en fazla 10 kelime seç
      const shuffledWords = [...currentCategoryWords].sort(() => 0.5 - Math.random());
      const selectedWords = shuffledWords.slice(0, Math.min(10, shuffledWords.length));
      
      // Her kelime için bir soru oluştur
      const quizQuestions = selectedWords.map(word => {
        // Doğru cevap
        const correctAnswer = word.turkish;
        
        // Yanlış cevaplar için diğer kelimelerden rastgele seç
        let wrongAnswers = currentCategoryWords
          .filter(w => w.id !== word.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(w => w.turkish);
        
        // Eğer yeterli yanlış cevap yoksa, varsayılan cevaplar ekle
        while (wrongAnswers.length < 3) {
          wrongAnswers.push(`Yanlış Cevap ${wrongAnswers.length + 1}`);
        }
        
        // Tüm cevapları karıştır
        const answers = [correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random());
        
        return {
          word,
          question: `"${word.english}" kelimesinin Türkçe karşılığı nedir?`,
          answers,
          correctAnswer
        };
      });
      
      setQuestions(quizQuestions);
      setLoading(false);
      setStartTime(new Date());
    } else {
      // Yeterli kelime yoksa geri dön
      Alert.alert(
        'Yetersiz Kelime',
        'Bu kategori için yeterli kelime bulunmadığından quiz oluşturulamıyor.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    }
  }, [currentCategoryWords, categoryId]);

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    
    // Doğru cevap kontrolü
    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    // 1 saniye sonra bir sonraki soruya geç
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      } else {
        // Quiz bitti
        finishQuiz();
      }
    }, 1000);
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    const endTime = new Date();
    const completionTime = Math.round((endTime - startTime) / 1000); // saniye cinsinden
    
    try {
      // Quiz sonucunu kaydet
      if (user) {
        await saveQuizResult(user.id, categoryId, score, completionTime);
      }
      
      // Sonuç modalını göster
      setShowResultModal(true);
    } catch (error) {
      console.error('Quiz sonucu kaydedilirken hata:', error);
    }
  };

  const handleSpeak = (text) => {
    Speech.speak(text, { language: 'en-US' });
  };

  const handleReturnHome = () => {
    navigation.navigate('Home');
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setQuizFinished(false);
    setShowResultModal(false);
    setStartTime(new Date());
    
    // Soruları yeniden karıştır
    setQuestions(prevQuestions => [...prevQuestions].sort(() => 0.5 - Math.random()));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Quiz hazırlanıyor...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      {/* İlerleme Durumu */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1} / {questions.length}
        </Text>
      </View>

      {/* Soru */}
      <ScrollView style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        <TouchableOpacity 
          style={styles.speakButton}
          onPress={() => handleSpeak(currentQuestion.word.english)}
        >
          <Text style={styles.speakButtonText}>🔊 Kelimeyi Dinle</Text>
        </TouchableOpacity>
        
        {/* Cevaplar */}
        <View style={styles.answersContainer}>
          {currentQuestion.answers.map((answer, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.answerButton,
                selectedAnswer === answer && (
                  answer === currentQuestion.correctAnswer 
                    ? styles.correctAnswer 
                    : styles.wrongAnswer
                )
              ]}
              onPress={() => selectedAnswer === null && handleAnswer(answer)}
              disabled={selectedAnswer !== null}
            >
              <Text style={[
                styles.answerText,
                selectedAnswer === answer && (
                  answer === currentQuestion.correctAnswer 
                    ? styles.correctAnswerText 
                    : styles.wrongAnswerText
                )
              ]}>
                {answer}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sonuç Modalı */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Quiz Tamamlandı!</Text>
            <Text style={styles.scoreText}>
              Puanınız: <Text style={styles.scoreValue}>{score}/{questions.length}</Text>
            </Text>
            <Text style={styles.scorePercentage}>
              {Math.round((score / questions.length) * 100)}%
            </Text>
            
            <View style={styles.resultMessage}>
              {score === questions.length && (
                <Text style={styles.perfectScoreText}>Mükemmel! Tüm soruları doğru yanıtladınız!</Text>
              )}
              {score >= questions.length * 0.7 && score < questions.length && (
                <Text style={styles.goodScoreText}>Çok iyi! Harika bir skor elde ettiniz.</Text>
              )}
              {score >= questions.length * 0.4 && score < questions.length * 0.7 && (
                <Text style={styles.averageScoreText}>İyi iş! Biraz daha pratik yapabilirsiniz.</Text>
              )}
              {score < questions.length * 0.4 && (
                <Text style={styles.lowScoreText}>Daha fazla pratik yapmanız gerekiyor.</Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.retryButton]}
                onPress={handleRetryQuiz}
              >
                <Text style={styles.modalButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.homeButton]}
                onPress={handleReturnHome}
              >
                <Text style={styles.modalButtonText}>Ana Sayfa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  questionContainer: {
    flex: 1,
    padding: SPACING.m,
  },
  questionText: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  speakButton: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.s,
    borderRadius: SIZES.base,
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  speakButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
  },
  answersContainer: {
    marginTop: SPACING.m,
  },
  answerButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  correctAnswer: {
    backgroundColor: COLORS.success,
  },
  wrongAnswer: {
    backgroundColor: COLORS.danger,
  },
  answerText: {
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  correctAnswerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  wrongAnswerText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.l,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  scoreText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scoreValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  scorePercentage: {
    fontSize: SIZES.xxlarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: SPACING.m,
  },
  resultMessage: {
    marginBottom: SPACING.l,
  },
  perfectScoreText: {
    fontSize: SIZES.medium,
    color: COLORS.success,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  goodScoreText: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  averageScoreText: {
    fontSize: SIZES.medium,
    color: COLORS.warning,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  lowScoreText: {
    fontSize: SIZES.medium,
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  retryButton: {
    backgroundColor: COLORS.secondary,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
});

export default QuizScreen; 