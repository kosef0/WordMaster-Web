import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { RootState, AppDispatch } from '../store';
import { Word, UserWord, getUserWords, updateWordLearningStatus } from '../database/db';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type MyWordsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MyWords'>;

type MyWordsScreenProps = {
  navigation: MyWordsScreenNavigationProp;
};

// Word ve UserWord tiplerinin birleşimi
type WordWithStatus = Word & {
  is_learned?: boolean;
  last_practiced?: string;
  familiarity_level?: number;
  user_id?: number;
  word_id?: number;
};

interface WordsState {
  words: WordWithStatus[];
  loading: boolean;
  error: string | null;
}

const MyWordsScreen: React.FC<MyWordsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userWords, setUserWords] = useState<WordWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState<WordWithStatus[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'learned', 'learning'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<number | null>(null);

  // Kullanıcının kelimelerini getir
  const fetchUserWordsData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const words = await getUserWords(user.id);
      // UserWord tipindeki verileri WordWithStatus tipine dönüştür
      const wordsWithStatus: WordWithStatus[] = words.map(userWord => {
        // Kelime detaylarını almak için veri tabanı sorgusu yapılabilir
        // Burada basit bir dönüşüm yapıyoruz
        return {
          id: userWord.word_id,
          english: '', // Bu alanlar veri tabanından doldurulmalı
          turkish: '',  // Bu alanlar veri tabanından doldurulmalı
          difficulty: 1, // Varsayılan değer
          category_id: 1, // Varsayılan değer
          is_learned: userWord.is_learned,
          familiarity_level: userWord.familiarity_level,
          last_practiced: userWord.last_practiced,
          user_id: userWord.user_id
        };
      });
      
      setUserWords(wordsWithStatus);
      setLoading(false);
    } catch (err) {
      console.error('Kelimeler yüklenirken hata:', err);
      setError('Kelimeler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  }, [user]);

  // Kelime öğrenme durumunu güncelle
  const handleUpdateLearningStatus = useCallback(async (
    wordId: number, 
    isLearned: boolean, 
    familiarityLevel: number
  ) => {
    if (!user?.id) return;
    
    try {
      await updateWordLearningStatus(user.id, wordId, isLearned, familiarityLevel);
      
      // Kelime listesini güncelle
      setUserWords(prevWords => 
        prevWords.map(word => 
          word.id === wordId 
            ? { ...word, is_learned: isLearned, familiarity_level: familiarityLevel }
            : word
        )
      );
    } catch (err) {
      console.error('Kelime durumu güncellenirken hata:', err);
      Alert.alert('Hata', 'Kelime durumu güncellenirken bir hata oluştu');
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchUserWordsData();
    }
    
    // Sayfadan ayrılırken konuşmayı durdur
    return () => {
      Speech.stop();
    };
  }, [fetchUserWordsData, user]);

  // Konuşma durumunu dinle - Speech API için özel işlem
  useEffect(() => {
    // Web dışı platformlarda Speech event listener'ları desteklenmiyor
    // Bu nedenle herhangi bir dinleyici eklemeye gerek yok
    // Konuşma durumu doğrudan handleSpeak ve handleSpeakAll fonksiyonlarında yönetilecek
    
    return () => {
      // Temizleme işlemi
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    // Filtreleme işlemi
    let filtered = [...userWords];
    
    // Arama sorgusuna göre filtrele
    if (searchQuery) {
      filtered = filtered.filter(word => 
        word.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.turkish.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Öğrenme durumuna göre filtrele
    if (selectedFilter === 'learned') {
      filtered = filtered.filter(word => word.is_learned);
    } else if (selectedFilter === 'learning') {
      filtered = filtered.filter(word => !word.is_learned);
    }
    
    setFilteredWords(filtered);
  }, [userWords, searchQuery, selectedFilter]);

  const handleSpeak = useCallback((text: string, wordId: number) => {
    try {
      // Eğer şu anda konuşuyorsa durdur
      if (isSpeaking) {
        Speech.stop();
        // Eğer aynı kelime ise sadece durdur ve çık
        if (currentSpeakingId === wordId) {
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
          return;
        }
      }
      
      // Dokunsal geri bildirim
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Konuşma başladı olarak işaretle
      setIsSpeaking(true);
      setCurrentSpeakingId(wordId);
      
      // Kelimeyi seslendir
      Speech.speak(text, { 
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onStart: () => {
          console.log('Konuşma başladı');
          setIsSpeaking(true);
        },
        onDone: () => {
          console.log('Konuşma tamamlandı');
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
        },
        onStopped: () => {
          console.log('Konuşma durduruldu');
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
        },
        onError: (error) => {
          console.error('Telaffuz hatası:', error);
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
          Alert.alert("Hata", "Sesli telaffuz sırasında bir hata oluştu.");
        }
      });
    } catch (error) {
      console.error('Telaffuz işlemi başlatılamadı:', error);
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      Alert.alert("Hata", "Telaffuz özelliği kullanılamıyor.");
    }
  }, [isSpeaking, currentSpeakingId]);

  // Tüm kelimeleri sesli oku
  const handleSpeakAll = useCallback(() => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }
    
    if (filteredWords.length === 0) {
      Alert.alert("Bilgi", "Okunacak kelime bulunamadı.");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Her kelime arasında 1.5 saniye bekleyerek sırayla oku
    let index = 0;
    
    // Konuşma başladı olarak işaretle
    setIsSpeaking(true);
    
    const speakNext = () => {
      if (index < filteredWords.length) {
        const currentWord = filteredWords[index];
        setCurrentSpeakingId(currentWord.id);
        
        // İngilizce kelimeyi oku
        Speech.speak(currentWord.english, { 
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
          onStart: () => {
            console.log(`Kelime okunuyor: ${currentWord.english}`);
          },
          onDone: () => {
            // 1 saniye bekle ve sonraki kelimeye geç
            setTimeout(() => {
              index++;
              speakNext();
            }, 1500);
          },
          onStopped: () => {
            // Kullanıcı tarafından durdurulmuşsa
            console.log('Tüm kelimelerin okunması durduruldu');
            setIsSpeaking(false);
            setCurrentSpeakingId(null);
          },
          onError: (error) => {
            console.error('Kelime okuma hatası:', error);
            // Hata olsa da devam et
            setTimeout(() => {
              index++;
              speakNext();
            }, 500);
          }
        });
      } else {
        // Tüm kelimeler okunduktan sonra
        console.log('Tüm kelimeler okundu');
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
      }
    };
    
    speakNext();
  }, [filteredWords, isSpeaking]);

  const handleToggleLearned = (word: WordWithStatus) => {
    if (!user?.id) return;
    
    const newStatus = !word.is_learned;
    const familiarityLevel = newStatus ? 
      Math.min((word.familiarity_level || 0) + 1, 5) : 
      Math.max((word.familiarity_level || 0) - 1, 0);
    
    handleUpdateLearningStatus(word.id, newStatus, familiarityLevel);
    
    // Dokunsal geri bildirim
    Haptics.notificationAsync(
      newStatus 
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
  };

  const renderWordItem = ({ item }: { item: WordWithStatus }) => (
    <View style={styles.wordCard}>
      <View style={styles.wordHeader}>
        <Text style={styles.englishWord}>{item.english}</Text>
        <View style={styles.wordActions}>
          <TouchableOpacity 
            style={[
              styles.speakButton,
              currentSpeakingId === item.id && styles.speakButtonActive
            ]}
            onPress={() => handleSpeak(item.english, item.id)}
          >
            <Ionicons 
              name={currentSpeakingId === item.id ? "volume-high" : "volume-medium"} 
              size={22} 
              color={currentSpeakingId === item.id ? COLORS.primary : COLORS.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.learnedButton}
            onPress={() => handleToggleLearned(item)}
          >
            <Ionicons 
              name={item.is_learned ? "checkmark-circle" : "book-outline"} 
              size={22} 
              color={item.is_learned ? COLORS.success : COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.turkishWord}>{item.turkish}</Text>
      {item.example_sentence && (
        <Text style={styles.exampleSentence}>
          <Text style={styles.exampleLabel}>Örnek: </Text>
          {item.example_sentence}
        </Text>
      )}
      <View style={styles.wordFooter}>
        <View style={styles.familiarityContainer}>
          <Text style={styles.familiarityLabel}>Aşinalık: </Text>
          <View style={styles.familiarityBar}>
            {[1, 2, 3, 4, 5].map(level => (
              <View 
                key={level}
                style={[
                  styles.familiarityDot,
                  level <= (item.familiarity_level || 0) && styles.familiarityDotActive
                ]}
              />
            ))}
          </View>
        </View>
        <Text style={[styles.difficultyBadge, {
          backgroundColor: 
            item.difficulty === 1 ? '#4cc9f0' : 
            item.difficulty === 2 ? '#f77f00' : '#e63946'
        }]}>
          {item.difficulty === 1 ? 'Kolay' : item.difficulty === 2 ? 'Orta' : 'Zor'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kelimelerim</Text>
        <Text style={styles.subtitle}>
          Öğrendiğiniz ve öğrenmekte olduğunuz kelimeler
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kelime ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.speakAllButton}
          onPress={handleSpeakAll}
        >
          <Ionicons 
            name={isSpeaking ? "stop-circle" : "play-circle"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.speakAllText}>
            {isSpeaking ? "Durdur" : "Tümünü Dinle"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'learned' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('learned')}
        >
          <Text style={[styles.filterText, selectedFilter === 'learned' && styles.filterTextActive]}>
            Öğrenilen
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, selectedFilter === 'learning' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('learning')}
        >
          <Text style={[styles.filterText, selectedFilter === 'learning' && styles.filterTextActive]}>
            Öğrenilmeyen
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {filteredWords.length} kelime bulundu
          </Text>
          
          <FlatList
            data={filteredWords}
            renderItem={renderWordItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.wordsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Henüz kelime yok</Text>
                <Text style={styles.emptySubtext}>
                  Kelime kategorilerinden kelime ekleyebilirsiniz
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.l,
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginBottom: SPACING.s,
  },
  searchIcon: {
    marginRight: SPACING.s,
    marginLeft: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.medium,
  },
  speakAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    padding: SPACING.s,
  },
  speakAllText: {
    color: '#fff',
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: SPACING.s,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.s,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    borderRadius: SIZES.base,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultCount: {
    padding: SPACING.m,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordsList: {
    padding: SPACING.m,
  },
  wordCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  englishWord: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  wordActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: SPACING.s,
  },
  speakButtonActive: {
    backgroundColor: 'rgba(0,120,255,0.1)',
  },
  learnedButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: SPACING.s,
  },
  turkishWord: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  exampleSentence: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.s,
  },
  exampleLabel: {
    fontWeight: 'bold',
    fontStyle: 'normal',
  },
  wordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  familiarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familiarityLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  familiarityBar: {
    flexDirection: 'row',
  },
  familiarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginRight: 3,
  },
  familiarityDotActive: {
    backgroundColor: COLORS.success,
  },
  difficultyBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    fontSize: SIZES.small,
    color: '#fff',
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  emptyText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.s,
  },
  emptySubtext: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  }
});

export default MyWordsScreen; 