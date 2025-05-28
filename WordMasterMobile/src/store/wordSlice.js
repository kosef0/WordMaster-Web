// src/store/wordSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCategories, getWordsByCategory, getUserWords, updateWordLearningStatus } from '../database/db';

// Asenkron işlemler
export const fetchCategories = createAsyncThunk(
  'words/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await getCategories();
      return categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchWordsByCategory = createAsyncThunk(
  'words/fetchWordsByCategory',
  async (categoryId, { rejectWithValue }) => {
    try {
      const words = await getWordsByCategory(categoryId);
      return { categoryId, words };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserWords = createAsyncThunk(
  'words/fetchUserWords',
  async (userId, { rejectWithValue }) => {
    try {
      const userWords = await getUserWords(userId);
      return userWords;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateLearningStatus = createAsyncThunk(
  'words/updateLearningStatus',
  async ({ userId, wordId, isLearned, familiarityLevel }, { rejectWithValue }) => {
    try {
      await updateWordLearningStatus(userId, wordId, isLearned, familiarityLevel);
      return { wordId, isLearned, familiarityLevel };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  categories: [],
  currentCategoryWords: [],
  userWords: [],
  loading: false,
  error: null,
};

const wordSlice = createSlice({
  name: 'words',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Kategori işlemleri
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
        state.error = action.payload;
      })
      
      // Kategori kelimeleri işlemleri
      .addCase(fetchWordsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWordsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategoryWords = action.payload.words;
      })
      .addCase(fetchWordsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Kullanıcı kelimeleri işlemleri
      .addCase(fetchUserWords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserWords.fulfilled, (state, action) => {
        state.loading = false;
        state.userWords = action.payload;
      })
      .addCase(fetchUserWords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Kelime öğrenme durumu güncelleme
      .addCase(updateLearningStatus.fulfilled, (state, action) => {
        const { wordId, isLearned, familiarityLevel } = action.payload;
        
        // Kullanıcı kelimelerini güncelle
        state.userWords = state.userWords.map(word => {
          if (word.id === wordId) {
            return {
              ...word,
              is_learned: isLearned,
              familiarity_level: familiarityLevel,
              last_practiced: new Date().toISOString()
            };
          }
          return word;
        });
      });
  },
});

export const { clearError } = wordSlice.actions;
export default wordSlice.reducer; 