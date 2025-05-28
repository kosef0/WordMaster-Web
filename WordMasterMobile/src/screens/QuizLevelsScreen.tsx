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
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootState } from '../store';
import { getCategoryImageByName } from '../utils/categoryUtils';
import { RootStackParamList } from '../navigation/AppNavigator';

// Tip tanımlamaları
type QuizLevelsScreenProps = StackScreenProps<RootStackParamList, 'QuizLevels'>;

// Zorluk seviyeleri
interface DifficultyLevel {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  questionCount: number;
  timeLimit: number;
}

const QuizLevelsScreen: React.FC<QuizLevelsScreenProps> = ({ navigation, route }) => {
  const { categoryId, categoryName } = route.params;
  const { categories } = useSelector((state: RootState) => state.words);
  const [loading, setLoading] = useState(false);
  
  const category = categories.find(cat => cat.id === categoryId);
  const categoryImage = getCategoryImageByName(categoryName);

  const difficultyLevels: DifficultyLevel[] = [
    {
      id: 'easy',
      name: 'Kolay',
      description: 'Temel kelimeler ve basit sorular',
      icon: 'leaf-outline',
      color: COLORS.success,
      questionCount: 10,
      timeLimit: 5 // 5 dakika
    },
    {
      id: 'medium',
      name: 'Orta',
      description: 'Orta seviye kelimeler ve karışık sorular',
      icon: 'flame-outline',
      color: COLORS.warning,
      questionCount: 10,
      timeLimit: 4 // 4 dakika
    },
    {
      id: 'hard',
      name: 'Zor',
      description: 'Zor kelimeler ve karmaşık sorular',
      icon: 'flash-outline',
      color: COLORS.danger,
      questionCount: 10,
      timeLimit: 3 // 3 dakika
    }
  ];

  const handleStartQuiz = (level: string) => {
    navigation.navigate('QuizScreen', { categoryId, level });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName} Quiz</Text>
      </View>

      <View style={styles.categoryInfoContainer}>
        <Image
          source={{ uri: categoryImage }}
          style={styles.categoryImage}
        />
        <Text style={styles.categoryDescription}>
          {categoryName} kategorisindeki kelimeler için quiz. Zorluk seviyesini seçin.
        </Text>
      </View>

      <View style={styles.levelsContainer}>
        {difficultyLevels.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={styles.levelCard}
            onPress={() => handleStartQuiz(level.id)}
          >
            <View style={[styles.levelIconContainer, { backgroundColor: level.color }]}>
              <Ionicons name={level.icon as any} size={32} color="#fff" />
            </View>
            <View style={styles.levelContent}>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelDescription}>{level.description}</Text>
              
              <View style={styles.levelDetails}>
                <View style={styles.levelDetail}>
                  <Ionicons name="help-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.levelDetailText}>{level.questionCount} Soru</Text>
                </View>
                
                <View style={styles.levelDetail}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.levelDetailText}>{level.timeLimit} Dakika</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Quiz Hakkında</Text>
        </View>
        <Text style={styles.infoText}>
          • Her quiz 10 sorudan oluşur.{'\n'}
          • Her doğru cevap için 10 puan kazanırsınız.{'\n'}
          • Yanlış cevaplar için puan kaybı yoktur.{'\n'}
          • Quiz sonunda kelime öğrenme durumunuz güncellenir.{'\n'}
          • Bir kelimeyi tam öğrenmek için en az 2 kez doğru cevap vermeniz gerekir.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.l,
    paddingTop: SPACING.xl,
  },
  backButton: {
    marginRight: SPACING.m,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  categoryInfoContainer: {
    padding: SPACING.m,
    alignItems: 'center',
  },
  categoryImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.m,
  },
  categoryDescription: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  levelsContainer: {
    padding: SPACING.m,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
  },
  levelIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  levelContent: {
    flex: 1,
  },
  levelName: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  levelDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  levelDetails: {
    flexDirection: 'row',
  },
  levelDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  levelDetailText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  infoSection: {
    margin: SPACING.m,
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  infoTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});

export default QuizLevelsScreen; 