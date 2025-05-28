import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { Category } from '../database/db';
import { RootState, AppDispatch } from '../store';
import { StackScreenProps } from '@react-navigation/stack';
import { getCategoryImageByName } from '../utils/categoryUtils';
import { Ionicons } from '@expo/vector-icons';

// Tip tanımlamaları
type RootStackParamList = {
  Categories: undefined;
  CategoryWords: { category: Category };
  Quizzes: { categoryId?: number };
  Home: undefined;
  WordLearning: { category: Category };
};

type CategoriesScreenProps = StackScreenProps<RootStackParamList, 'Categories'>;

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading, error } = useSelector((state: RootState) => state.words);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Kategori kartına tıklandığında
  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CategoryWords', { category });
  };

  // Öğrenme ekranına git
  const handleLearnPress = (category: Category) => {
    navigation.navigate('CategoryWords', { category });
  };

  // Quiz ekranına git
  const handleQuizPress = (category: Category) => {
    navigation.navigate('Quizzes', { categoryId: category.id });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    // Öğrenilen kelime sayısını hesapla (gerçek veride değiştirilecek)
    const learnedWords = 0;
    const totalWords = item.word_count || 20; // Örnek değer
    const completionPercentage = learnedWords / totalWords * 100;
    
    return (
      <View style={styles.categoryCard}>
        <Image
          source={{ uri: getCategoryImageByName(item.name) }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
        
        <Text style={styles.categoryName}>{item.name}</Text>
        
        <Text style={styles.categoryDescription}>
          {item.name} kategorisindeki kelimeler
        </Text>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${completionPercentage}%` }]} />
        </View>
        
        <Text style={styles.progressText}>
          %{completionPercentage.toFixed(0)} tamamlandı
        </Text>
        
        <Text style={styles.wordCountText}>
          {learnedWords} / {totalWords} kelime
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.wordButton}
            onPress={() => handleLearnPress(item)}
          >
            <Ionicons name="book-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Kelimeleri Gör</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quizButton}
            onPress={() => handleQuizPress(item)}
          >
            <Ionicons name="help-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && categories.length === 0) {
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
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategoriler</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={styles.subtitle}>
        İlgilendiğin veya öğrenmek istediğin kategorileri seç ve kelime hazineni geliştir.
      </Text>
      
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.categoriesList}
        numColumns={1}
        showsVerticalScrollIndicator={false}
      />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    paddingTop: SPACING.l,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  categoriesList: {
    padding: SPACING.m,
    paddingBottom: SPACING.xxl,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  categoryImage: {
    width: '100%',
    height: 150,
  },
  categoryName: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    margin: SPACING.m,
    marginBottom: SPACING.xs,
  },
  categoryDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.xs,
  },
  wordCountText: {
    fontSize: SIZES.small,
    color: COLORS.text,
    fontWeight: 'bold',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  wordButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
    flex: 2,
    marginRight: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: SIZES.small,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
});

export default CategoriesScreen; 