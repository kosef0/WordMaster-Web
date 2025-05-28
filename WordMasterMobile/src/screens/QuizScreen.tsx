import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';
import { getWordsByCategory, getUserProgress } from '../database/api';
import { updateWordLearningStatus, Word } from '../database/db';
import { RootStackParamList } from '../navigation/AppNavigator';

// Tip tanımlamaları
type QuizScreenProps = StackScreenProps<RootStackParamList, 'QuizScreen'>;

interface Question {
  id: number;
  word: {
    id: number;
    english: string;
    turkish: string;
    difficulty: number;
  };
  question: string;
  answers: string[];
  correctAnswer: string;
  isEnglishToTurkish: boolean;
}

interface UserWord {
  word_id: number;
  proficiency_level: number;
  last_reviewed: string;
  is_mastered: boolean;
}

// Route param tipini doğru tanımlıyoruz
type QuizRouteParams = {
  categoryId: number;
  level: string; // 'easy', 'medium', 'hard'
};

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { categoryId, level } = route.params as QuizRouteParams;
  const { user } = useSelector((state: RootState) => state.auth);
  const { categories } = useSelector((state: RootState) => state.words);
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [userProgress, setUserProgress] = useState<UserWord[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 dakika
  const [quizStarted, setQuizStarted] = useState(false);
  const [correctWords, setCorrectWords] = useState<Question['word'][]>([]);
  const [wrongWords, setWrongWords] = useState<Question['word'][]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const category = categories.find(cat => cat.id === categoryId);
  
  // Quiz başlangıcında verileri yükle
  useEffect(() => {
    loadQuizData();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      Speech.stop();
    };
  }, []);
  
  // Timer'ı başlat
  useEffect(() => {
    if (quizStarted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleQuizEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizStarted]);
  
  // Quiz verilerini yükle
  const loadQuizData = async () => {
    try {
      setLoading(true);
      
      // Kategori kelimelerini getir
      let words = [];
      if (categoryId === 0) {
        // Karma quiz için tüm kategorilerden kelimeler
        const allWords = [];
        for (const cat of categories) {
          const categoryWords = await getWordsByCategory(cat.id);
          allWords.push(...categoryWords);
        }
        words = allWords;
      } else {
        // Belirli bir kategori için kelimeler
        words = await getWordsByCategory(categoryId);
      }
      
      // Zorluk seviyesine göre kelimeleri filtrele
      let filteredWords = words;
      if (level === 'easy') {
        filteredWords = words.filter((word: Word) => word.difficulty <= 1);
      } else if (level === 'medium') {
        filteredWords = words.filter((word: Word) => word.difficulty > 1 && word.difficulty <= 2);
      } else if (level === 'hard') {
        filteredWords = words.filter((word: Word) => word.difficulty > 2);
      }
      
      // Yeterli kelime yoksa tüm kelimeleri kullan
      if (filteredWords.length < 10) {
        filteredWords = words;
      }
      
      // Kelimeleri karıştır ve en fazla 10 kelime seç
      const shuffledWords = [...filteredWords].sort(() => 0.5 - Math.random());
      const selectedWords = shuffledWords.slice(0, Math.min(10, shuffledWords.length));
      
      // Kullanıcının kelime ilerlemesini getir
      const progress = await getUserProgress();
      setUserProgress(progress);
      
      // Soruları oluştur
      const quizQuestions = createQuestions(selectedWords, words);
      setQuestions(quizQuestions);
      
      // Zorluk seviyesine göre süreyi ayarla
      let quizTime = 300; // 5 dakika (kolay)
      if (level === 'medium') quizTime = 240; // 4 dakika
      if (level === 'hard') quizTime = 180; // 3 dakika
      setTimeRemaining(quizTime);
      
      setLoading(false);
    } catch (error) {
      console.error('Quiz verileri yüklenirken hata:', error);
      Alert.alert(
        'Hata',
        'Quiz verileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    }
  };
  
  // Soruları oluştur
  const createQuestions = (selectedWords: Word[], allWords: Word[]) => {
    return selectedWords.map((word, index) => {
      // Rastgele İngilizce -> Türkçe veya Türkçe -> İngilizce soru oluştur
      const isEnglishToTurkish = Math.random() > 0.5;
      
      // Doğru cevap
      const correctAnswer = isEnglishToTurkish ? word.turkish : word.english;
      
      // Yanlış cevaplar için diğer kelimelerden rastgele seç
      const otherWords = allWords.filter(w => w.id !== word.id);
      let wrongAnswers = otherWords
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => isEnglishToTurkish ? w.turkish : w.english);
      
      // Yeterli yanlış cevap yoksa varsayılan cevaplar ekle
      while (wrongAnswers.length < 3) {
        wrongAnswers.push(`Yanlış Cevap ${wrongAnswers.length + 1}`);
      }
      
      // Tüm cevapları karıştır
      const answers = [correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random());
      
      return {
        id: index + 1,
        word,
        question: isEnglishToTurkish 
          ? `"${word.english}" kelimesinin Türkçe karşılığı nedir?`
          : `"${word.turkish}" kelimesinin İngilizce karşılığı nedir?`,
        answers,
        correctAnswer,
        isEnglishToTurkish
      };
    });
  };
  
  // Cevabı değerlendir
  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    // Dokunsal geri bildirim
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(score + 10);
      setCorrectWords([...correctWords, currentQuestion.word]);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrongWords([...wrongWords, currentQuestion.word]);
    }
    
    setSelectedAnswer(answer);
    
    // 1 saniye sonra bir sonraki soruya geç
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      } else {
        handleQuizEnd();
      }
    }, 1000);
  };
  
  // Quiz'i başlat
  const handleStartQuiz = () => {
    setQuizStarted(true);
  };
  
  // Quiz'i bitir
  const handleQuizEnd = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      // Doğru cevaplanan kelimeler için ilerleme güncelle
      for (const word of correctWords) {
        // Kelime için mevcut ilerlemeyi bul
        const existingProgress = userProgress.find(p => p.word_id === word.id);
        
        // Yeni proficiency seviyesini hesapla
        let newLevel = existingProgress ? existingProgress.proficiency_level + 1 : 1;
        if (newLevel > 5) newLevel = 5; // Maksimum seviye 5
        
        // Kelime ilerleme durumunu güncelle - updateWordProgress yerine updateWordLearningStatus kullanıyoruz
        // Bu işlem yerel veritabanında çalışacak
        if (user?.id) {
          await updateWordLearningStatus(
            user.id, 
            word.id, 
            newLevel >= 4, // 4 ve üzeri seviyelerde öğrenilmiş olarak işaretle
            newLevel
          );
        }
      }
      
      // Sonuç ekranına yönlendir
      navigation.replace('QuizResult', {
        score,
        total: questions.length * 10,
        correctWords: correctWords,
        wrongWords: wrongWords
      });
    } catch (error) {
      console.error('Quiz sonuçları kaydedilirken hata:', error);
      Alert.alert(
        'Hata',
        'Quiz sonuçları kaydedilirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    }
  };
  
  // Kelimeyi seslendir
  const handleSpeak = (text: string) => {
    try {
      // Önce varsa önceki seslendirmeyi durdur
      Speech.stop();
      
      // Dokunsal geri bildirim
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Kelimeyi seslendir
      Speech.speak(text, { 
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          console.log('Telaffuz tamamlandı');
        },
        onError: (error) => {
          console.error('Telaffuz hatası:', error);
          Alert.alert("Hata", "Sesli telaffuz sırasında bir hata oluştu.");
        }
      });
    } catch (error) {
      console.error('Telaffuz işlemi başlatılamadı:', error);
      Alert.alert("Hata", "Telaffuz özelliği kullanılamıyor.");
    }
  };
  
  // Geri dön
  const handleBack = () => {
    Alert.alert(
      'Quiz\'den Çık',
      'Quiz\'den çıkmak istediğinizden emin misiniz? İlerlemeniz kaydedilmeyecek.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çık', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };
  
  // Kalan süreyi formatla
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Quiz hazırlanıyor...</Text>
      </View>
    );
  }
  
  if (!quizStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {category ? category.name : 'Karışık'} Quiz - {
              level === 'easy' ? 'Kolay' : 
              level === 'medium' ? 'Orta' : 'Zor'
            }
          </Text>
        </View>
        
        <View style={styles.startContainer}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4696/4696465.png' }}
            style={styles.startImage}
          />
          
          <Text style={styles.startTitle}>Quiz'e Hazır mısınız?</Text>
          
          <Text style={styles.startDescription}>
            Bu quiz {questions.length} sorudan oluşuyor ve {formatTime(timeRemaining)} süreniz var.
            {'\n\n'}
            Her doğru cevap için 10 puan kazanacaksınız.
          </Text>
          
          <TouchableOpacity style={styles.startButton} onPress={handleStartQuiz}>
            <Text style={styles.startButtonText}>Başlat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {category ? category.name : 'Karışık'} Quiz
        </Text>
      </View>
      
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
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {questions.length}
          </Text>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={
              timeRemaining < 60 ? COLORS.danger : COLORS.warning
            } />
            <Text style={[
              styles.timeText,
              timeRemaining < 60 && styles.timeWarning
            ]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>
      </View>

      {/* Soru */}
      <ScrollView style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        {currentQuestion.isEnglishToTurkish && (
          <TouchableOpacity 
            style={styles.speakButton}
            onPress={() => handleSpeak(currentQuestion.word.english)}
          >
            <Ionicons name="volume-high" size={24} color="#fff" />
            <Text style={styles.speakButtonText}>Kelimeyi Dinle</Text>
          </TouchableOpacity>
        )}
        
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
              
              {selectedAnswer === answer && (
                <Ionicons 
                  name={answer === currentQuestion.correctAnswer ? "checkmark-circle" : "close-circle"} 
                  size={24} 
                  color="#fff" 
                  style={styles.answerIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Skor */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>Skor: {score}</Text>
      </View>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    paddingTop: SPACING.xl,
  },
  backButton: {
    marginRight: SPACING.m,
  },
  title: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressContainer: {
    padding: SPACING.m,
    paddingTop: 0,
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
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  timeWarning: {
    color: COLORS.danger,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginVertical: SPACING.m,
    alignSelf: 'center',
    ...SHADOWS.medium,
  },
  speakButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
    fontSize: SIZES.medium,
  },
  answersContainer: {
    marginBottom: SPACING.m,
  },
  answerButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    marginBottom: SPACING.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  answerIcon: {
    marginLeft: SPACING.s,
  },
  scoreContainer: {
    padding: SPACING.m,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  startImage: {
    width: 120,
    height: 120,
    marginBottom: SPACING.l,
  },
  startTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.l,
    textAlign: 'center',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.base,
    ...SHADOWS.medium,
  },
  startButtonText: {
    color: '#fff',
    fontSize: SIZES.large,
    fontWeight: 'bold',
  },
});

export default QuizScreen; 