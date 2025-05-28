import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { 
  getLearningSteps, 
  getUserProgress, 
  updateStepProgress,
  updateCategoryProgress 
} from '../database/api';

/**
 * Öğrenme ilerlemesi için hook
 * Bu hook, adımların kilit durumunu kontrol etmek ve güncellemek için kullanılır
 */
export const useLearningProgress = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Bir adımı tamamla ve bir sonraki adımın kilidini aç
   * @param stepId Tamamlanan adımın ID'si
   * @param categoryId Kategorinin ID'si
   * @param score Adımda alınan puan
   * @param maxScore Adımda alınabilecek maksimum puan
   */
  const completeStepAndUnlockNext = async (
    stepId: number, 
    categoryId: number,
    score: number,
    maxScore: number
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Adım tamamlanıyor: ID=${stepId}, Kategori=${categoryId}, Puan=${score}/${maxScore}`);
      
      // 1. Adım ilerlemesini güncelle
      const stepResult = await updateStepProgress(stepId, {
        score: score,
        max_score: maxScore,
        completed: true,
        unlocked: true
      });
      
      if (!stepResult || stepResult.success === false) {
        console.warn('Adım ilerlemesi güncellenemedi:', stepResult);
        throw new Error('Adım ilerlemesi güncellenemedi');
      }
      
      console.log('Adım ilerlemesi başarıyla güncellendi');
      
      // 2. Bir sonraki adımın kilidini aç
      // Tüm adımları al
      const stepsData = await getLearningSteps();
      
      // Mevcut adımın bilgilerini al
      const currentStep = stepsData.find((s: any) => s.id === stepId);
      
      if (!currentStep) {
        throw new Error('Adım bilgileri bulunamadı');
      }
      
      // Mevcut adımdan sonraki adımı bul (aynı kategoride ve sıralama numarası büyük olan)
      const nextStep = stepsData.find((s: any) => 
        s.category === categoryId && 
        s.order > currentStep.order
      );
      
      // Eğer bir sonraki adım varsa kilidini aç
      if (nextStep) {
        console.log(`Bir sonraki adımın kilidi açılıyor: ID=${nextStep.id}`);
        
        // Önce mevcut adımın ilerlemesini sorgula
        const userProgressData = await getUserProgress();
        const nextStepProgress = userProgressData?.steps?.find((p: any) => 
          p.step === nextStep.id || 
          (p.step && typeof p.step === 'object' && p.step.id === nextStep.id)
        );
        
        // Mevcut bir ilerleme varsa güncelleyelim, yoksa yeni oluşturalım
        if (nextStepProgress && nextStepProgress.id) {
          console.log(`Sonraki adım için mevcut ilerleme bulundu (ID: ${nextStepProgress.id}), güncelleniyor`);
          
          const updateParams = {
            unlocked: true,
            completed: false,
            score: 0,
            max_score: 100
          };
          
          const unlockResult = await updateStepProgress(nextStep.id, updateParams);
          
          if (!unlockResult || unlockResult.success === false) {
            console.warn('Sonraki adımın kilidi açılamadı:', unlockResult);
          } else {
            console.log('Sonraki adımın kilidi başarıyla açıldı');
          }
        } else {
          // Yeni bir ilerleme kaydı oluştur
          console.log(`Sonraki adım için ilerleme kaydı bulunamadı, yeni kayıt oluşturuluyor: ${nextStep.id}`);
          
          try {
            // Yeni bir step-progress kaydı oluştur
            const createParams = {
              step: nextStep.id,
              unlocked: true,
              completed: false,
              score: 0,
              max_score: 100
            };
            
            const createResult = await updateStepProgress(nextStep.id, createParams);
            
            if (!createResult || createResult.success === false) {
              console.warn('Sonraki adım için ilerleme kaydı oluşturulamadı:', createResult);
              
              // Alternatif yöntem dene - doğrudan API ile step-progress oluştur
              try {
                console.log('Alternatif yöntem deneniyor...');
                
                // API modülünü doğrudan kullanarak step-progress post işlemi
                const axios = require('axios').default;
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const API_URL = axios.defaults.baseURL || 'http://10.0.2.2:8000/api';
                
                const token = await AsyncStorage.getItem('token');
                const config = {
                  headers: {
                    'Authorization': token ? `Token ${token}` : '',
                    'Content-Type': 'application/json'
                  }
                };
                
                const response = await axios.post(
                  `${API_URL}/learning-step-progress/`, 
                  createParams,
                  config
                );
                
                console.log('Alternatif yöntemle ilerleme kaydı oluşturuldu:', response.data);
              } catch (altError) {
                console.error('Alternatif yöntem de başarısız oldu:', altError);
              }
            } else {
              console.log('Sonraki adım için ilerleme kaydı başarıyla oluşturuldu');
            }
          } catch (createError) {
            console.error('Sonraki adım ilerleme kaydı oluşturma hatası:', createError);
          }
        }
      } else {
        console.log('Bu kategorideki son adım tamamlandı');
        
        // Tüm adımlar tamamlandıysa kategoriyi tamamla
        const categorySteps = stepsData.filter((s: any) => s.category === categoryId);
        const userProgress = await getUserProgress();
        
        const completedStepsCount = categorySteps.filter((step: any) => {
          const stepProgress = userProgress?.steps?.find((p: any) => p.step === step.id);
          return stepProgress?.completed || false;
        }).length;
        
        if (completedStepsCount === categorySteps.length) {
          console.log('Kategorideki tüm adımlar tamamlandı, kategori tamamlanıyor');
          
          await updateCategoryProgress(categoryId, {
            completed: true,
            unlocked: true
          });
          
          // Sonraki kategorinin kilidini aç
          const categories = await getLearningSteps();
          const sortedCategories = [...new Set(categories.map((s: any) => s.category))];
          const currentCategoryIndex = sortedCategories.indexOf(categoryId);
          
          if (currentCategoryIndex >= 0 && currentCategoryIndex < sortedCategories.length - 1) {
            const nextCategoryId = sortedCategories[currentCategoryIndex + 1];
            
            // Sonraki kategorinin kilidini aç
            await updateCategoryProgress(nextCategoryId as number, {
              completed: false,
              unlocked: true
            });
            
            console.log(`Sonraki kategorinin kilidi açıldı: ID=${nextCategoryId}`);
          }
        }
      }
      
      // 3. Kategori ilerlemesini güncelle
      await updateCategoryProgress(categoryId, {
        score: score,
        max_score: maxScore,
        unlocked: true
      });
      
      console.log('Kategori ilerlemesi başarıyla güncellendi');
      setLoading(false);
      
      return true;
    } catch (error: any) {
      console.error('Adım tamamlama hatası:', error);
      setError(error.message || 'Adım tamamlanırken bir hata oluştu');
      setLoading(false);
      
      Alert.alert(
        'Hata',
        'Adım tamamlanırken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
      
      return false;
    }
  };

  /**
   * Bir adımın kilit durumunu kontrol et
   * @param stepId Kontrol edilecek adımın ID'si
   * @param categoryId Kategorinin ID'si
   */
  const checkStepUnlocked = async (stepId: number, categoryId: number) => {
    try {
      // Kullanıcı ilerlemesini getir
      const userProgress = await getUserProgress();
      
      // Adım ilerlemesini bul
      const stepProgress = userProgress?.steps?.find((p: any) => p.step === stepId);
      
      // Adım açıkça kilitliyse (unlocked = false)
      if (stepProgress && stepProgress.unlocked === false) {
        return false;
      }
      
      // Tüm adımları getir
      const allSteps = await getLearningSteps();
      
      // Mevcut adımın bilgilerini al
      const currentStep = allSteps.find((s: any) => s.id === stepId);
      
      if (!currentStep) {
        return false;
      }
      
      // İlk adımsa her zaman açıktır
      if (currentStep.order === 0) {
        return true;
      }
      
      // Önceki adımı bul
      const previousStep = allSteps.find((s: any) => 
        s.category === categoryId && 
        s.order === currentStep.order - 1
      );
      
      if (!previousStep) {
        return true; // Önceki adım yoksa açık olarak kabul et
      }
      
      // Önceki adımın tamamlanma durumunu kontrol et
      const previousStepProgress = userProgress?.steps?.find((p: any) => p.step === previousStep.id);
      return previousStepProgress?.completed || false;
    } catch (error) {
      console.error('Adım kilit durumu kontrolünde hata:', error);
      return false;
    }
  };

  return {
    loading,
    error,
    completeStepAndUnlockNext,
    checkStepUnlocked
  };
}; 