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
import { fetchWordsByCategory } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const CategoryWordsScreen = ({ route, navigation }) => {
  const { category } = route.params;
  const dispatch = useDispatch();
  const { currentCategoryWords, loading, error } = useSelector(state => state.words);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);

  useEffect(() => {
    dispatch(fetchWordsByCategory(category.id));
    
    // Sayfadan ayrılırken konuşmayı durdur
    return () => {
      Speech.stop();
    };
  }, [dispatch, category]);

  useEffect(() => {
    if (currentCategoryWords) {
      setFilteredWords(
        currentCategoryWords.filter(word => 
          word.english.toLowerCase().includes(searchQuery.toLowerCase()) || 
          word.turkish.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, currentCategoryWords]);

  // Konuşma durumunu dinle
  useEffect(() => {
    // Web dışı platformlarda Speech event listener'ları desteklenmiyor
    // Bu nedenle herhangi bir dinleyici eklemeye gerek yok
    // Konuşma durumu doğrudan handleSpeak ve handleSpeakAll fonksiyonlarında yönetilecek
    
    return () => {
      // Temizleme işlemi
      Speech.stop();
    };
  }, []);

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
      
      // Haptic geri bildirim ver
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
          console.log('Konuşma başladı:', text);
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
    
    // Konuşma başladı olarak işaretle
    setIsSpeaking(true);
    
    // Her kelime arasında 1.5 saniye bekleyerek sırayla oku
    let index = 0;
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

  const renderWordItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.wordCard}
      onPress={() => navigation.navigate('WordDetail', { word: item })}
    >
      <View style={styles.wordHeader}>
        <Text style={styles.englishWord}>{item.english}</Text>
        <TouchableOpacity 
          style={[
            styles.speakButton,
            currentSpeakingId === item.id && styles.speakButtonActive
          ]}
          onPress={() => handleSpeak(item.english, item.id)}
        >
          <Ionicons 
            name={currentSpeakingId === item.id ? "volume-high" : "volume-medium"} 
            size={24} 
            color={currentSpeakingId === item.id ? COLORS.primary : COLORS.textSecondary} 
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.turkishWord}>{item.turkish}</Text>
      {item.example_sentence && (
        <Text style={styles.exampleSentence}>
          <Text style={styles.exampleLabel}>Örnek: </Text>
          {item.example_sentence}
        </Text>
      )}
      <View style={styles.wordFooter}>
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
      <View style={styles.header}>
        <Text style={styles.title}>{category.name}</Text>
        <Text style={styles.subtitle}>{category.description}</Text>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>Kelimeler yüklenirken bir hata oluştu.</Text>
      ) : filteredWords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Arama sonucu bulunamadı.' : 'Bu kategoride kelime bulunmuyor.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          renderItem={renderWordItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.wordsList}
        />
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Quiz', { categoryId: category.id })}
        >
          <Text style={styles.buttonText}>Quiz Başlat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.m,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.8)',
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
  speakButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: SPACING.s,
  },
  speakButtonActive: {
    backgroundColor: 'rgba(0,120,255,0.1)',
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
    justifyContent: 'flex-end',
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
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: SPACING.l,
  },
  buttonContainer: {
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
});

export default CategoryWordsScreen; 