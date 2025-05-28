import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState, AppDispatch } from '../store';
import { fetchCategories } from '../store/wordSlice';
import { getCategoryImageByName } from '../utils/categoryUtils';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

// Tip tanımlamaları
type QuizCategoriesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Quizzes'>,
  StackScreenProps<RootStackParamList>
>;

// Zorluk seviyeleri
const DIFFICULTY_LEVELS = ['Kolay', 'Orta', 'Zor'];

const QuizCategoriesScreen: React.FC<QuizCategoriesScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading } = useSelector((state: RootState) => state.words);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleCategorySelect = (categoryId: number, categoryName: string) => {
    setSelectedCategory(categoryId);
    navigation.navigate('QuizLevels', { categoryId, categoryName });
  };

  const handleCreateMixedQuiz = () => {
    // Karma quiz oluşturma ekranına yönlendir
    navigation.navigate('QuizLevels', { categoryId: 0, categoryName: 'Karışık Quiz' });
  };

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz Kategorileri</Text>
        <Text style={styles.subtitle}>İstediğiniz kategoriyi seçerek quiz yapabilirsiniz</Text>
      </View>

      <View style={styles.createQuizContainer}>
        <TouchableOpacity
          style={styles.createQuizButton}
          onPress={handleCreateMixedQuiz}
        >
          <Ionicons name="shuffle" size={24} color="#fff" style={styles.createQuizIcon} />
          <Text style={styles.createQuizText}>Karışık Quiz</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(category.id, category.name)}
          >
            <Image
              source={{ uri: getCategoryImageByName(category.name) }}
              style={styles.categoryImage}
            />
            <View style={styles.categoryContent}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription} numberOfLines={2}>
                {category.name} kategorisindeki kelimeler
              </Text>
              <View style={styles.categoryProgress}>
                <Text style={styles.progressText}>
                  <Text style={styles.progressPercentage}>0%</Text> tamamlandı
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '0%' }]} />
                </View>
              </View>
              <View style={styles.difficultyContainer}>
                {DIFFICULTY_LEVELS.map((level, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.difficultyBadge,
                      index === 0 ? styles.easyBadge : 
                      index === 1 ? styles.mediumBadge : 
                      styles.hardBadge
                    ]}
                  >
                    <Text style={styles.difficultyText}>{level}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  createQuizContainer: {
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  createQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    ...SHADOWS.medium,
  },
  createQuizIcon: {
    marginRight: SPACING.s,
  },
  createQuizText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    padding: SPACING.m,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    marginBottom: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  categoryImage: {
    width: 100,
    height: 120,
  },
  categoryContent: {
    flex: 1,
    padding: SPACING.m,
  },
  categoryName: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categoryDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  categoryProgress: {
    marginBottom: SPACING.s,
  },
  progressText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressPercentage: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  difficultyBadge: {
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    marginRight: SPACING.xs,
  },
  easyBadge: {
    backgroundColor: COLORS.success + '30', // %30 opacity
  },
  mediumBadge: {
    backgroundColor: COLORS.warning + '30', // %30 opacity
  },
  hardBadge: {
    backgroundColor: COLORS.danger + '30', // %30 opacity
  },
  difficultyText: {
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

export default QuizCategoriesScreen; 