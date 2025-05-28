import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  WordPuzzle: undefined;
};

type WordPuzzleScreenProps = StackScreenProps<RootStackParamList, 'WordPuzzle'>;

interface Word {
  id: number;
  english: string;
  turkish: string;
}

const WordPuzzleScreen: React.FC<WordPuzzleScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [shuffledLetters, setShuffledLetters] = useState<{ letter: string, index: number }[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<{ letter: string, index: number }[]>([]);
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [totalRounds] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'kolay' | 'orta' | 'zor'>('orta');
  const [streak, setStreak] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  
  // Animasyon değerleri
  const successAnimation = useRef(new Animated.Value(0)).current;
  const streakAnimation = useRef(new Animated.Value(1)).current;
  const hintAnimation = useRef(new Animated.Value(0)).current;
  const timeWarningAnimation = useRef(new Animated.Value(0)).current;

  // Oyunu başlat
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
        
        // Son 10 saniye için uyarı animasyonu
        if (timeLeft <= 10) {
          Animated.sequence([
            Animated.timing(timeWarningAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            }),
            Animated.timing(timeWarningAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true
            })
          ]).start();
        }
      } else {
        finishGame();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, gameActive]);

  // Kelime yükleme
  const loadWords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Rastgele bir kategori ID'si seç (1-10 arası)
      const randomCategoryId = Math.floor(Math.random() * 10) + 1;
      
      // Kategoriden kelimeleri getir
      const wordsData = await getWordsByCategory(randomCategoryId);
      
      // Sadece İngilizce kelimeleri 3-8 harf uzunluğunda olanları filtrele
      const filteredWords = wordsData.filter((word: Word) => 
        word.english && word.english.length >= 3 && word.english.length <= 8
      );
      
      if (filteredWords.length === 0) {
        throw new Error('Uygun kelime bulunamadı. Lütfen tekrar deneyin.');
      }
      
      // Kelimeleri karıştır ve kaydet
      const shuffledWords = [...filteredWords].sort(() => Math.random() - 0.5);
      setWords(shuffledWords);
      
      // İlk kelimeyi ayarla
      prepareWord(shuffledWords[0].english);
      setCurrentWord(shuffledWords[0]);
      
      setLoading(false);
      setGameActive(true);
    } catch (err) {
      setError('Kelimeler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
      console.error('Kelime yükleme hatası:', err);
    }
  };

  // En yüksek skoru yükle
  const loadHighScore = async () => {
    if (user) {
      const userHighScore = await getUserHighScore(user.id, 'word_puzzle');
      setHighScore(userHighScore);
    }
  };

  // Zorluk seviyesini ayarla
  const setGameDifficulty = (level: 'kolay' | 'orta' | 'zor') => {
    setDifficulty(level);
    
    // Zorluk seviyesine göre süreyi ayarla
    switch (level) {
      case 'kolay':
        setTimeLeft(90); // 90 saniye
        break;
      case 'orta':
        setTimeLeft(60); // 60 saniye
        break;
      case 'zor':
        setTimeLeft(45); // 45 saniye
        break;
    }
  };

  // İpucu göster
  const handleShowHint = () => {
    // İpucu kullanıldığında puan cezası
    const hintPenalty = 5;
    setScore(Math.max(0, score - hintPenalty));
    setShowHint(true);
    setHintUsed(true);
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // İpucu animasyonu
    Animated.sequence([
      Animated.timing(hintAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(hintAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowHint(false);
    });
  };

  // Kelimeyi hazırla
  const prepareWord = (word: string) => {
    // Harfleri karıştır
    const letters = word.split('');
    
    // Zorluk seviyesine göre karıştırma
    let shuffled = [...letters];
    
    if (difficulty === 'zor') {
      // Zor seviyede daha karmaşık karıştırma
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      shuffled = shuffled.sort(() => Math.random() - 0.5);
    } else {
      // Normal karıştırma
      shuffled = shuffled.sort(() => Math.random() - 0.5);
    }
    
    // Harfleri ve indekslerini kaydet
    const shuffledWithIndex = shuffled.map((letter, index) => ({
      letter: letter.toLowerCase(),
      index
    }));
    
    setShuffledLetters(shuffledWithIndex);
    setSelectedLetters([]);
    setHintUsed(false);
  };

  // Harf seçme işlemi
  const handleLetterPress = (letter: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Seçilen harfi ekle
    setSelectedLetters([...selectedLetters, { letter, index }]);
    
    // Karışık harflerden kaldır
    setShuffledLetters(shuffledLetters.filter(item => item.index !== index));
  };

  // Seçilen harfi geri alma
  const handleSelectedLetterPress = (letter: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Seçilen harfi kaldır
    setSelectedLetters(selectedLetters.filter(item => item.index !== index));
    
    // Karışık harflere geri ekle
    setShuffledLetters([...shuffledLetters, { letter, index }].sort((a, b) => a.index - b.index));
  };

  // Cevabı kontrol et
  const checkAnswer = () => {
    if (!currentWord) return;
    
    const userAnswer = selectedLetters.map(item => item.letter).join('');
    const correctAnswer = currentWord.english.toLowerCase();
    
    if (userAnswer === correctAnswer) {
      // Doğru cevap
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Başarı animasyonu
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.delay(500),
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      // Seri sayısını artır
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Seri animasyonu
      if (newStreak > 1) {
        Animated.sequence([
          Animated.timing(streakAnimation, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(streakAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      }
      
      // Skoru güncelle (kelime uzunluğu * 10 puan + zorluk bonusu + seri bonusu)
      let pointsEarned = correctAnswer.length * 10;
      
      // Zorluk seviyesi bonusu
      if (difficulty === 'zor') {
        pointsEarned += 15;
      } else if (difficulty === 'orta') {
        pointsEarned += 5;
      }
      
      // Seri bonusu (her 3 doğru cevap için bonus)
      if (newStreak % 3 === 0) {
        pointsEarned += 20;
        // Bonus animasyonu veya bildirimi eklenebilir
        Alert.alert('Seri Bonusu!', `${newStreak} kelimeyi doğru bildiniz! +20 bonus puan kazandınız.`);
      }
      
      // İpucu kullanıldıysa puan düşür
      if (hintUsed) {
        pointsEarned = Math.floor(pointsEarned * 0.8); // %20 ceza
      }
      
      setScore(score + pointsEarned);
      
      // Sonraki kelimeye geç veya oyunu bitir
      if (round < totalRounds && round < words.length) {
        setRound(round + 1);
        const nextWord = words[round];
        setCurrentWord(nextWord);
        prepareWord(nextWord.english);
      } else {
        finishGame();
      }
    } else {
      // Yanlış cevap
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Yanlış', 'Doğru kelimeyi oluşturamadınız. Tekrar deneyin.');
      
      // Seriyi sıfırla
      setStreak(0);
    }
  };

  // Oyunu bitir
  const finishGame = async () => {
    // Oyun bittiğinde çağrılır
    try {
      // Skor hesapla ve kaydet
      const finalScore = score;
      
      // Yüksek skoru kontrol et ve güncelle
      if (finalScore > highScore) {
        setHighScore(finalScore);
        
        try {
          // Oyun skorunu API'ye kaydet
          const result = await saveGameScore('word_puzzle', finalScore);
          
          if (result && result.success) {
            console.log('Oyun skoru başarıyla kaydedildi:', result);
          } else {
            console.warn('Oyun skoru kaydedilemedi:', result);
          }
        } catch (error) {
          console.error('Skor kaydetme hatası:', error);
          // Hata olsa bile oyunu devam ettir
        }
      }
      
      // Oyun bittiğinde state'i güncelle
      setGameOver(true);
      setGameActive(false);
      
      // Başarılı tamamlama için haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animasyon için timeout
      setTimeout(() => {
        // Animasyon burada eklenebilir
      }, 500);
      
    } catch (error) {
      console.error('Oyun bitirme hatası:', error);
      // Hata durumunda da oyunu bitir
      setGameOver(true);
      setGameActive(false);
    }
  };

  // Oyunu yeniden başlat
  const resetGame = () => {
    setScore(0);
    setRound(1);
    setStreak(0);
    setGameActive(true);
    
    // Zorluk seviyesine göre süreyi ayarla
    switch (difficulty) {
      case 'kolay':
        setTimeLeft(90);
        break;
      case 'orta':
        setTimeLeft(60);
        break;
      case 'zor':
        setTimeLeft(45);
        break;
    }
    
    // Kelimeleri karıştır ve ilk kelimeyi ayarla
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
    setCurrentWord(shuffledWords[0]);
    prepareWord(shuffledWords[0].english);
  };

  // Zamanı biçimlendir
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Kelimeler yükleniyor...</Text>
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
        <Text style={styles.title}>Kelime Yapbozu</Text>
      </View>
      
      {/* Bilgi Paneli */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SKOR</Text>
          <Animated.Text 
            style={[
              styles.infoValue,
              { transform: [{ scale: successAnimation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2, 1]
              }) }] }
            ]}
          >
            {score}
          </Animated.Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SÜRE</Text>
          <Animated.Text 
            style={[
              styles.infoValue, 
              timeLeft < 10 ? { color: COLORS.danger } : {},
              { transform: [{ scale: timeWarningAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2]
              }) }] }
            ]}
          >
            {formatTime(timeLeft)}
          </Animated.Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>KELIME</Text>
          <Text style={styles.infoValue}>{round}/{totalRounds}</Text>
        </View>
      </View>
      
      {/* Zorluk Seçimi (Oyun aktif değilken) */}
      {!gameActive && (
        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyLabel}>Zorluk Seviyesi:</Text>
          <View style={styles.difficultyButtons}>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'kolay' && styles.activeDifficultyButton
              ]}
              onPress={() => setGameDifficulty('kolay')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'kolay' && styles.activeDifficultyText
              ]}>Kolay</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'orta' && styles.activeDifficultyButton
              ]}
              onPress={() => setGameDifficulty('orta')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'orta' && styles.activeDifficultyText
              ]}>Orta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === 'zor' && styles.activeDifficultyButton
              ]}
              onPress={() => setGameDifficulty('zor')}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === 'zor' && styles.activeDifficultyText
              ]}>Zor</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Seri Göstergesi */}
      {gameActive && streak > 0 && (
        <Animated.View 
          style={[
            styles.streakContainer,
            { transform: [{ scale: streakAnimation }] }
          ]}
        >
          <Text style={styles.streakText}>
            <Ionicons name="flame" size={16} color={COLORS.warning} /> Seri: {streak}
          </Text>
          {streak > 0 && streak % 3 === 0 && (
            <Text style={styles.streakBonusText}>Bonus: +20 puan!</Text>
          )}
        </Animated.View>
      )}
      
      {/* İpucu */}
      {currentWord && (
        <View style={styles.hintContainer}>
          <View style={styles.hintHeader}>
            <Text style={styles.hintLabel}>İPUCU</Text>
            {!showHint && !hintUsed && gameActive && (
              <TouchableOpacity
                style={styles.hintButton}
                onPress={handleShowHint}
              >
                <Text style={styles.hintButtonText}>İpucu Göster (-5p)</Text>
              </TouchableOpacity>
            )}
          </View>
          <Animated.Text 
            style={[
              styles.hintText,
              { 
                opacity: hintAnimation,
                transform: [{ scale: hintAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                }) }] 
              }
            ]}
          >
            {showHint ? currentWord.english.charAt(0).toUpperCase() + '...' : currentWord.turkish}
          </Animated.Text>
          {!showHint && (
            <Text style={styles.hintText}>{currentWord.turkish}</Text>
          )}
        </View>
      )}
      
      {/* Seçilen Harfler */}
      <View style={styles.selectedContainer}>
        {selectedLetters.length > 0 ? (
          <View style={styles.lettersRow}>
            {selectedLetters.map((item, idx) => (
              <TouchableOpacity
                key={`selected-${idx}`}
                style={styles.selectedLetterButton}
                onPress={() => handleSelectedLetterPress(item.letter, item.index)}
              >
                <Text style={styles.letterText}>{item.letter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>
            Harfleri seçerek kelimeyi oluşturun
          </Text>
        )}
      </View>
      
      {/* Karışık Harfler */}
      <View style={styles.shuffledContainer}>
        <View style={styles.lettersRow}>
          {shuffledLetters.map((item, idx) => (
            <TouchableOpacity
              key={`shuffled-${idx}`}
              style={styles.letterButton}
              onPress={() => handleLetterPress(item.letter, item.index)}
            >
              <Text style={styles.letterText}>{item.letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Kontrol Butonu */}
      <TouchableOpacity
        style={[
          styles.checkButton,
          selectedLetters.length === 0 ? styles.disabledButton : {}
        ]}
        onPress={checkAnswer}
        disabled={selectedLetters.length === 0}
      >
        <Text style={styles.checkButtonText}>Kontrol Et</Text>
      </TouchableOpacity>
      
      {/* İlerleme ve Yüksek Skor */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          En Yüksek Skor: {highScore}
        </Text>
        
        {!gameActive && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetGame}
          >
            <Text style={styles.resetButtonText}>Yeniden Başlat</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: SPACING.m,
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
  hintContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  hintLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  hintText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  selectedContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  placeholderText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  shuffledContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  lettersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  letterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    margin: SPACING.xs,
    ...SHADOWS.small,
  },
  selectedLetterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    borderRadius: SIZES.base,
    margin: SPACING.xs,
    ...SHADOWS.small,
  },
  letterText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    paddingVertical: SPACING.m,
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
  },
  disabledButton: {
    backgroundColor: COLORS.border,
  },
  checkButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: 'white',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
  },
  resetButtonText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: 'white',
  },
  difficultyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  difficultyLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.xs,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  activeDifficultyButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  difficultyButtonText: {
    fontSize: SIZES.small,
    color: COLORS.text,
  },
  activeDifficultyText: {
    color: 'white',
    fontWeight: 'bold',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  streakText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  streakBonusText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  hintButton: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hintButtonText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default WordPuzzleScreen; 