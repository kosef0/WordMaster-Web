import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWordsByCategory, fetchCategories } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS, GRADIENTS } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState, AppDispatch } from '../store';
import { Category, Word } from '../database/db';
import { getCategoryImageByName } from '../utils/categoryUtils';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Öğrenme durumu için tip tanımlaması
type LearningStatus = 'not_learned' | 'learning' | 'well_known' | 'mastered';

// Kelime tipini genişletiyoruz
interface WordWithStatus extends Word {
  learningStatus?: LearningStatus;
}

type RootStackParamList = {
  CategoryWords: { category: Category };
  WordDetail: { word: Word };
  Home: undefined;
  Quizzes: { categoryId?: number };
};

type CategoryWordsScreenProps = StackScreenProps<RootStackParamList, 'CategoryWords'>;

const CategoryWordsScreen: React.FC<CategoryWordsScreenProps> = ({ navigation, route }) => {
  const { category } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentCategoryWords, loading, error, categories } = useSelector((state: RootState) => state.words);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWords, setFilteredWords] = useState<WordWithStatus[]>([]);
  const [sortOrder, setSortOrder] = useState<'az' | 'za' | 'difficulty'>('az');
  const [words, setWords] = useState<WordWithStatus[]>([]);
  const [showCategories, setShowCategories] = useState(category.id === 0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<number | null>(null);
  
  // Öğrenme durumu modalı için state'ler
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordWithStatus | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LearningStatus | null>(null);

  useEffect(() => {
    if (category.id === 0) {
      // Tüm kategorileri getir
      dispatch(fetchCategories());
      setShowCategories(true);
    } else {
      // Belirli bir kategorinin kelimelerini getir
      dispatch(fetchWordsByCategory(category.id));
      setShowCategories(false);
    }
  }, [dispatch, category.id]);

  useEffect(() => {
    // Redux üzerinden gelen verileri kullan
    if (!showCategories && currentCategoryWords && Array.isArray(currentCategoryWords)) {
      console.log(`Redux'tan gelen kelime sayısı: ${currentCategoryWords.length}`);
      // Kelimelere varsayılan öğrenme durumu ekle
      const wordsWithStatus = currentCategoryWords.map(word => ({
        ...word,
        learningStatus: 'not_learned' as LearningStatus
      }));
      setWords(wordsWithStatus);
      setFilteredWords(wordsWithStatus);
    }
  }, [currentCategoryWords, showCategories]);

  // Hata durumunda uyarı göster
  useEffect(() => {
    if (error) {
      Alert.alert(
        "Hata",
        `Veriler yüklenirken bir hata oluştu: ${error}`,
        [{ text: "Tamam", onPress: () => console.log("Tamam") }]
      );
    }
  }, [error]);

  useEffect(() => {
    if (!showCategories) {
      // Filtreleme ve sıralama işlemi
      let filtered = [...words];
      
      // Arama sorgusuna göre filtrele
      if (searchQuery) {
        filtered = filtered.filter(word => 
          word.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
          word.turkish.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sıralama işlemi
      switch (sortOrder) {
        case 'az':
          filtered.sort((a, b) => a.english.localeCompare(b.english));
          break;
        case 'za':
          filtered.sort((a, b) => b.english.localeCompare(a.english));
          break;
        case 'difficulty':
          filtered.sort((a, b) => a.difficulty - b.difficulty);
          break;
      }
      
      setFilteredWords(filtered);
    }
  }, [words, searchQuery, sortOrder, showCategories]);

  const handleWordListen = (word: Word) => {
    try {
      // Eğer şu anda konuşuyorsa durdur
      if (isSpeaking) {
        Speech.stop();
        // Eğer aynı kelime ise sadece durdur ve çık
        if (currentSpeakingId === word.id) {
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
          return;
        }
      }
      
      // Dokunsal geri bildirim
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Konuşma başladı olarak işaretle
      setIsSpeaking(true);
      setCurrentSpeakingId(word.id);
      
      // Kelimeyi seslendir
      Speech.speak(word.english, { 
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onStart: () => {
          console.log('Konuşma başladı:', word.english);
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
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!showCategories) {
      if (text.trim() === '') {
        setFilteredWords(words);
      } else {
        const filtered = words.filter(
          word => 
            word.english.toLowerCase().includes(text.toLowerCase()) || 
            word.turkish.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredWords(filtered);
      }
    }
  };

  const handleStartQuiz = () => {
    navigation.navigate('Quizzes', { categoryId: category.id });
  };

  // Öğrenme durumunu güncelleme
  const handleUpdateLearningStatus = (word: WordWithStatus) => {
    setSelectedWord(word);
    setSelectedStatus(word.learningStatus || 'not_learned');
    setModalVisible(true);
  };

  // Öğrenme durumunu kaydetme
  const handleSaveLearningStatus = () => {
    if (selectedWord && selectedStatus) {
      // Kelimenin öğrenme durumunu güncelle
      const updatedWords = words.map(word => {
        if (word.id === selectedWord.id) {
          return { ...word, learningStatus: selectedStatus };
        }
        return word;
      });
      
      setWords(updatedWords);
      // Filtrelenmiş kelimeleri de güncelle
      setFilteredWords(
        filteredWords.map(word => {
          if (word.id === selectedWord.id) {
            return { ...word, learningStatus: selectedStatus };
          }
          return word;
        })
      );
      
      // TODO: Burada API'ye öğrenme durumunu kaydetme işlemi yapılabilir
      
      // Modalı kapat
      setModalVisible(false);
      setSelectedWord(null);
    }
  };

  // Öğrenme durumuna göre ikon ve renk belirle
  const getLearningStatusInfo = (status: LearningStatus | undefined) => {
    switch (status) {
      case 'learning':
        return { icon: 'ellipse-outline', color: '#f9c74f' };
      case 'well_known':
        return { icon: 'checkmark-circle-outline', color: '#2a9d8f' };
      case 'mastered':
        return { icon: 'checkmark-done-circle', color: '#4361ee' };
      case 'not_learned':
      default:
        return { icon: 'radio-button-off-outline', color: '#e5e5e5' };
    }
  };

  // Kategori seçme fonksiyonu
  const handleCategorySelect = (selectedCategory: Category) => {
    navigation.navigate('CategoryWords', { category: selectedCategory });
  };

  // Kategori kartı
  const renderCategoryItem = ({ item, index }: { item: Category; index: number }) => {
    // Her kategori için farklı bir renk 
    const gradientColors = [
      ['#FF9A8B', '#FF6B95'], // Kırmızımsı
      ['#A8EDEA', '#59C1BD'], // Turkuaz
      ['#FFD3A5', '#FD6585'], // Turuncu-Pembe
      ['#81FBB8', '#28C76F'], // Yeşil
      ['#CE9FFC', '#7367F0'], // Mor
      ['#90F7EC', '#32CCBC'], // Mavi-Yeşil
      ['#FFF886', '#F9A23F'], // Sarı-Turuncu
      ['#ABDCFF', '#0396FF'], // Mavi
    ];
    
    // Kategori adına göre ikon belirleme
    const getCategoryIcon = (name: string) => {
      const nameToLower = name.toLowerCase();
      if (nameToLower.includes('hayvan')) return 'paw-outline';
      if (nameToLower.includes('yiyecek') || nameToLower.includes('yemek') || nameToLower.includes('yiyecekler')) return 'restaurant-outline';
      if (nameToLower.includes('giyim') || nameToLower.includes('kıyafet')) return 'shirt-outline';
      if (nameToLower.includes('renk')) return 'color-palette-outline';
      if (nameToLower.includes('aile')) return 'people-outline';
      if (nameToLower.includes('arkadaş') || nameToLower.includes('friend')) return 'person-outline';
      if (nameToLower.includes('vücut') || nameToLower.includes('vucüt')) return 'body-outline';
      if (nameToLower.includes('şehir') || nameToLower.includes('ülke')) return 'location-outline';
      if (nameToLower.includes('spor')) return 'football-outline';
      if (nameToLower.includes('meslek')) return 'briefcase-outline';
      if (nameToLower.includes('sayı')) return 'calculator-outline';
      if (nameToLower.includes('color')) return 'color-palette-outline';
      return 'book-outline'; // Varsayılan ikon
    };
    
    // Kategori zorluğunu belirleme (kategori adına göre)
    const getCategoryDifficulty = (category: Category): string => {
      const nameToLower = category.name.toLowerCase();
      if (nameToLower.includes('temel') || nameToLower.includes('basit') || nameToLower.includes('kolay')) {
        return 'Kolay';
      } else if (nameToLower.includes('orta')) {
        return 'Orta';
      } else if (nameToLower.includes('zor') || nameToLower.includes('ileri')) {
        return 'Zor';
      }
      // Her kategori için varsayılan zorluk
      return 'Başlangıç';
    };
    
    // Renk indeksini belirle (dizi sınırlarını aşmaması için)
    const colorIndex = index % gradientColors.length;
    
    return (
      <TouchableOpacity 
        style={styles.categoryCard}
        onPress={() => handleCategorySelect(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={gradientColors[colorIndex]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryIconContainer}>
            <Ionicons 
              name={getCategoryIcon(item.name)} 
              size={28} 
              color="#FFFFFF" 
            />
          </View>
        </LinearGradient>
        
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle}>{item.name}</Text>
          
          <View style={styles.categoryMetaContainer}>
            <View style={styles.categoryCountContainer}>
              <Ionicons name="book-outline" size={14} color={COLORS.primary} />
              <Text style={styles.categoryCount}>{item.word_count || 0} kelime</Text>
            </View>
            
            <View style={styles.categoryLevelContainer}>
              <Ionicons name="stats-chart-outline" size={14} color={COLORS.primary} />
              <Text style={styles.categoryLevel}>{getCategoryDifficulty(item)}</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
            </View>
            <Text style={styles.progressText}>%0 tamamlandı</Text>
          </View>
          
          <View style={styles.categoryButtonsContainer}>
            <TouchableOpacity 
              style={styles.categoryLearnButton}
              onPress={() => handleCategorySelect(item)}
            >
              <Ionicons name="book-outline" size={16} color="#FFFFFF" />
              <Text style={styles.categoryButtonText}>Öğren</Text>
            </TouchableOpacity>
            
            {item.word_count && item.word_count > 0 ? (
              <TouchableOpacity 
                style={styles.categoryQuizButton}
                onPress={() => navigation.navigate('Quizzes', { categoryId: item.id })}
              >
                <Ionicons name="help-outline" size={16} color="#FFFFFF" />
                <Text style={styles.categoryButtonText}>Quiz</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderWordItem = ({ item }: { item: WordWithStatus }) => {
    const statusInfo = getLearningStatusInfo(item.learningStatus);
    
    return (
      <View style={styles.wordCard}>
        <View style={styles.wordHeader}>
          <Text style={styles.englishWord}>{item.english}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => handleUpdateLearningStatus(item)}
            >
              <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.listenButton,
                currentSpeakingId === item.id && styles.listenButtonActive
              ]}
              onPress={() => handleWordListen(item)}
            >
              <Ionicons 
                name={currentSpeakingId === item.id ? "volume-high" : "volume-medium"} 
                size={24} 
                color={currentSpeakingId === item.id ? COLORS.primary : COLORS.textSecondary} 
              />
            </TouchableOpacity>
            <View style={[styles.difficultyBadge, 
              item.difficulty === 1 ? styles.easyBadge : 
              item.difficulty === 2 ? styles.mediumBadge : 
              styles.hardBadge
            ]}>
              <Text style={styles.difficultyText}>
                {item.difficulty === 1 ? 'Kolay' : item.difficulty === 2 ? 'Orta' : 'Zor'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.turkishWord}>{item.turkish}</Text>
        
        {item.example_sentence && (
          <Text style={styles.exampleSentence}>
            <Text style={styles.exampleLabel}>Örnek: </Text>
            {item.example_sentence}
          </Text>
        )}
        
        {item.pronunciation && (
          <Text style={styles.pronunciation}>
            <Text style={styles.pronunciationLabel}>Telaffuz: </Text>
            {item.pronunciation}
          </Text>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.practiceButton}>
            <Ionicons name="reload-outline" size={18} color="#fff" />
            <Text style={[styles.actionButtonText, styles.practiceButtonText]}>Pratik Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Öğrenme durumu modalı
  const renderLearningStatusModal = () => {
    if (!selectedWord) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                İlerleme Güncelle - {selectedWord.english}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.wordTitle}>{selectedWord.english}</Text>
              <Text style={styles.wordTranslation}>{selectedWord.turkish}</Text>
              
              <Text style={styles.statusLabel}>Öğrenme Durumu</Text>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'not_learned' && styles.selectedStatusOption
                ]}
                onPress={() => setSelectedStatus('not_learned')}
              >
                <View style={styles.statusRadio}>
                  {selectedStatus === 'not_learned' && <View style={styles.statusRadioSelected} />}
                </View>
                <View style={styles.statusColorBox}>
                  <View style={[styles.statusColorIndicator, { backgroundColor: '#e63946' }]} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusText}>Öğrenilmemiş</Text>
                  <Text style={styles.statusDescription}>Bu kelimeyi henüz öğrenmediniz</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'learning' && styles.selectedStatusOption
                ]}
                onPress={() => setSelectedStatus('learning')}
              >
                <View style={styles.statusRadio}>
                  {selectedStatus === 'learning' && <View style={styles.statusRadioSelected} />}
                </View>
                <View style={styles.statusColorBox}>
                  <View style={[styles.statusColorIndicator, { backgroundColor: '#f9c74f' }]} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusText}>Öğreniyorum</Text>
                  <Text style={styles.statusDescription}>Bu kelimeyi öğrenmeye başladınız</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'well_known' && styles.selectedStatusOption
                ]}
                onPress={() => setSelectedStatus('well_known')}
              >
                <View style={styles.statusRadio}>
                  {selectedStatus === 'well_known' && <View style={styles.statusRadioSelected} />}
                </View>
                <View style={styles.statusColorBox}>
                  <View style={[styles.statusColorIndicator, { backgroundColor: '#2a9d8f' }]} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusText}>İyi Biliyorum</Text>
                  <Text style={styles.statusDescription}>Bu kelimeyi iyi biliyorsunuz</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  selectedStatus === 'mastered' && styles.selectedStatusOption
                ]}
                onPress={() => setSelectedStatus('mastered')}
              >
                <View style={styles.statusRadio}>
                  {selectedStatus === 'mastered' && <View style={styles.statusRadioSelected} />}
                </View>
                <View style={styles.statusColorBox}>
                  <View style={[styles.statusColorIndicator, { backgroundColor: '#4361ee' }]} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusText}>Tam Öğrendim</Text>
                  <Text style={styles.statusDescription}>Bu kelimeyi tamamen öğrendiniz</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveLearningStatus}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {showCategories ? 'Tüm Kategoriler' : category.name}
        </Text>
        
        {!showCategories && (
          <TouchableOpacity 
            style={styles.quizButton}
            onPress={handleStartQuiz}
          >
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={showCategories ? "Kategori ara..." : "Kelime ara..."}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {showCategories ? (
        <>
          <View style={styles.categoriesHeaderContainer}>
            <View style={styles.categoriesInfoContainer}>
              <Text style={styles.categoriesTitle}>Öğrenmek İstediğin Kategorileri Keşfet</Text>
              <Text style={styles.categoriesSubtitle}>
                İlgilendiğin alanları seçerek kelime hazineni geliştir.
              </Text>
            </View>
            
            <View style={styles.categoriesStatsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{categories.length}</Text>
                <Text style={styles.statLabel}>Kategori</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {categories.reduce((total, cat) => total + (cat.word_count || 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Kelime</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoriesList}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>Henüz kategori bulunmuyor.</Text>
              </View>
            }
          />
        </>
      ) : (
        <>
          {!showCategories && (
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sırala:</Text>
              <TouchableOpacity 
                style={[styles.sortButton, sortOrder === 'az' && styles.activeSortButton]}
                onPress={() => setSortOrder('az')}
              >
                <Text style={[styles.sortButtonText, sortOrder === 'az' && styles.activeSortButtonText]}>A-Z</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sortButton, sortOrder === 'za' && styles.activeSortButton]}
                onPress={() => setSortOrder('za')}
              >
                <Text style={[styles.sortButtonText, sortOrder === 'za' && styles.activeSortButtonText]}>Z-A</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sortButton, sortOrder === 'difficulty' && styles.activeSortButton]}
                onPress={() => setSortOrder('difficulty')}
              >
                <Text style={[styles.sortButtonText, sortOrder === 'difficulty' && styles.activeSortButtonText]}>Zorluk</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <FlatList
            data={filteredWords}
            renderItem={renderWordItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.wordsList}
          />
        </>
      )}
      
      {renderLearningStatusModal()}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  quizButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.m,
    borderRadius: SIZES.rounded,
    padding: SPACING.s,
    ...SHADOWS.small,
  },
  searchIcon: {
    marginRight: SPACING.s,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  sortLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginRight: SPACING.s,
  },
  sortButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    marginRight: SPACING.xs,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeSortButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  activeSortButtonText: {
    color: '#fff',
  },
  wordsList: {
    padding: SPACING.m,
    paddingTop: 0,
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
    marginBottom: SPACING.s,
  },
  englishWord: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButton: {
    marginRight: SPACING.s,
  },
  difficultyBadge: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.s,
    borderRadius: 10,
  },
  easyBadge: {
    backgroundColor: 'rgba(43, 138, 62, 0.1)',
  },
  mediumBadge: {
    backgroundColor: 'rgba(249, 168, 37, 0.1)',
  },
  hardBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  difficultyText: {
    fontSize: SIZES.xs,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.s,
  },
  turkishWord: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  exampleSentence: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  exampleLabel: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pronunciation: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  pronunciationLabel: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 4,
  },
  practiceButtonText: {
    color: '#fff',
  },
  // Kategori Listesi Stilleri
  categoriesList: {
    padding: SPACING.m,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxl,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.rounded,
    margin: SPACING.xs,
    overflow: 'hidden',
    ...SHADOWS.medium,
    elevation: 4,
    height: 280,
  },
  categoryGradient: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    padding: SPACING.m,
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  categoryMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  categoryCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  categoryLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLevel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  progressBarContainer: {
    marginBottom: SPACING.m,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  categoryButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLearnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    backgroundColor: COLORS.primary,
    flex: 1,
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  categoryButtonText: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  categoryQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    backgroundColor: COLORS.secondary,
    flex: 1,
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  categoriesHeaderContainer: {
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.rounded,
    margin: SPACING.m,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
  },
  categoriesInfoContainer: {
    marginBottom: SPACING.m,
  },
  categoriesTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categoriesSubtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  categoriesStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: SPACING.s,
    paddingTop: SPACING.s,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: SIZES.base,
    minWidth: 80,
  },
  statNumber: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.m,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    width: '90%',
    maxWidth: 500,
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.m,
  },
  wordTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  wordTranslation: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  statusLabel: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    borderRadius: 8,
    marginBottom: SPACING.s,
  },
  selectedStatusOption: {
    backgroundColor: COLORS.primary + '10', // 10% opacity
  },
  statusRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  statusRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  statusColorBox: {
    marginRight: SPACING.s,
  },
  statusColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
    marginRight: SPACING.m,
  },
  cancelButtonText: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listenButton: {
    padding: SPACING.xs,
    borderRadius: SIZES.base,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: SPACING.s,
  },
  listenButtonActive: {
    backgroundColor: 'rgba(0,120,255,0.1)',
  },
});

export default CategoryWordsScreen; 