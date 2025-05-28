import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

const WordGameScreen = ({ route, navigation }) => {
  const { gameType } = route.params || { gameType: 'wordShuffle' };
  const { currentCategoryWords } = useSelector(state => state.words);
  const { user, profile } = useSelector(state => state.auth);
  
  const [loading, setLoading] = useState(true);
  const [gameWords, setGameWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Oyun için kelimeleri hazırla
  useEffect(() => {
    if (currentCategoryWords && currentCategoryWords.length > 0) {
      // Kelimeleri karıştır
      const shuffled = [...currentCategoryWords].sort(() => 0.5 - Math.random());
      // Sadece 5 harften uzun kelimeleri seç
      const filtered = shuffled.filter(word => word.english.length > 4);
      
      if (filtered.length > 0) {
        setGameWords(filtered.slice(0, 10)); // En fazla 10 kelime
        prepareCurrentWord(filtered[0]);
        setLoading(false);
      } else {
        Alert.alert(
          'Yetersiz Kelime',
          'Bu oyun için uygun kelime bulunamadı.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [currentCategoryWords]);
  
  // Zamanlayıcı
  useEffect(() => {
    if (!loading && !gameOver) {
      const timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            endGame();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [loading, gameOver]);
  
  const prepareCurrentWord = (word) => {
    if (!word) return;
    
    const letters = word.english.toUpperCase().split('');
    const shuffled = [...letters].sort(() => 0.5 - Math.random());
    
    setShuffledLetters(shuffled.map((letter, index) => ({
      id: index,
      letter,
      selected: false
    })));
    
    setSelectedLetters([]);
  };
  
  const handleLetterPress = (letter, index) => {
    if (letter.selected) return;
    
    // Animasyon
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    // Harf seçimini güncelle
    const updatedShuffled = shuffledLetters.map((l, i) => 
      i === index ? { ...l, selected: true } : l
    );
    setShuffledLetters(updatedShuffled);
    
    // Seçilen harfi ekle
    setSelectedLetters([...selectedLetters, letter]);
    
    // Tüm harfler seçildiyse kelimeyi kontrol et
    if (selectedLetters.length + 1 === gameWords[currentWordIndex].english.length) {
      const selectedWord = [...selectedLetters, letter].map(l => l.letter).join('');
      const correctWord = gameWords[currentWordIndex].english.toUpperCase();
      
      setTimeout(() => {
        if (selectedWord === correctWord) {
          // Doğru cevap
          setScore(score + 10);
          
          // Animasyon
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true
            })
          ]).start();
          
          // Sonraki kelimeye geç
          goToNextWord();
        } else {
          // Yanlış cevap
          Alert.alert(
            'Yanlış',
            `Doğru cevap: ${correctWord}`,
            [{ text: 'Tamam', onPress: () => goToNextWord() }]
          );
        }
      }, 500);
    }
  };
  
  const goToNextWord = () => {
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      prepareCurrentWord(gameWords[currentWordIndex + 1]);
    } else {
      endGame();
    }
  };
  
  const endGame = () => {
    setGameOver(true);
    
    // Puanı kaydet (gerçek uygulamada veritabanına kaydedilir)
    Alert.alert(
      'Oyun Bitti',
      `Toplam puanınız: ${score}`,
      [{ text: 'Ana Menüye Dön', onPress: () => navigation.navigate('Games') }]
    );
  };
  
  const handleSpeak = () => {
    if (gameWords[currentWordIndex]) {
      Speech.speak(gameWords[currentWordIndex].english, { language: 'en-US' });
    }
  };
  
  const resetCurrentWord = () => {
    prepareCurrentWord(gameWords[currentWordIndex]);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Oyun hazırlanıyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Üst Bilgi Çubuğu */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Puan</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Süre</Text>
          <Text style={[
            styles.timerValue, 
            timeLeft <= 10 && styles.timerWarning
          ]}>
            {timeLeft}
          </Text>
        </View>
      </View>
      
      {/* Kelime İpucu */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintLabel}>İpucu:</Text>
        <Text style={styles.hintValue}>{gameWords[currentWordIndex].turkish}</Text>
        <TouchableOpacity 
          style={styles.speakButton}
          onPress={handleSpeak}
        >
          <Text style={styles.speakButtonText}>🔊</Text>
        </TouchableOpacity>
      </View>
      
      {/* Seçilen Harfler */}
      <Animated.View 
        style={[
          styles.selectedLettersContainer,
          { opacity: fadeAnim }
        ]}
      >
        {gameWords[currentWordIndex] && (
          <View style={styles.letterSlots}>
            {Array.from({ length: gameWords[currentWordIndex].english.length }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.letterSlot,
                  selectedLetters[index] && styles.letterSlotFilled
                ]}
              >
                {selectedLetters[index] && (
                  <Text style={styles.selectedLetter}>
                    {selectedLetters[index].letter}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Animated.View>
      
      {/* Karıştırılmış Harfler */}
      <View style={styles.shuffledLettersContainer}>
        <View style={styles.shuffledLetters}>
          {shuffledLetters.map((letter, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.letterButton,
                letter.selected && styles.letterButtonSelected
              ]}
              onPress={() => !letter.selected && handleLetterPress(letter, index)}
              disabled={letter.selected}
            >
              <Animated.Text 
                style={[
                  styles.letterButtonText,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                {letter.letter}
              </Animated.Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Kontrol Butonları */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={resetCurrentWord}
        >
          <Text style={styles.controlButtonText}>🔄 Yeniden Karıştır</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.skipButton]}
          onPress={goToNextWord}
        >
          <Text style={styles.controlButtonText}>⏭️ Kelimeyi Geç</Text>
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
  loadingText: {
    marginTop: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.l,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  scoreLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  scoreValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  timerLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  timerValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  timerWarning: {
    color: COLORS.danger,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    marginBottom: SPACING.l,
    ...SHADOWS.small,
  },
  hintLabel: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: SPACING.s,
  },
  hintValue: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    flex: 1,
  },
  speakButton: {
    padding: SPACING.xs,
  },
  speakButtonText: {
    fontSize: SIZES.large,
  },
  selectedLettersContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  letterSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  letterSlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  letterSlotFilled: {
    borderBottomColor: COLORS.primary,
  },
  selectedLetter: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shuffledLettersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffledLetters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: width - SPACING.m * 2,
  },
  letterButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.s,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  letterButtonSelected: {
    backgroundColor: COLORS.border,
  },
  letterButtonText: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.l,
  },
  controlButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  skipButton: {
    backgroundColor: COLORS.warning,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
});

export default WordGameScreen; 