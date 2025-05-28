import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getCategories as getCategoriesApi, 
  getWordsByCategory as getWordsByCategoryApi,
  getUserProgress as getUserProgressApi,
  getUserCategoryProgress as getCategoryProgressApi,
  getUserDailyActivity as getUserDailyActivityApi,
  getUserLearningGoals as getUserLearningGoalsApi,
  getUserStreak as getUserStreakApi
} from '../database/api';

// Tip tanımlamaları
interface UserProgress {
  word_id: number;
  proficiency_level: number;
  last_reviewed: string;
  is_mastered: boolean;
}

interface CategoryProgress {
  category: {
    id: number;
    name: string;
  };
  learned: number;
  total: number;
  percentage: number;
}

interface DailyActivity {
  date: string;
  count: number;
}

interface LearningGoals {
  daily: {
    current: number;
    target: number;
    percentage: number;
  };
  weekly: {
    current: number;
    target: number;
    percentage: number;
  };
  monthly: {
    current: number;
    target: number;
    percentage: number;
  };
}

interface UserStreak {
  streak: number;
  lastActivityDate: string | null;
}

// State tipi
interface WordState {
  categories: any[];
  currentCategory: any | null;
  currentCategoryWords: any[];
  userProgress: UserProgress[];
  categoryProgress: CategoryProgress[];
  dailyActivity: DailyActivity[];
  learningGoals: LearningGoals | null;
  userStreak: UserStreak | null;
  loading: boolean;
  error: string | null;
}

// Başlangıç durumu
const initialState: WordState = {
  categories: [],
  currentCategory: null,
  currentCategoryWords: [],
  userProgress: [],
  categoryProgress: [],
  dailyActivity: [],
  learningGoals: null,
  userStreak: null,
  loading: false,
  error: null,
};

// Asenkron işlemler
export const fetchCategories = createAsyncThunk(
  'words/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await getCategoriesApi();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchWordsByCategory = createAsyncThunk(
  'words/fetchWordsByCategory',
  async (categoryId: number, { rejectWithValue }) => {
    try {
      return await getWordsByCategoryApi(categoryId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserProgress = createAsyncThunk(
  'words/fetchUserProgress',
  async (_, { rejectWithValue }) => {
    try {
      return await getUserProgressApi();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCategoryProgress = createAsyncThunk(
  'words/fetchCategoryProgress',
  async (_, { rejectWithValue }) => {
    try {
      return await getCategoryProgressApi();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDailyActivity = createAsyncThunk(
  'words/fetchDailyActivity',
  async (days: number = 30, { rejectWithValue }) => {
    try {
      return await getUserDailyActivityApi(days);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLearningGoals = createAsyncThunk(
  'words/fetchLearningGoals',
  async (_, { rejectWithValue }) => {
    try {
      return await getUserLearningGoalsApi();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserStreak = createAsyncThunk(
  'words/fetchUserStreak',
  async (_, { rejectWithValue }) => {
    try {
      return await getUserStreakApi();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const wordSlice = createSlice({
  name: 'words',
  initialState,
  reducers: {
    setCurrentCategory: (state, action: PayloadAction<any>) => {
      state.currentCategory = action.payload;
    },
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
      state.currentCategoryWords = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Kategorileri getir
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Kelimeleri getir
      .addCase(fetchWordsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWordsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategoryWords = action.payload;
      })
      .addCase(fetchWordsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Kullanıcı ilerlemesini getir
      .addCase(fetchUserProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.userProgress = action.payload;
      })
      .addCase(fetchUserProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Kategori ilerlemesini getir
      .addCase(fetchCategoryProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryProgress = action.payload;
      })
      .addCase(fetchCategoryProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Günlük aktivite verilerini getir
      .addCase(fetchDailyActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyActivity = action.payload;
      })
      .addCase(fetchDailyActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Öğrenme hedeflerini getir
      .addCase(fetchLearningGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLearningGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.learningGoals = action.payload;
      })
      .addCase(fetchLearningGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Kullanıcı streak bilgisini getir
      .addCase(fetchUserStreak.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserStreak.fulfilled, (state, action) => {
        state.loading = false;
        state.userStreak = action.payload;
      })
      .addCase(fetchUserStreak.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentCategory, clearCurrentCategory } = wordSlice.actions;
export default wordSlice.reducer; 