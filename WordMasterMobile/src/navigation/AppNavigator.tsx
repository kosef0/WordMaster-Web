import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

// Ekranlar
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryWordsScreen from '../screens/CategoryWordsScreen';
import MyWordsScreen from '../screens/MyWordsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import QuizScreen from '../screens/QuizScreen';
import GamesScreen from '../screens/GamesScreen';
import WordGameScreen from '../screens/WordGameScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import LearningPanelScreen from '../screens/LearningPanelScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import LearningStepScreen from '../screens/LearningStepScreen';
import ChatPracticeScreen from '../screens/ChatPracticeScreen';

// Öğrenme Adımı Ekranları
import WordLearningScreen from '../screens/learning/WordLearningScreen';
import MultipleChoiceScreen from '../screens/learning/MultipleChoiceScreen';
import WordMatchingScreen from '../screens/learning/WordMatchingScreen';
import WritingExerciseScreen from '../screens/learning/WritingExerciseScreen';
import ListeningExerciseScreen from '../screens/learning/ListeningExerciseScreen';
import FinalQuizScreen from '../screens/learning/FinalQuizScreen';
import TreasureScreen from '../screens/learning/TreasureScreen';

// Quiz Ekranları
import QuizCategoriesScreen from '../screens/QuizCategoriesScreen';
import QuizLevelsScreen from '../screens/QuizLevelsScreen';
import QuizResultScreen from '../screens/QuizResultScreen';

// Oyun ekranları
import WordPuzzleScreen from '../screens/WordPuzzleScreen';
import WordGuessScreen from '../screens/WordGuessScreen';
import SpeedQuizScreen from '../screens/SpeedQuizScreen';
import WordHuntScreen from '../screens/WordHuntScreen';

// RootState tipi
import { RootState } from '../store';

// Navigasyon tipleri
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Home: { selectCategoryForGame?: boolean; gameId?: string } | undefined;
  MyWords: undefined;
  Games: undefined;
  Profile: undefined;
  CategoryWords: { categoryId: number; categoryName: string };
  WordGame: { gameType: string };
  Statistics: undefined;
  QuizCategories: undefined;
  QuizLevels: { categoryId: number; categoryName: string };
  QuizScreen: { categoryId: number; level: string };
  QuizResult: { score: number; total: number; correctWords: any[]; wrongWords: any[] };
  ProfileEdit: undefined;
  PasswordChange: undefined;
  ProfilePhoto: undefined;
  Categories: undefined;
  CategoryDetail: { categoryId: number; categoryName: string };
  LearningStep: { categoryId: number; categoryName: string };
  WordLearning: { category: any };
  WordLearningScreen: { categoryId: number; categoryName: string };
  MultipleChoiceScreen: { categoryId: number; categoryName: string };
  WordMatchingScreen: { categoryId: number; categoryName: string };
  WritingExerciseScreen: { categoryId: number; categoryName: string };
  ListeningExerciseScreen: { categoryId: number; categoryName: string };
  FinalQuizScreen: { categoryId: number; categoryName: string };
  TreasureScreen: { categoryId: number; categoryName: string };
  ChatPractice: undefined;
  
  // Oyun ekranları
  WordPuzzle: undefined;
  WordGuess: undefined;
  SpeedQuiz: undefined;
  WordHunt: undefined;
};

