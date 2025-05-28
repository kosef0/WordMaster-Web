import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserWords, updateLearningStatus } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const MyWordsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { userWords, loading, error } = useSelector(state => state.words);
  const { user } = useSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'learned', 'learning'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchUserWords(user.id));
    }
    
    // Sayfadan ayrılırken konuşmayı durdur
    return () => {
      Speech.stop();
    };
  }, [dispatch, user]);

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
    if (userWords) {
      let filtered = userWords;
      
      // Filtre uygula
      if (filter === 'learned') {
        filtered = filtered.filter(word => word.is_learned === 1);
      } else if (filter === 'learning') {
        filtered = filtered.filter(word => word.is_learned === 0);
      }
      
      // Arama sorgusu uygula
      if (searchQuery) {
        filtered = filtered.filter(word => 
          word.english.toLowerCase().includes(searchQuery.toLowerCase()) || 
          word.turkish.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setFilteredWords(filtered);
    }
  }, [searchQuery, userWords, filter]);

  const handleSpeak = useCallback((text, wordId) => {
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
      console.error('Telaffuz hatası:', error);
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      Alert.alert("Hata", "Telaffuz özelliği kullanılamıyor.");
    }
  }, [isSpeaking, currentSpeakingId]);

  // Tüm kelimeleri sesli oku
  const handleSpeakAll = () => {
    if (isSpeaking) {
      Speech.stop();
      return;
    }
    
    if (filteredWords.length === 0) {
      Alert.alert("Bilgi", "Okunacak kelime bulunamadı.");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Her kelime arasında 1.5 saniye bekleyerek sırayla oku
    let index = 0;
    const speakNext = () => {
      if (index < filteredWords.length) {
        const currentWord = filteredWords[index];
        setCurrentSpeakingId(currentWord.id);
        
        // İngilizce ve Türkçe kelimeleri oku
        Speech.speak(currentWord.english, { 
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
          onDone: () => {
            // 1 saniye bekle ve sonraki kelimeye geç
            setTimeout(() => {
              index++;
              speakNext();
            }, 1500);
          }
        });
      } else {
        // Tüm kelimeler okunduktan sonra
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
      }
    };
    
    speakNext();
  };

  const handleToggleLearned = (word) => {
    if (!user) return;
    
    const newStatus = word.is_learned === 1 ? 0 : 1;
    const familiarityLevel = newStatus === 1 
      ? Math.min((word.familiarity_level || 0) + 1, 5)
      : word.familiarity_level || 0;
    
    dispatch(updateLearningStatus({
      userId: user.id,
      wordId: word.id,
      isLearned: newStatus,
      familiarityLevel
    }));
    
    // Dokunsal geri bildirim
    Haptics.notificationAsync(
      newStatus === 1 
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
  };

  const renderWordItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.wordCard}
      onPress={() => navigation.navigate('WordDetail', { word: item })}
    >
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
              name={item.is_learned === 1 ? "checkmark-circle" : "book-outline"} 
              size={22} 
              color={item.is_learned === 1 ? COLORS.success : COLORS.textSecondary} 
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'learned' && styles.filterButtonActive]}
          onPress={() => setFilter('learned')}
        >
          <Text style={[styles.filterText, filter === 'learned' && styles.filterTextActive]}>
            Öğrenilen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'learning' && styles.filterButtonActive]}
          onPress={() => setFilter('learning')}
        >
          <Text style={[styles.filterText, filter === 'learning' && styles.filterTextActive]}>
            Öğreniliyor
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Kelimeler yüklenirken bir hata oluştu.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => user && dispatch(fetchUserWords(user.id))}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : filteredWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'Arama sonucu bulunamadı.' 
              : filter !== 'all'
                ? `${filter === 'learned' ? 'Öğrenilen' : 'Öğreniliyor'} kelime bulunamadı.`
                : 'Henüz kelime öğrenmeye başlamadınız.'}
          </Text>
          {filter === 'all' && !searchQuery && (
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Kategorilere Göz At</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          renderItem={renderWordItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.wordsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    marginBottom: SPACING.m,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  browseButton: {
    marginTop: SPACING.m,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MyWordsScreen; 