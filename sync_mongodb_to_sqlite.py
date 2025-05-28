#!/usr/bin/env python
import os
import sys
import django
import logging
from datetime import datetime

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Model sınıflarını içe aktar
from core.models import Category, Word
from core.mongodb import get_categories, get_words_by_category
from bson.objectid import ObjectId
from django.db import transaction

# Logging ayarları
logging.basicConfig(
    filename='sync_mongodb_to_sqlite.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def sync_mongodb_to_sqlite():
    """MongoDB'deki kategorileri ve kelimeleri SQLite'a aktarır"""
    total_categories = 0
    total_words = 0
    
    try:
        # MongoDB'den tüm kategorileri al
        mongo_categories = get_categories()
        logger.info(f"MongoDB'den {len(mongo_categories)} kategori alındı")
        
        for mongo_category in mongo_categories:
            mongo_id = str(mongo_category['_id'])
            category_name = mongo_category.get('name', 'İsimsiz Kategori')
            description = mongo_category.get('description', '')
            
            # Django'da kategoriyi bul veya oluştur
            django_category, created = Category.objects.get_or_create(
                mongo_id=mongo_id,
                defaults={
                    'name': category_name,
                    'description': description,
                    'difficulty_level': mongo_category.get('difficulty_level', 1),
                    'order': mongo_category.get('order', 0)
                }
            )
            
            # Eğer kategori zaten varsa güncellensin mi diye kontrol et (name, description değişmiş olabilir)
            if not created:
                django_category.name = category_name
                django_category.description = description
                django_category.difficulty_level = mongo_category.get('difficulty_level', 1)
                django_category.order = mongo_category.get('order', 0)
                django_category.save()
                logger.info(f"Kategori güncellendi: {category_name} (MongoDB ID: {mongo_id})")
            else:
                logger.info(f"Yeni kategori oluşturuldu: {category_name} (MongoDB ID: {mongo_id})")
                
            # Kategori sayacını artır
            total_categories += 1
            
            # MongoDB'den bu kategoriye ait kelimeleri al
            mongo_words = get_words_by_category(mongo_category['_id'])
            
            # MongoDB'deki kelimeleri Django'ya aktar
            for mongo_word in mongo_words:
                # Mongo ID'yi string'e çevir
                mongo_word_id = str(mongo_word.get('_id', ''))
                english = mongo_word.get('english', '')
                turkish = mongo_word.get('turkish', '')
                
                # Kelime boş mu kontrol et
                if not english or not turkish:
                    logger.warning(f"Boş kelime atlandı: {mongo_word}")
                    continue
                
                # Django'da kelimeyi bul veya oluştur
                django_word, created = Word.objects.get_or_create(
                    english=english,
                    turkish=turkish,
                    category=django_category,
                    defaults={
                        'definition': mongo_word.get('definition', ''),
                        'example_sentence': mongo_word.get('example_sentence', ''),
                        'difficulty_level': mongo_word.get('difficulty_level', 1),
                        'created_at': datetime.now()
                    }
                )
                
                total_words += 1
                
                if created:
                    logger.info(f"Yeni kelime eklendi: {english} - {turkish} (Kategori: {category_name})")
                
            # İşlem sonucu özeti
            logger.info(f"{category_name} kategorisine {len(mongo_words)} kelime aktarıldı")
            
        logger.info(f"İşlem tamamlandı. Toplam {total_categories} kategori ve {total_words} kelime işlendi.")
        return True
    
    except Exception as e:
        logger.error(f"Senkronizasyon sırasında hata: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("MongoDB'den SQLite'a senkronizasyon başlatılıyor...")
    print("MongoDB'den SQLite'a senkronizasyon başlatılıyor...")
    
    # Senkronizasyon işlemini başlat
    result = sync_mongodb_to_sqlite()
    
    if result:
        print("Senkronizasyon başarıyla tamamlandı!")
        
        # İşlem sonrası istatistikleri göster
        categories = Category.objects.all()
        words = Word.objects.all()
        
        print(f"\nGüncel durum:")
        print(f"- Toplam kategori sayısı: {categories.count()}")
        print(f"- Toplam kelime sayısı: {words.count()}")
        
        # İlk birkaç kategoriyi göster
        print("\nKategori örnekleri:")
        for category in categories[:5]:
            word_count = Word.objects.filter(category=category).count()
            print(f"- {category.name}: {word_count} kelime")
    else:
        print("Senkronizasyon sırasında hatalar oluştu. Log dosyasını kontrol edin.") 