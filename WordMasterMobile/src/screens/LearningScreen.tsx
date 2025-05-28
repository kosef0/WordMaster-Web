import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { updateWordProgress, updateCategoryProgress, getWordsByCategory } from '../database/api';

// Tip tanımlamaları
interface Category {
  id: number;
  name: string;
  description: string;
  image?: string;
  difficulty_level: number;
  order: number;
}

interface Word {
  id: number;
  english: string;
  turkish: string;
  definition?: string;
  example_sentence?: string;
  pronunciation?: string;
  difficulty_level?: number;
  category: number | Category;
  image?: string;
  audio?: string;
}

type RouteParams = {
  category: Category;
}

type RootStackParamList = {
  Categories: undefined;
  Learning: { category: Category };
  [key: string]: object | undefined;
};

const LearningScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { category } = route.params || { category: undefined };

  // State tanımlamaları
  const [currentCategory, setCurrentCategory] = useState<Category | undefined>(category);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [currentStep, setCurrentStep] = useState('word'); // 'word', 'quiz', 'complete'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kategori kelimelerini yükle
  useEffect(() => {
    const loadCategoryWords = async () => {
      if (!currentCategory) return;
      
      try {
        setLoading(true);
        const result = await getWordsByCategory(currentCategory.id);
        
        if (result.success && result.data) {
          setWords(result.data);
          if (result.data.length > 0) {
            setCurrentWord(result.data[0]);
          }
        } else {
          setError('Kelimeler yüklenemedi');
        }
      } catch (error) {
        console.error('Kelime yükleme hatası:', error);
        setError('Kelimeler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    loadCategoryWords();
  }, [currentCategory]);

  // Bir sonraki kelimeye geç
  const goToNextWord = () => {
    if (currentWordIndex < words.length - 1) {
      const nextIndex = currentWordIndex + 1;
      setCurrentWordIndex(nextIndex);
      setCurrentWord(words[nextIndex]);
      setCurrentStep('word');
    } else {
      // Tüm kelimeler tamamlandı, kategoriyi tamamla
      completeCategory();
    }
  };

  // Kelime ilerleme ve kategori ilerleme işlemleri için fonksiyonlar
  const updateCurrentWordProgress = async (proficiency: number) => {
    if (!currentWord) return;
    
    try {
      console.log(`Kelime ilerleme güncelleniyor: ID=${currentWord.id}, Proficiency=${proficiency}`);
      
      // Kelime ilerlemesini güncelle
      const progressData = {
        proficiency_level: proficiency,
        is_mastered: proficiency >= 5
      };
      
      const result = await updateWordProgress(currentWord.id, progressData);
      
      if (!result.success) {
        console.error('Kelime ilerleme güncellemesi başarısız:', result.message);
        // Hata gösterimi eklenebilir
        return false;
      }
      
      console.log('Kelime ilerleme güncellemesi başarılı:', result.data);
      return true;
    } catch (error) {
      console.error('Kelime ilerleme güncelleme hatası:', error);
      return false;
    }
  };

  const completeCategory = async () => {
    if (!currentCategory) return;
    
    try {
      console.log(`Kategori tamamlanıyor: ID=${currentCategory.id}`);
      
      // Kategori ilerlemesini güncelle
      const categoryData = {
        category: currentCategory.id, // category_id yerine category kullan
        completed: true,
        score: 100
      };
      
      console.log('Kategori ilerlemesi güncelleniyor:', categoryData);
      const result = await updateCategoryProgress(currentCategory.id, categoryData);
      
      if (!result.success) {
        console.error('Kategori ilerleme güncellemesi başarısız:', result.message);
        Alert.alert('Hata', 'Kategori ilerlemesi kaydedilemedi. Lütfen tekrar deneyin.');
        return false;
      }
      
      console.log('Kategori ilerleme güncellemesi başarılı:', result.data);
      
      // Sonraki kategoriye geç
      setCurrentStep('complete');
      return true;
    } catch (error) {
      console.error('Kategori tamamlama hatası:', error);
      Alert.alert('Hata', 'Kategori tamamlanamadı. Lütfen tekrar deneyin.');
      return false;
    }
  };

  // Kelimeyi öğrendim işlemi
  const handleLearnWord = async () => {
    const success = await updateCurrentWordProgress(3);
    if (success) {
      goToNextWord();
    }
  };

  // Yükleme ekranı
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  // Hata ekranı
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Kategori tamamlandı ekranı
  if (currentStep === 'complete') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tebrikler!</Text>
        <Text style={styles.subtitle}>{currentCategory?.name} kategorisini tamamladınız.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Categories')}
        >
          <Text style={styles.buttonText}>Kategorilere Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Kelime öğrenme ekranı
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kelime Öğrenme</Text>
      <Text style={styles.subtitle}>{currentCategory?.name}</Text>
      
      {currentWord && (
        <View style={styles.wordContainer}>
          <Text style={styles.word}>{currentWord.english}</Text>
          <Text style={styles.translation}>{currentWord.turkish}</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleLearnWord}
          >
            <Text style={styles.buttonText}>Öğrendim, Devam Et</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.progress}>
        {currentWordIndex + 1} / {words.length}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  wordContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  word: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  translation: {
    fontSize: 20,
    color: '#444',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progress: {
    marginTop: 20,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
  }
});

export default LearningScreen; 