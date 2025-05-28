import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWordsByCategory } from '../store/wordSlice';
import { updateProfile } from '../store/authSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState, AppDispatch } from '../store';
import { Word } from '../database/db';

type RootStackParamList = {
  WordGame: { gameType: string; categoryId: number };
  Home: undefined;
};

type WordGameScreenProps = StackScreenProps<RootStackParamList, 'WordGame'>;

const { width } = Dimensions.get('window');

const WordGameScreen: React.FC<WordGameScreenProps> = ({ navigation, route }) => {
  const { gameType, categoryId } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentCategoryWords, loading } = useSelector((state: RootState) => state.words);
  const { user, profile } = useSelector((state: RootState) => state.auth);
  
  const [gameWords, setGameWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [cardPosition] = useState(new Animated.Value(0));
  const [cardOpacity] = useState(new Animated.Value(1));
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    dispatch(fetchWordsByCategory(categoryId));
  }, [dispatch, categoryId]);

  useEffect(() => {
    if (currentCategoryWords.length > 0 && !gameStarted) {
      // Oyun için kelimeleri karıştır ve ilk 10 tanesini al
      const shuffled = [...currentCategoryWords].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      setGameWords(selected);
      setGameStarted(true);
      
      if (gameType === 'wordquiz') {
        generateOptions(selected[0]);
      }
    }
  }, [currentCategoryWords, gameStarted, gameType]);

  useEffect(() => {
    let timer: number | undefined;
    
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000) as unknown as number;
    } else if (timeLeft === 0 && !gameOver) {
      handleGameOver();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gameStarted, gameOver, timeLeft]);

  const generateOptions = (word: Word) => {
    // Doğru cevap ve 3 yanlış seçenek oluştur
    const correctAnswer = word.turkish;
    
    // Diğer kelimelerden rastgele 3 yanlış seçenek al
    const otherWords = currentCategoryWords.filter(w => w.id !== word.id);
    const shuffled = [...otherWords].sort(() => 0.5 - Math.random());
    const wrongOptions = shuffled.slice(0, 3).map(w => w.turkish);
    
    // Tüm seçenekleri karıştır
    const allOptions = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  const handleNextWord = () => {
    if (currentWordIndex < gameWords.length - 1) {
      // Kart animasyonu
      Animated.parallel([
        Animated.timing(cardPosition, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentWordIndex(prev => prev + 1);
        setShowAnswer(false);
        setSelectedOption(null);
        
        cardPosition.setValue(width);
        
        if (gameType === 'wordquiz') {
          generateOptions(gameWords[currentWordIndex + 1]);
        }
        
        Animated.parallel([
          Animated.timing(cardPosition, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      });
    } else {
      handleGameOver();
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    const currentWord = gameWords[currentWordIndex];
    
    if (option === currentWord.turkish) {
      // Doğru cevap
      setScore(prev => prev + 10);
    }
    
    // Kısa bir süre sonra cevabı göster ve sonraki kelimeye geç
    setTimeout(() => {
      setShowAnswer(true);
      setTimeout(() => {
        handleNextWord();
      }, 1000);
    }, 500);
  };

  const handleFlipCard = () => {
    setShowAnswer(!showAnswer);
  };

  const handleGameOver = () => {
    setGameOver(true);
    
    // Kullanıcı profilini güncelle (puanları ekle)
    if (user?.id && profile) {
      const earnedPoints = score;
      const newPoints = profile.points + earnedPoints;
      
      // Seviye hesapla (her 100 puan için 1 seviye)
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      dispatch(updateProfile({
        ...profile,
        points: newPoints,
        level: newLevel
      }));
    }
  };

  const renderGameContent = () => {
    if (gameWords.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Oyun hazırlanıyor...</Text>
        </View>
      );
    }

    const currentWord = gameWords[currentWordIndex];

    switch (gameType) {
      case 'flashcards':
        return (
          <View style={styles.gameContainer}>
            <TouchableOpacity 
              style={styles.flashcard} 
              onPress={handleFlipCard}
              activeOpacity={0.9}
            >
              {!showAnswer ? (
                <View style={styles.cardContent}>
                  <Text style={styles.cardWord}>{currentWord.english}</Text>
                  <Text style={styles.cardHint}>Kartı çevirmek için dokun</Text>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={styles.cardTranslation}>{currentWord.turkish}</Text>
                  {currentWord.example_sentence && (
                    <Text style={styles.cardExample}>"{currentWord.example_sentence}"</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={handleNextWord}
              >
                <Text style={styles.navButtonText}>Sonraki</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'wordquiz':
        return (
          <View style={styles.gameContainer}>
            <View style={styles.quizCard}>
              <Text style={styles.quizQuestion}>Bu kelimenin Türkçe karşılığı nedir?</Text>
              <Text style={styles.quizWord}>{currentWord.english}</Text>
              
              <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      selectedOption === option && styles.selectedOption,
                      showAnswer && option === currentWord.turkish && styles.correctOption,
                      showAnswer && selectedOption === option && option !== currentWord.turkish && styles.wrongOption
                    ]}
                    onPress={() => !selectedOption && handleOptionSelect(option)}
                    disabled={!!selectedOption}
                  >
                    <Text 
                      style={[
                        styles.optionText,
                        showAnswer && option === currentWord.turkish && styles.correctOptionText,
                        showAnswer && selectedOption === option && option !== currentWord.turkish && styles.wrongOptionText
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
        
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Bu oyun türü henüz desteklenmiyor.</Text>
          </View>
        );
    }
  };

  const renderGameOver = () => {
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverTitle}>Oyun Bitti!</Text>
        <Text style={styles.gameOverScore}>Skorunuz: {score}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{gameWords.length}</Text>
            <Text style={styles.statLabel}>Toplam Kelime</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.floor(score / 10)}</Text>
            <Text style={styles.statLabel}>Doğru Cevap</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{score}</Text>
            <Text style={styles.statLabel}>Kazanılan Puan</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Oyundan Çık',
              'Oyundan çıkmak istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çık', onPress: () => navigation.goBack() }
              ]
            );
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {gameType === 'flashcards' ? 'Flash Kartlar' : 
           gameType === 'wordquiz' ? 'Kelime Quizi' : 'Kelime Oyunu'}
        </Text>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentWordIndex) / gameWords.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentWordIndex + 1} / {gameWords.length}
        </Text>
      </View>
      
      <View style={styles.timerContainer}>
        <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
        <Text style={styles.timerText}>{timeLeft} saniye</Text>
      </View>
      
      <Animated.View 
        style={[
          styles.gameContent,
          {
            transform: [{ translateX: cardPosition }],
            opacity: cardOpacity
          }
        ]}
      >
        {gameOver ? renderGameOver() : renderGameContent()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.m,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreContainer: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
  },
  scoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SIZES.medium,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.s,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginRight: SPACING.s,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
  },
  timerText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  gameContent: {
    flex: 1,
    padding: SPACING.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.m,
    color: COLORS.textSecondary,
    fontSize: SIZES.medium,
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashcard: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    ...SHADOWS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  cardContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWord: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  cardHint: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    position: 'absolute',
    bottom: 0,
  },
  cardTranslation: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  cardExample: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  navButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  navButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    marginRight: SPACING.xs,
  },
  quizCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  quizQuestion: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  quizWord: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    backgroundColor: COLORS.background,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionText: {
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  correctOption: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  correctOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  wrongOption: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  wrongOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: SIZES.medium,
    textAlign: 'center',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  gameOverScore: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
});

export default WordGameScreen; 