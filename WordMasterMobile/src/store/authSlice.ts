import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loginUser as loginUserApi, getUserProfile as getUserProfileApi, updateUserProfile as updateUserProfileApi, registerUser as registerUserApi } from '../database/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  user_id?: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  profile: any | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  profile: null,
};

// Asenkron işlemler
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      console.log(`Giriş denemesi başlatıldı: ${username}`);
      const response = await loginUserApi(username, password);
      
      console.log('Giriş yanıtı:', response);
      
      // Django Rest Framework token formatı
      const user = {
        id: response.user_id || 0,
        user_id: response.user_id || 0,
        username: response.username || username,
        email: response.email || '',
        first_name: response.first_name || '',
        last_name: response.last_name || '',
      };
      
      const profile = {
        level: response.level || 1,
        experience_points: response.experience_points || 0,
        streak_days: response.streak_days || 0,
      };
      
      // Token'ı AsyncStorage'a kaydet
      if (response.token) {
        await AsyncStorage.setItem('token', response.token);
        console.log('Token başarıyla kaydedildi');
      } else {
        console.error('Token bulunamadı!');
        return rejectWithValue('Giriş başarılı ancak token alınamadı');
      }
      
      return { 
        user, 
        profile, 
        token: response.token 
      };
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      
      // Hata mesajını düzenle
      let errorMessage = 'Giriş yapılırken bir hata oluştu';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.response) {
        console.error('API yanıt hatası:', error.response);
        
        if (typeof error.response.data === 'object' && error.response.data !== null) {
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.non_field_errors) {
            errorMessage = error.response.data.non_field_errors[0];
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          }
        }
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Kullanıcı kaydı işlemi
export const register = createAsyncThunk(
  'auth/register',
  async (userData: { 
    username: string; 
    email: string; 
    password: string; 
    first_name: string; 
    last_name: string; 
  }, { rejectWithValue }) => {
    try {
      const result = await registerUserApi(userData);
      // Kayıt başarılı olduysa, otomatik giriş yapmak için login action'ı çağırabilirsiniz
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Kayıt yapılırken bir hata oluştu');
    }
  }
);

// Profil güncelleme işlemi
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: any, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const userId = state.auth.user?.id || 0;
      const updatedProfile = await updateUserProfileApi(userId, profileData);
      return updatedProfile;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Profil güncellenirken bir hata oluştu');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.profile = action.payload.profile;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        // Kayıt başarılı, ama henüz giriş yapmadık
        // Kullanıcı bilgilerini ayarlamıyoruz, giriş ekranına yönlendirip oradan giriş yapmasını sağlayacağız
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer; 