export type TabParamList = {
  Home: undefined;
  MyWords: undefined;
  Quizzes: undefined;
  Games: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Type uyumsuzluklarını çözmek için yardımcı tip dönüştürücüler
type ComponentWithProps<T> = React.ComponentType<T>;

// CategoriesListScreen bileşeni oluşturuyoruz
// Bu, CategoryWordsScreen'in wrapper'ı olacak ve kategori parametresi olmadan çalışacak
const CategoriesListScreen: React.FC<any> = ({ navigation }) => {
  // CategoriesListScreen içinde route.params.category kullanımını kaldırıyoruz
  // Burada sadece tüm kategorileri görüntüleyeceğiz
  return <CategoryWordsScreen navigation={navigation} route={{ params: { category: { id: 0, name: "Tüm Kategoriler" } }, key: '', name: 'CategoryWords' }} />;
};

// Ana Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyWords') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Quizzes') {
            iconName = focused ? 'help-circle' : 'help-circle-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={focused ? size + 2 : size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingTop: 5,
          paddingBottom: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarItemStyle: {
          padding: 2,
        },
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen as ComponentWithProps<any>}
        options={{ 
          title: 'Ana Sayfa',
          tabBarLabel: 'Ana Sayfa'
        }} 
      />
      <Tab.Screen 
        name="MyWords" 
        component={LearningPanelScreen as ComponentWithProps<any>} 
        options={{ 
          title: 'Öğrenme',
          tabBarLabel: 'Öğrenme'
        }} 
      />
      <Tab.Screen 
        name="Quizzes" 
        component={QuizCategoriesScreen as ComponentWithProps<any>} 
        options={{ 
          title: 'Quizler',
          tabBarLabel: 'Quiz'
        }} 
      />
      <Tab.Screen 
        name="Games" 
        component={GamesScreen as ComponentWithProps<any>}
        options={{ 
          title: 'Oyunlar',
          tabBarLabel: 'Oyunlar'
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen as ComponentWithProps<any>}
        options={{ 
          title: 'Profil',
          tabBarLabel: 'Profil'
        }} 
      />
    </Tab.Navigator>
  );
};

// Ana Stack Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Home" component={HomeScreen as ComponentWithProps<any>} />
            <Stack.Screen name="CategoryWords" component={CategoryWordsScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WordGame" component={WordGameScreen as ComponentWithProps<any>} />
            <Stack.Screen name="Statistics" component={StatisticsScreen as ComponentWithProps<any>} />
            <Stack.Screen name="QuizCategories" component={QuizCategoriesScreen as ComponentWithProps<any>} />
            <Stack.Screen name="QuizLevels" component={QuizLevelsScreen as ComponentWithProps<any>} />
            <Stack.Screen name="QuizScreen" component={QuizScreen as ComponentWithProps<any>} />
            <Stack.Screen name="QuizResult" component={QuizResultScreen as ComponentWithProps<any>} />
            <Stack.Screen name="MyWords" component={MyWordsScreen as ComponentWithProps<any>} />
            <Stack.Screen name="Games" component={GamesScreen as ComponentWithProps<any>} />
            <Stack.Screen name="Profile" component={ProfileScreen as ComponentWithProps<any>} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen as ComponentWithProps<any>} />
            <Stack.Screen name="Categories" component={CategoriesListScreen} />
            <Stack.Screen name="WordLearning" component={CategoryWordsScreen as ComponentWithProps<any>} />
            
            {/* Öğrenme Ekranları */}
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen as ComponentWithProps<any>} />
            <Stack.Screen name="LearningStep" component={LearningStepScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WordLearningScreen" component={WordLearningScreen as ComponentWithProps<any>} />
            <Stack.Screen name="MultipleChoiceScreen" component={MultipleChoiceScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WordMatchingScreen" component={WordMatchingScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WritingExerciseScreen" component={WritingExerciseScreen as ComponentWithProps<any>} />
            <Stack.Screen name="ListeningExerciseScreen" component={ListeningExerciseScreen as ComponentWithProps<any>} />
            <Stack.Screen name="FinalQuizScreen" component={FinalQuizScreen as ComponentWithProps<any>} />
            <Stack.Screen name="TreasureScreen" component={TreasureScreen as ComponentWithProps<any>} />
            
            {/* Oyun Ekranları */}
            <Stack.Screen name="WordPuzzle" component={WordPuzzleScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WordGuess" component={WordGuessScreen as ComponentWithProps<any>} />
            <Stack.Screen name="SpeedQuiz" component={SpeedQuizScreen as ComponentWithProps<any>} />
            <Stack.Screen name="WordHunt" component={WordHuntScreen as ComponentWithProps<any>} />
            
            {/* AI Pratik Ekranı */}
            <Stack.Screen name="ChatPractice" component={ChatPracticeScreen as ComponentWithProps<any>} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 