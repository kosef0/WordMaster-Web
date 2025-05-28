import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing
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
  WordGuess: undefined;
};

type WordGuessScreenProps = StackScreenProps<RootStackParamList, 'WordGuess'>;

interface Word {
  id: number;
  english: string;
  turkish: string;
}

const WordGuessScreen: React.FC<WordGuessScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [totalRounds] = useState<number>(10);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'kolay' | 'orta' | 'zor'>('orta');
  const [streak, setStreak] = useState<number>(0); // Doğru cevap serisi
  const [hintUsed, setHintUsed] = useState<boolean>(false); // İpucu kullanıldı mı?
  const [revealedLetters, setRevealedLetters] = useState<number>(0); // İpucu olarak gösterilen harf sayısı
  const [animateSuccess, setAnimateSuccess] = useState<boolean>(false); // Başarı animasyonu
  const [animateError, setAnimateError] = useState<boolean>(false); // Hata animasyonu
  const [gameOver, setGameOver] = useState<boolean>(false);
  
  // Animasyon değerleri
  const successAnimation = useRef(new Animated.Value(0)).current;
  const errorAnimation = useRef(new Animated.Value(0)).current;
  const streakAnimation = useRef(new Animated.Value(1)).current;
  const hintAnimation = useRef(new Animated.Value(0)).current;
  const letterAnimation = useRef(new Animated.Value(0)).current;
  const hangmanAnimation = useRef(new Animated.Value(1)).current;
  const scoreAnimation = useRef(new Animated.Value(1)).current;
  
  // Klavye harfleri
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  
  // Maksimum yanlış tahmin sayısı
  const maxWrongGuesses = 6;

  useEffect(() => {
    loadWords();
    loadHighScore();
  }, []);

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
      setCurrentWord(shuffledWords[0]);
      
      setLoading(false);
      setGameActive(true);
      resetGameState();
    } catch (err) {
      setError('Kelimeler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
      console.error('Kelime yükleme hatası:', err);
    }
  };

  const loadHighScore = async () => {
    if (user) {
      const userHighScore = await getUserHighScore(user.id, 'word_guess');
      setHighScore(userHighScore);
    }
  };

  const resetGameState = () => {
    setGuessedLetters([]);
    setWrongGuesses(0);
    setHintUsed(false);
    setRevealedLetters(0);
  };

  // Zorluk seviyesini ayarla
  const setGameDifficulty = (level: 'kolay' | 'orta' | 'zor') => {
    setDifficulty(level);
  };

  // İpucu göster
  const handleShowHint = () => {
    if (!currentWord || hintUsed || revealedLetters >= 2) return;
    
    // İpucu kullanıldığında puan cezası
    const hintPenalty = 5;
    setScore(Math.max(0, score - hintPenalty));
    
    // İpucu animasyonu
    Animated.timing(hintAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.elastic(1)
    }).start();
    
    // Rastgele bir harfi göster (henüz tahmin edilmemiş)
    const wordLower = currentWord.english.toLowerCase();
    const unguessedLetters = wordLower
      .split('')
      .filter(letter => !guessedLetters.includes(letter));
    
    if (unguessedLetters.length > 0) {
      // Rastgele bir harf seç
      const randomIndex = Math.floor(Math.random() * unguessedLetters.length);
      const hintLetter = unguessedLetters[randomIndex];
      
      // Harfi tahmin edilmiş harflere ekle
      setGuessedLetters([...guessedLetters, hintLetter]);
      setRevealedLetters(revealedLetters + 1);
      
      // İpucu kullanıldı olarak işaretle
      if (revealedLetters + 1 >= 2) {
        setHintUsed(true);
      }
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      // Kelime tamamen tahmin edildi mi kontrol et
      if (checkIsWordGuessed(wordLower, [...guessedLetters, hintLetter])) {
        handleWordGuessed(true);
      }
    }
  };

  const handleLetterPress = (letter: string) => {
    // Eğer harf zaten tahmin edildiyse veya oyun aktif değilse işlem yapma
    if (guessedLetters.includes(letter) || !gameActive || !currentWord) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Harf seçim animasyonu
    Animated.timing(letterAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      letterAnimation.setValue(0);
    });
    
    // Tahmin edilen harflere ekle
    const newGuessedLetters = [...guessedLetters, letter];
    setGuessedLetters(newGuessedLetters);
    
    // Harf kelimede var mı kontrol et
    const wordLower = currentWord.english.toLowerCase();
    if (!wordLower.includes(letter)) {
      // Yanlış tahmin
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      
      // Hata animasyonu
      setAnimateError(true);
      Animated.sequence([
        Animated.timing(errorAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(errorAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setAnimateError(false);
      });
      
      // Adam asmaca animasyonu
      Animated.sequence([
        Animated.timing(hangmanAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(hangmanAnimation, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(hangmanAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
      
      // Oyun kaybedildi mi kontrol et
      if (newWrongGuesses >= maxWrongGuesses) {
        handleGameLost();
      }
    } else {
      // Doğru tahmin
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Başarı animasyonu
      setAnimateSuccess(true);
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setAnimateSuccess(false);
      });
      
      // Kelime tamamen tahmin edildi mi kontrol et
      if (checkIsWordGuessed(wordLower, newGuessedLetters)) {
        handleWordGuessed(false);
      }
    }
  };

  const checkIsWordGuessed = (word: string, guessed: string[]): boolean => {
    return word.split('').every(letter => guessed.includes(letter));
  };

  const handleWordGuessed = (usedHint: boolean = false) => {
    // Doğru tahmin edilen kelime için puan ekle
    // Formül: (kelime uzunluğu * 10) - (yanlış tahmin * 5)
    const wordPoints = currentWord ? currentWord.english.length * 10 : 0;
    const penalty = wrongGuesses * 5;
    let roundScore = Math.max(0, wordPoints - penalty);
    
    // İpucu kullanıldıysa puan düşür
    if (usedHint || hintUsed) {
      roundScore = Math.floor(roundScore * 0.7); // %30 ceza
    }
    
    // Zorluk seviyesi bonusu
    if (difficulty === 'zor') {
      roundScore = Math.floor(roundScore * 1.5); // %50 bonus
    } else if (difficulty === 'kolay') {
      roundScore = Math.floor(roundScore * 0.8); // %20 ceza
    }
    
    // Seri bonusu
    const newStreak = streak + 1;
    setStreak(newStreak);
    
    // Seri animasyonu
    Animated.sequence([
      Animated.timing(streakAnimation, {
        toValue: 1.3,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1)
      }),
      Animated.timing(streakAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    if (newStreak % 3 === 0) {
      // Her 3 doğru cevap için bonus
      const streakBonus = 20;
      roundScore += streakBonus;
      Alert.alert('Seri Bonusu!', `${newStreak} kelimeyi doğru bildiniz! +${streakBonus} bonus puan kazandınız.`);
    }
    
    // Skor animasyonu
    Animated.sequence([
      Animated.timing(scoreAnimation, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(scoreAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    setScore(score + roundScore);
    
    // Sonraki kelimeye geç veya oyunu bitir
    if (round < totalRounds && round < words.length) {
      setTimeout(() => {
        setRound(round + 1);
        setCurrentWord(words[round]);
        resetGameState();
      }, 1000);
    } else {
      finishGame(true);
    }
  };

  const handleGameLost = () => {
    // Oyun kaybedildi
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Seriyi sıfırla
    setStreak(0);
    
    // Sonraki kelimeye geç veya oyunu bitir
    if (round < totalRounds && round < words.length) {
      setTimeout(() => {
        setRound(round + 1);
        setCurrentWord(words[round]);
        resetGameState();
      }, 1500);
    } else {
      finishGame(false);
    }
  };

  const finishGame = async (won: boolean) => {
    // Oyun bittiğinde çağrılır
    try {
      // Skor hesapla ve kaydet
      const finalScore = score;
      
      // Yüksek skoru kontrol et ve güncelle
      if (finalScore > highScore) {
        setHighScore(finalScore);
        
        try {
          // Oyun skorunu API'ye kaydet
          const result = await saveGameScore('word_guess', finalScore);
          
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
      if (won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
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

  const resetGame = () => {
    setScore(0);
    setRound(1);
    setStreak(0);
    setGameActive(true);
    resetGameState();
    
    // Kelimeleri karıştır ve ilk kelimeyi ayarla
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
    setCurrentWord(shuffledWords[0]);
  };

  const renderWord = () => {
    if (!currentWord) return null;
    
    const wordLower = currentWord.english.toLowerCase();
    
    return (
      <View style={styles.wordContainer}>
        {wordLower.split('').map((letter, index) => (
          <View 
            key={`letter-${index}`}
            style={[
              styles.letterBox,
              guessedLetters.includes(letter) && styles.guessedLetterBox
            ]}
          >
            <Text style={styles.letterBoxText}>
              {guessedLetters.includes(letter) ? letter.toUpperCase() : wrongGuesses >= maxWrongGuesses ? letter.toUpperCase() : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderHangman = () => {
    // Adam asmaca çizimi (basit metin versiyonu)
    const hangmanStages = [
      '🧍',     // 0 yanlış
      '🧍‍♂️',   // 1 yanlış
      '😰',     // 2 yanlış
      '😨',     // 3 yanlış
      '😱',     // 4 yanlış
      '😵',     // 5 yanlış
      '💀'      // 6 yanlış (oyun bitti)
    ];
    
    return (
      <Animated.View 
        style={[
          styles.hangmanContainer,
          animateError && styles.hangmanContainerError,
          { transform: [{ scale: hangmanAnimation }] }
        ]}
      >
        <Animated.Text 
          style={[
            styles.hangmanText,
            animateError && styles.hangmanTextError,
            { transform: [{ scale: errorAnimation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.3, 1]
            }) }] }
          ]}
        >
          {hangmanStages[wrongGuesses]}
        </Animated.Text>
        <Text style={styles.wrongGuessText}>
          Yanlış Tahmin: {wrongGuesses}/{maxWrongGuesses}
        </Text>
      </Animated.View>
    );
  };

  const renderKeyboard = () => {
    // Klavye düzeni (3 satır)
    const keyboard = [
      alphabet.slice(0, 9),
      alphabet.slice(9, 18),
      alphabet.slice(18)
    ];
    
    return (
      <View style={styles.keyboardContainer}>
        {keyboard.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keyboardRow}>
            {row.map((letter) => (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.keyButton,
                  guessedLetters.includes(letter) && styles.usedKeyButton,
                  currentWord && currentWord.english.toLowerCase().includes(letter) && 
                  guessedLetters.includes(letter) && styles.correctKeyButton
                ]}
                onPress={() => handleLetterPress(letter)}
                disabled={guessedLetters.includes(letter) || !gameActive}
              >
                <Text style={[
                  styles.keyButtonText,
                  guessedLetters.includes(letter) && styles.usedKeyButtonText,
                  currentWord && currentWord.english.toLowerCase().includes(letter) && 
                  guessedLetters.includes(letter) && styles.correctKeyButtonText
                ]}>
                  {letter.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
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
        <Text style={styles.title}>Kelime Tahmin</Text>
      </View>
      
      {/* Bilgi Paneli */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>SKOR</Text>
          <Animated.Text 
            style={[
              styles.infoValue,
              { transform: [{ scale: scoreAnimation }] }
            ]}
          >
            {score}
          </Animated.Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>KELİME</Text>
          <Text style={styles.infoValue}>{round}/{totalRounds}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>REKOR</Text>
          <Text style={styles.infoValue}>{highScore}</Text>
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
      
      {/* Adam Asmaca Gösterimi */}
      {renderHangman()}
      
      {/* İpucu */}
      {currentWord && (
        <View style={styles.hintContainer}>
          <View style={styles.hintHeader}>
            <Text style={styles.hintLabel}>İPUCU</Text>
            {gameActive && !hintUsed && (
              <TouchableOpacity
                style={styles.hintButton}
                onPress={handleShowHint}
                disabled={revealedLetters >= 2}
              >
                <Text style={styles.hintButtonText}>
                  {revealedLetters < 2 ? `İpucu Göster (-5p)` : 'İpucu Kullanıldı'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Animated.Text 
            style={[
              styles.hintText,
              { transform: [{ scale: hintAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.1]
              }) }] }
            ]}
          >
            {currentWord.turkish}
          </Animated.Text>
        </View>
      )}
      
      {/* Kelime Gösterimi */}
      <Animated.View 
        style={[
          styles.wordContainer,
          { transform: [{ scale: successAnimation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1.1, 1]
          }) }] }
        ]}
      >
        {currentWord && currentWord.english.toLowerCase().split('').map((letter, index) => (
          <View 
            key={`letter-${index}`}
            style={[
              styles.letterBox,
              guessedLetters.includes(letter) && styles.guessedLetterBox
            ]}
          >
            <Text style={[
              styles.letterBoxText,
              guessedLetters.includes(letter) && styles.guessedLetterText
            ]}>
              {guessedLetters.includes(letter) ? letter.toUpperCase() : wrongGuesses >= maxWrongGuesses ? letter.toUpperCase() : ''}
            </Text>
          </View>
        ))}
      </Animated.View>
      
      {/* Klavye */}
      {renderKeyboard()}
      
      {/* Yeniden Başlat Butonu */}
      {!gameActive && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetGame}
        >
          <Text style={styles.resetButtonText}>Yeniden Başlat</Text>
        </TouchableOpacity>
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
  hangmanContainerError: {
    backgroundColor: `${COLORS.danger}20`,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  hangmanTextError: {
    transform: [{ scale: 1.2 }],
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
    textAlign: 'center',
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
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: SPACING.m,
  },
  guessedLetterBox: {
    borderBottomColor: COLORS.success,
  },
  letterBox: {
    width: 35,
    height: 35,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  letterBoxText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  guessedLetterText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  keyboardContainer: {
    marginTop: SPACING.s,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  keyButton: {
    width: 30,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    ...SHADOWS.small,
  },
  usedKeyButton: {
    backgroundColor: COLORS.border,
  },
  correctKeyButton: {
    backgroundColor: COLORS.success,
  },
  keyButtonText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: 'white',
  },
  usedKeyButtonText: {
    color: COLORS.textSecondary,
  },
  correctKeyButtonText: {
    color: 'white',
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    paddingVertical: SPACING.m,
    alignItems: 'center',
    marginTop: SPACING.m,
    ...SHADOWS.medium,
  },
  resetButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: 'white',
  },
  hangmanContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.small,
    transition: 'all 0.3s ease',
  },
  hangmanText: {
    fontSize: 48,
    marginBottom: SPACING.s,
  },
  wrongGuessText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
});

export default WordGuessScreen; 