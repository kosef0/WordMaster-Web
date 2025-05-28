import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
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
  WordHunt: undefined;
};

type WordHuntScreenProps = StackScreenProps<RootStackParamList, 'WordHunt'>;

interface Word {
  id: number;
  english: string;
  turkish: string;
}

interface FallingWord {
  id: string;
  word: string;
  translation: string;
  x: number;
  y: number;
  speed: number;
  isCorrect: boolean;
}

const { width, height } = Dimensions.get('window');

const WordHuntScreen: React.FC<WordHuntScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState<boolean>(true);
  const [words, setWords] = useState<Word[]>([]);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [lives, setLives] = useState<number>(3);
  const [level, setLevel] = useState<number>(1);
  const [categoryName, setCategoryName] = useState<string>('Karışık');
  
  // Oyun durumu
  const gameInterval = useRef<NodeJS.Timeout | null>(null);
  const wordSpawnInterval = useRef<NodeJS.Timeout | null>(null);
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const gameSpeed = useRef(1).current;

  useEffect(() => {
    loadWords();
    loadHighScore();
    return () => {
      // Temizlik işlemleri
      if (gameInterval.current) clearInterval(gameInterval.current);
      if (wordSpawnInterval.current) clearInterval(wordSpawnInterval.current);
    };
  }, []);

  useEffect(() => {
    if (words.length > 0 && !gameOver) {
      startGame();
    }
  }, [words, gameOver]);

  useEffect(() => {
    // Can bitince oyun biter
    if (lives <= 0 && !gameOver) {
      endGame();
    }
  }, [lives]);

  const loadWords = async () => {
    try {
      setLoading(true);
      // Karışık kategorilerden kelimeler al
      const categoryIds = [65, 68, 69]; // Örnek kategori ID'leri
      let allWords: Word[] = [];
      
      for (const categoryId of categoryIds) {
        const wordsData = await getWordsByCategory(categoryId);
        if (wordsData && wordsData.length > 0) {
          allWords = [...allWords, ...wordsData];
        }
      }
      
      if (allWords.length > 0) {
        // Kelime listesini karıştır
        const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
        setWords(shuffledWords);
      } else {
        Alert.alert('Hata', 'Kelimeler yüklenemedi.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Kelimeler yüklenirken hata:', error);
      Alert.alert('Hata', 'Kelimeler yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const loadHighScore = async () => {
    if (user) {
      const score = await getUserHighScore(user.user_id || 0, 'wordhunt');
      setHighScore(score);
    }
  };

  const startGame = () => {
    // Oyunu başlat
    if (gameInterval.current) clearInterval(gameInterval.current);
    if (wordSpawnInterval.current) clearInterval(wordSpawnInterval.current);
    
    // Düşen kelimeleri hareket ettir
    gameInterval.current = setInterval(() => {
      setFallingWords(prevWords => {
        const updatedWords = prevWords.map(word => ({
          ...word,
          y: word.y + word.speed
        }));
        
        // Ekrandan çıkan kelimeleri kontrol et
        const remainingWords = updatedWords.filter(word => {
          if (word.y > height - 100) {
            // Doğru kelime kaçtıysa can azalt
            if (word.isCorrect) {
              setLives(prev => prev - 1);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            return false;
          }
          return true;
        });
        
        return remainingWords;
      });
    }, 50);
    
    // Yeni kelimeler ekle
    wordSpawnInterval.current = setInterval(() => {
      addNewFallingWord();
    }, 2000 / gameSpeed);
  };

  const addNewFallingWord = () => {
    if (words.length === 0) return;
    
    // Rastgele bir kelime seç
    const randomIndex = Math.floor(Math.random() * words.length);
    const selectedWord = words[randomIndex];
    
    // Doğru veya yanlış kelime-çeviri çifti oluştur (50% şans)
    const isCorrect = Math.random() > 0.5;
    let translation = selectedWord.turkish;
    
    if (!isCorrect) {
      // Yanlış çeviri için başka bir kelime seç
      const otherWords = words.filter(w => w.id !== selectedWord.id);
      if (otherWords.length > 0) {
        const randomOtherIndex = Math.floor(Math.random() * otherWords.length);
        translation = otherWords[randomOtherIndex].turkish;
      }
    }
    
    // Yeni düşen kelime oluştur
    const newWord: FallingWord = {
      id: `word-${Date.now()}-${Math.random()}`,
      word: selectedWord.english,
      translation: translation,
      x: Math.random() * (width - 150),
      y: -50,
      speed: 1 + Math.random() * 2 * gameSpeed,
      isCorrect
    };
    
    setFallingWords(prev => [...prev, newWord]);
  };

  const handleWordPress = (word: FallingWord) => {
    // Kelimeye tıklandığında
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Doğru eşleşme kontrolü
    if (word.isCorrect) {
      // Doğru kelime
      setScore(prev => prev + 10);
      
      // Skor animasyonu
      Animated.sequence([
        Animated.timing(scoreAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(scoreAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Yanlış kelime
      setLives(prev => prev - 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Kelimeyi kaldır
    setFallingWords(prev => prev.filter(w => w.id !== word.id));
  };

  const endGame = async () => {
    setGameOver(true);
    
    // Aralıkları temizle
    if (gameInterval.current) clearInterval(gameInterval.current);
    if (wordSpawnInterval.current) clearInterval(wordSpawnInterval.current);
    
    // Skoru kaydet
    if (user) {
      try {
        await saveGameScore('wordhunt', score);
        await saveGameScoreToLocalDB(user.user_id || 0, 'wordhunt', score);
        
        // Yüksek skor güncelleme
        if (score > highScore) {
          setHighScore(score);
        }
      } catch (error) {
        console.error('Skor kaydedilirken hata:', error);
      }
    }
    
    // Sonuç mesajı
    Alert.alert(
      'Oyun Bitti',
      `Puanınız: ${score}`,
      [
        { text: 'Tekrar Oyna', onPress: resetGame },
        { text: 'Oyunlar Menüsüne Dön', onPress: () => navigation.navigate('Games') }
      ]
    );
  };

  const resetGame = () => {
    setFallingWords([]);
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    
    // Kelimeleri yeniden karıştır
    setWords(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Kelimeler yükleniyor...</Text>
      </View>
    );
  }

  if (words.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>Kelimeler yüklenemedi.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWords}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Kelime Avı</Text>
      </View>
      
      {/* Üst Bilgi Paneli */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <Ionicons name="heart" size={20} color={COLORS.danger} />
          <Text style={styles.infoValue}>{lives}</Text>
        </View>
        <Animated.View style={[styles.infoItem, { transform: [{ scale: scoreAnim }] }]}>
          <Text style={styles.infoLabel}>Puan:</Text>
          <Text style={styles.infoValue}>{score}</Text>
        </Animated.View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>En Yüksek:</Text>
          <Text style={styles.infoValue}>{highScore}</Text>
        </View>
      </View>
      
      {/* Oyun Alanı */}
      <View style={styles.gameArea}>
        {fallingWords.map((word) => (
          <TouchableOpacity
            key={word.id}
            style={[
              styles.fallingWord,
              { 
                left: word.x,
                top: word.y,
                backgroundColor: word.isCorrect ? COLORS.primary : COLORS.warning
              }
            ]}
            onPress={() => handleWordPress(word)}
          >
            <Text style={styles.wordText}>{word.word}</Text>
            <Text style={styles.translationText}>{word.translation}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Bilgi Notu */}
      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.noteText}>
          Doğru kelime-çeviri eşleşmelerini yakalayın. Yanlış eşleşmelere dokunmayın!
        </Text>
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
  gameArea: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    overflow: 'hidden',
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  fallingWord: {
    position: 'absolute',
    padding: SPACING.s,
    borderRadius: SIZES.base,
    minWidth: 120,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  wordText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: SPACING.xs / 2,
  },
  translationText: {
    fontSize: SIZES.small,
    color: 'white',
    opacity: 0.9,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  noteText: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default WordHuntScreen; 