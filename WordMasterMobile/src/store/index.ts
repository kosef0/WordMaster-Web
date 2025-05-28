import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import authReducer from './authSlice';
import wordReducer from './wordSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  words: wordReducer,
});

// Store'u önce oluştur
export const store = configureStore({
  reducer: rootReducer,
});

// Tipleri sonra tanımla
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch; 