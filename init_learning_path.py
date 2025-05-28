#!/usr/bin/env python
import os
import sys
import django
import pymongo
from bson.objectid import ObjectId
import logging

# Django ortamını ayarla
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import (
    Category, Word, LearningPath, LearningPathCategory, 
    LearningStep, UserCategoryProgress
)
from django.utils import timezone

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# MongoDB bağlantısı
try:
    client = pymongo.MongoClient("mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority")
    db = client["wmmobil"]
    logger.info("MongoDB bağlantısı başarılı!")
except Exception as e:
    logger.error(f"MongoDB bağlantı hatası: {e}")
    sys.exit(1)

def create_learning_path():
    """Öğrenme yolunu oluşturur."""
    try:
        # MongoDB'den kategorileri al
        categories_collection = db["categories"]
        mongo_categories = list(categories_collection.find().sort("difficulty", 1))
        
        # Kategorileri zorluk seviyesine göre sırala
        categories = Category.objects.all().order_by('difficulty')
        
        # Öğrenme yolunu oluştur
        learning_path, created = LearningPath.objects.get_or_create(
            name="Temel İngilizce Öğrenme Yolu",
            description="İngilizce kelime öğrenme yolculuğunuz"
        )
        
        if created:
            logger.info("Öğrenme yolu oluşturuldu")
        
        # Her kategori için öğrenme adımlarını oluştur
        for category in categories:
            create_learning_steps(category)
            
        logger.info("Öğrenme yolu başarıyla oluşturuldu!")
        
    except Exception as e:
        logger.error(f"Öğrenme yolu oluşturulurken hata: {e}")

def create_learning_steps(category):
    """Bir kategori için öğrenme adımları oluşturur."""
    try:
        # MongoDB'den kelimeleri al
        words_collection = db["words"]
        mongo_words = list(words_collection.find({"category": category.name.lower()}))
        word_count = len(mongo_words)
        
        if word_count < 5:
            logger.warning(f"UYARI: {category.name} kategorisinde yetersiz kelime ({word_count}). Adımlar oluşturulamadı.")
            return
        
        # Bu kategori için adımları temizle ve yeniden oluştur
        LearningStep.objects.filter(category=category).delete()
        
        # Adım 1: Kelime Öğrenme (Eşleştirme)
        vocabulary_step = LearningStep.objects.create(
            category=category,
            name=f"{category.name} Kelimelerini Öğren",
            description="Bu adımda kelimeleri ve anlamlarını eşleştirerek öğreneceksiniz.",
            step_type="matching",
            order=0,
            word_count=min(10, word_count)
        )
        
        # Adım 2: Yazma Alıştırması
        writing_step = LearningStep.objects.create(
            category=category,
            name=f"{category.name} Yazma Alıştırması",
            description="Bu adımda Türkçe kelimelerin İngilizce karşılıklarını yazacaksınız.",
            step_type="writing",
            order=1,
            word_count=min(10, word_count)
        )
        
        # Adım 3: Çoktan Seçmeli Quiz
        multiple_choice_step = LearningStep.objects.create(
            category=category,
            name=f"{category.name} Çoktan Seçmeli Quiz",
            description="Bu adımda öğrendiğiniz kelimelerin anlamlarını çoktan seçmeli sorularla pekiştirin.",
            step_type="multiple_choice",
            order=2,
            word_count=min(10, word_count)
        )
        
        # Adım 4: Final Quiz
        final_quiz_step = LearningStep.objects.create(
            category=category,
            name=f"{category.name} Final Quiz",
            description="Bu adımda öğrendiğiniz tüm kelimelerin final sınavını yapacaksınız. 3 yanlış hakkınız var!",
            step_type="final_quiz",
            order=3,
            word_count=0,  # Tüm kelimeler
            max_mistakes=3  # Maksimum 3 yanlış hakkı
        )
        
        logger.info(f"{category.name} kategorisi için öğrenme adımları oluşturuldu.")
        
    except Exception as e:
        logger.error(f"Öğrenme adımları oluşturulurken hata: {e}")

def unlock_first_category_for_users():
    """Tüm kullanıcılar için ilk kategorinin kilidini açar."""
    
    # İlk öğrenme yolunu ve ilk kategoriyi bul
    learning_path = LearningPath.objects.first()
    
    if not learning_path:
        logger.error("Hiç öğrenme yolu bulunamadı!")
        return
    
    first_path_category = LearningPathCategory.objects.filter(
        learning_path=learning_path
    ).order_by('order').first()
    
    if not first_path_category:
        logger.error("Öğrenme yolunda hiç kategori bulunamadı!")
        return
    
    first_category = first_path_category.category
    
    # Tüm kullanıcılar için ilk kategorinin kilidini aç
    for user in User.objects.all():
        user_category_progress, created = UserCategoryProgress.objects.get_or_create(
            user=user,
            category=first_category,
            defaults={
                'unlocked': True,
                'completed': False,
                'score': 0,
                'max_score': 100
            }
        )
        
        if created:
            logger.info(f"{user.username} için {first_category.name} kategorisinin kilidi açıldı.")
        else:
            user_category_progress.unlocked = True
            user_category_progress.save()
            logger.info(f"{user.username} için {first_category.name} kategorisinin kilidi açıldı (güncellendi).")
        
        # Kullanıcı profili için öğrenme yolunu ayarla
        if hasattr(user, 'profile'):
            user.profile.current_learning_path = learning_path
            user.profile.save()
            logger.info(f"{user.username} için aktif öğrenme yolu ayarlandı: {learning_path.name}")

if __name__ == "__main__":
    logger.info("Öğrenme yolu başlatma aracı")
    logger.info("--------------------------")
    
    create_learning_path()
    if learning_path:
        unlock_first_category_for_users()
        logger.info("İşlem tamamlandı!") 