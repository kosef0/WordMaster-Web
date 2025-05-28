import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView
} from 'react-native';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  Quizzes: undefined;
  QuizDetail: { quizId: number; title: string };
};

type QuizzesScreenProps = StackScreenProps<RootStackParamList, 'Quizzes'>;

type Quiz = {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  questionCount: number;
  category: string;
  image: string;
};

const QuizzesScreen: React.FC<QuizzesScreenProps> = ({ navigation }) => {
  // Örnek quiz verileri
  const quizzes: Quiz[] = [
    {
      id: 1,
      title: 'Günlük Konuşma',
      description: 'Günlük hayatta en çok kullanılan kelimeler',
      difficulty: 'Kolay',
      questionCount: 10,
      category: 'Genel',
      image: 'https://via.placeholder.com/150'
    },
    {
      id: 2,
      title: 'İş İngilizcesi',
      description: 'İş hayatında kullanılan terimler',
      difficulty: 'Orta',
      questionCount: 15,
      category: 'İş',
      image: 'https://via.placeholder.com/150'
    },
    {
      id: 3,
      title: 'Akademik İngilizce',
      description: 'Akademik çalışmalarda kullanılan kelimeler',
      difficulty: 'Zor',
      questionCount: 20,
      category: 'Akademik',
      image: 'https://via.placeholder.com/150'
    },
    {
      id: 4,
      title: 'Seyahat Terimleri',
      description: 'Seyahat ederken kullanabileceğiniz kelimeler',
      difficulty: 'Kolay',
      questionCount: 12,
      category: 'Seyahat',
      image: 'https://via.placeholder.com/150'
    },
  ];

  const renderQuizItem = ({ item }: { item: Quiz }) => (
    <TouchableOpacity
      style={styles.quizCard}
      onPress={() => navigation.navigate('QuizDetail', { quizId: item.id, title: item.title })}
    >
      <Image source={{ uri: item.image }} style={styles.quizImage} />
      <View style={styles.quizContent}>
        <Text style={styles.quizTitle}>{item.title}</Text>
        <Text style={styles.quizDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.quizFooter}>
          <View style={styles.quizInfo}>
            <Ionicons name="help-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.quizInfoText}>{item.questionCount} Soru</Text>
          </View>
          
          <View style={styles.quizInfo}>
            <Ionicons name="speedometer-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.quizInfoText}>{item.difficulty}</Text>
          </View>
          
          <View style={[styles.categoryBadge, getDifficultyColor(item.difficulty)]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Kolay':
        return { backgroundColor: COLORS.success };
      case 'Orta':
        return { backgroundColor: COLORS.warning };
      case 'Zor':
        return { backgroundColor: COLORS.danger };
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kelime Quizleri</Text>
        <Text style={styles.subtitle}>
          Öğrendiğiniz kelimeleri test edin ve puanınızı artırın
        </Text>
      </View>

      <FlatList
        data={quizzes}
        renderItem={renderQuizItem}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
        contentContainerStyle={styles.quizList}
      />
    </ScrollView>
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
  quizList: {
    padding: SPACING.m,
  },
  quizCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    marginBottom: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  quizImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  quizContent: {
    padding: SPACING.m,
  },
  quizTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  quizDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  quizInfoText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: SIZES.xs,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default QuizzesScreen; 