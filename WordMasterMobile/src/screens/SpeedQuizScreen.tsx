import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useSelector } from 'react-redux';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';
import { getWordsByCategory, saveGameScore } from '../database/api';
import { saveGameScoreToLocalDB, getUserHighScore } from '../database/db';

type RootStackParamList = {
  Games: undefined;
  SpeedQuiz: undefined;
};

type SpeedQuizScreenProps = StackScreenProps<RootStackParamList, 'SpeedQuiz'>;

interface Word {
  id: number;
  english: string;
  turkish: string;
}

interface Question {
  word: Word;
  options: string[];
  correctIndex: number;
}

const SpeedQuizScreen: React.FC<SpeedQuizScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60); // 60 saniye
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [wrongAnswers, setWrongAnswers] = useState<number>(0);
  
  // Animasyon değerleri
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadWords();
    loadHighScore();
  }, []);

  // Zamanlayıcı
  useEffect(() => {
    if (!gameActive) return;
    
    const timer = setTimeout(() => {
      if (timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
        
        // Zaman azaldıkça progress bar'ı güncelle
        Animated.timing(progressAnim, {
          toValue: timeLeft / 60,
          duration: 1000,
          useNativeDriver: false,
        }).start();
        
        // Son 10 saniyede uyarı animasyonu
        if (timeLeft <= 10) {
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
      } else {
        // Süre bitti
        finishGame();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, gameActive]);

  const loadWords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Rastgele bir kategori ID'si seç (1-10 arası)
      const randomCategoryId = Math.floor(Math.random() * 10) + 1;
      
      // Kategoriden kelimeleri getir
      const wordsData = await getWordsByCategory(randomCategoryId);
      
      // Kelimeleri filtrele ve karıştır
      const filteredWords = wordsData.filter((word: Word) => 
        word.english && word.turkish
      );
      
      if (filteredWords.length < 10) {
        throw new Error('Yeterli kelime bulunamadı. Lütfen tekrar deneyin.');
      }
      
      // Kelimeleri karıştır ve en fazla 20 kelime al
      const shuffledWords = [...filteredWords].sort(() => Math.random() - 0.5);
      const selectedWords = shuffledWords.slice(0, 20);
      setWords(selectedWords);
      
      // Soruları hazırla
      prepareQuestions(selectedWords);
      
      setLoading(false);
      setGameActive(true);
    } catch (err) {
      setError('Kelimeler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
      console.error('Kelime yükleme hatası:', err);
    }
  };

  const loadHighScore = async () => {
    if (user) {
      const userHighScore = await getUserHighScore(user.id, 'speed_quiz');
      setHighScore(userHighScore);
    }
  };

  const prepareQuestions = (wordsArray: Word[]) => {
    const preparedQuestions: Question[] = [];
    
    wordsArray.forEach(word => {
      // Her kelime için 4 seçenekli bir soru hazırla
      // Doğru cevap ve 3 yanlış cevap
      
      // Yanlış cevaplar için diğer kelimelerden seç
      const otherWords = wordsArray.filter(w => w.id !== word.id);
      const shuffledOtherWords = [...otherWords].sort(() => Math.random() - 0.5);
      const wrongOptions = shuffledOtherWords.slice(0, 3).map(w => w.turkish);
      
      // Tüm seçenekleri birleştir (doğru + yanlış)
      const allOptions = [...wrongOptions, word.turkish];
      
      // Seçenekleri karıştır
      const shuffledOptions = [...allOptions].sort(() => Math.random() - 0.5);
      
      // Doğru cevabın indeksini bul
      const correctIndex = shuffledOptions.findIndex(option => option === word.turkish);
      
      // Soruyu ekle
      preparedQuestions.push({
        word,
        options: shuffledOptions,
        correctIndex
      });
    });
    
    setQuestions(preparedQuestions);
    setCurrentQuestionIndex(0);
  };

  const handleAnswerPress = (selectedIndex: number) => {
    if (!gameActive || currentQuestionIndex >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correctIndex;
    
    // Haptic feedback
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Doğru cevap için puan ekle (kalan süreye göre bonus)
      const basePoints = 10;
      const timeBonus = Math.floor(timeLeft / 10); // Her 10 saniye için 1 bonus puan
      const questionPoints = basePoints + timeBonus;
      
      setScore(score + questionPoints);
      setCorrectAnswers(correctAnswers + 1);
      
      // Animasyon efekti
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrongAnswers(wrongAnswers + 1);
    }
    
    // Sonraki soruya geç
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 500);
    } else {
      // Tüm sorular bitti
      finishGame();
    }
  };

  const finishGame = async () => {
    setGameActive(false);
    setGameOver(true);
    
    // Skoru kaydet
    if (user) {
      try {
        // Yerel veritabanına kaydet
        await saveGameScoreToLocalDB(user.id, 'speed_quiz', score);
        
        // API'ye kaydet (bağlantı varsa)
        await saveGameScore('speed_quiz', score);
        
        // Yeni yüksek skor kontrolü
        if (score > highScore) {
          setHighScore(score);
          Alert.alert(
            'Tebrikler!',
            `Yeni yüksek skor: ${score} puan!`,
            [
              { 
                text: 'Tamam', 
                onPress: () => {} 
              }
            ]
          );
        } else {
          Alert.alert(
            'Oyun Bitti',
            `Skorunuz: ${score} puan\nDoğru: ${correctAnswers}\nYanlış: ${wrongAnswers}`,
            [
              { 
                text: 'Tamam', 
                onPress: () => {} 
              }
            ]
          );
        }
      } catch (err) {
        console.error('Skor kaydetme hatası:', err);
        Alert.alert('Hata', 'Skorunuz kaydedilirken bir hata oluştu.');
      }
    }
  };

  const resetGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameActive(true);
    setGameOver(false);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    
    // Kelimeleri karıştır ve soruları yeniden hazırla
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
    prepareQuestions(shuffledWords);
    
    // Animasyonları sıfırla
    progressAnim.setValue(1);
    scaleAnim.setValue(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Sorular hazırlanıyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadWords}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
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
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Zamana Karşı Test</Text>
      </View>
      
      {/* Skor ve Zaman */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SKOR</Text>
          <Text style={styles.infoValue}>{score}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SORU</Text>
          <Text style={styles.infoValue}>
            {currentQuestionIndex + 1}/{questions.length}
          </Text>
        </View>
        
        <Animated.View 
          style={[
            styles.infoItem,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Text style={styles.infoLabel}>SÜRE</Text>
          <Text style={[
            styles.infoValue,
            timeLeft <= 10 ? styles.warningText : {}
          ]}>
            {timeLeft}s
          </Text>
        </Animated.View>
      </View>
      
      {/* İlerleme Çubuğu */}
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { 
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: progressAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [COLORS.danger, COLORS.warning, COLORS.success]
              })
            }
          ]} 
        />
      </View>
      
      {/* Soru Kartı */}
      {currentQuestionIndex < questions.length && (
        <Animated.View 
          style={[
            styles.questionCard,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Text style={styles.questionText}>
            "{questions[currentQuestionIndex].word.english}" kelimesinin Türkçe karşılığı nedir?
          </Text>
          
          {/* Seçenekler */}
          <View style={styles.optionsContainer}>
            {questions[currentQuestionIndex].options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAnswerPress(index)}
                disabled={!gameActive || gameOver}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
      
      {/* Oyun Sonu */}
      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Ionicons 
            name={score > highScore ? "trophy" : "checkmark-circle"} 
            size={60} 
            color={score > highScore ? COLORS.warning : COLORS.success} 
          />
          
          <Text style={styles.gameOverTitle}>
            {score > highScore ? 'Yeni Rekor!' : 'Oyun Bitti!'}
          </Text>
          
          <Text style={styles.gameOverScore}>
            Skorunuz: {score}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.statText}>Doğru: {correctAnswers}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={24} color={COLORS.danger} />
              <Text style={styles.statText}>Yanlış: {wrongAnswers}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetGame}
          >
            <Text style={styles.resetButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>
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
  loadingText: {
    marginTop: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  errorText: {
    fontSize: SIZES.medium,
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: SPACING.m,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
    marginTop: SPACING.m,
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
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  infoValue: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  warningText: {
    color: COLORS.danger,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SPACING.m,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  questionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  questionText: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionButton: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  optionText: {
    fontSize: SIZES.medium,
    color: COLORS.text,
    textAlign: 'center',
  },
  gameOverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${COLORS.background}F0`,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  gameOverTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
  },
  gameOverScore: {
    fontSize: SIZES.large,
    color: COLORS.primary,
    marginBottom: SPACING.l,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.l,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: SIZES.medium,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.base,
    ...SHADOWS.medium,
  },
  resetButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default SpeedQuizScreen; 