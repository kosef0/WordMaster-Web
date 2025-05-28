#!/usr/bin/env python
import os
import sys
import json
import django
import logging
from datetime import datetime

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Model sınıflarını içe aktar
from core.models import Category, Word
from django.db import transaction

# Logging ayarları
logging.basicConfig(
    filename='import_json_to_sqlite.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_json_data(json_file):
    """JSON dosyasından verileri yükler"""
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
            logger.info(f"JSON dosyası başarıyla yüklendi. Toplam {len(data)} kelime bulundu.")
            return data
    except Exception as e:
        logger.error(f"JSON dosyası okunurken hata: {e}")
        return None

def import_words_to_sqlite(json_data):
    """Kelimeleri SQLite veritabanına aktarır"""
    if not json_data:
        logger.error("Geçerli JSON verisi bulunamadı.")
        return False
    
    # İşlem başarı sayaçları
    total_words = len(json_data)
    imported_count = 0
    skipped_count = 0
    error_count = 0
    
    # Benzersiz kategorileri belirle
    categories = set()
    for word in json_data:
        if 'category' in word:
            categories.add(word['category'])
    
    logger.info(f"JSON dosyasında {len(categories)} benzersiz kategori bulundu: {', '.join(categories)}")
    
    # Her kategori için veritabanı kaydı oluştur veya güncelle
    category_objects = {}
    for category_name in categories:
        try:
            category, created = Category.objects.get_or_create(
                name=category_name.title(),  # İlk harfi büyük olarak kaydet
                defaults={
                    'description': f"{category_name.title()} kategorisi",
                    'difficulty_level': 1,
                    'order': 0
                }
            )
            
            category_objects[category_name] = category
            
            if created:
                logger.info(f"Yeni kategori oluşturuldu: {category_name}")
            else:
                logger.info(f"Mevcut kategori kullanılıyor: {category_name}")
        except Exception as e:
            logger.error(f"Kategori oluşturulurken hata: {category_name} - {e}")
    
    # Toplu işlem ile kelimeleri ekle
    with transaction.atomic():
        for word_data in json_data:
            try:
                # JSON yapısından verileri al
                english_word = word_data.get('english_word', '')
                turkish_word = word_data.get('turkish_word', '')
                category_name = word_data.get('category', '')
                level = word_data.get('level', 'A1')
                
                # Veri doğrulama
                if not english_word or not turkish_word or not category_name:
                    logger.warning(f"Eksik veri: {word_data}")
                    skipped_count += 1
                    continue
                
                # Bu kelime zaten var mı kontrol et
                if Word.objects.filter(english=english_word, turkish=turkish_word).exists():
                    logger.info(f"Bu kelime zaten var, atlanıyor: {english_word} - {turkish_word}")
                    skipped_count += 1
                    continue
                
                # Kategori nesnesi
                category = category_objects.get(category_name)
                if not category:
                    logger.warning(f"Kategori bulunamadı: {category_name}")
                    skipped_count += 1
                    continue
                
                # Zorluğu düzeyine göre belirle
                difficulty_mapping = {
                    'A1': 1,
                    'A2': 2,
                    'B1': 3,
                    'B2': 4,
                    'C1': 5,
                    'C2': 6
                }
                difficulty_level = difficulty_mapping.get(level, 1)
                
                # Yeni word nesnesi oluştur
                word = Word(
                    english=english_word,
                    turkish=turkish_word,
                    category=category,
                    difficulty_level=difficulty_level,
                    created_at=datetime.now()
                )
                word.save()
                
                imported_count += 1
                
                # Her 100 kelimede bir ilerleme güncellemesi göster
                if imported_count % 100 == 0:
                    logger.info(f"İlerleme: {imported_count}/{total_words} kelime işlendi")
                    print(f"İlerleme: {imported_count}/{total_words} kelime işlendi")
                
            except Exception as e:
                logger.error(f"Kelime eklenirken hata: {word_data} - {e}")
                error_count += 1
    
    # İşlem özeti
    logger.info(f"İşlem tamamlandı. Toplam: {total_words}, Eklenen: {imported_count}, Atlanan: {skipped_count}, Hata: {error_count}")
    print(f"İşlem tamamlandı. Toplam: {total_words}, Eklenen: {imported_count}, Atlanan: {skipped_count}, Hata: {error_count}")
    
    return True

if __name__ == "__main__":
    logger.info("JSON verilerini SQLite veritabanına aktarma işlemi başlatılıyor...")
    print("JSON verilerini SQLite veritabanına aktarma işlemi başlatılıyor...")
    
    # JSON dosya yolunu belirle
    json_file_path = "kelimeler.json"
    
    # JSON verilerini yükle
    json_data = load_json_data(json_file_path)
    
    if json_data:
        # Verileri SQLite'a aktar
        result = import_words_to_sqlite(json_data)
        
        if result:
            logger.info("Veri aktarımı başarıyla tamamlandı!")
            print("Veri aktarımı başarıyla tamamlandı!")
        else:
            logger.error("Veri aktarımı sırasında hatalar oluştu.")
            print("Veri aktarımı sırasında hatalar oluştu. Detaylar için log dosyasını kontrol edin.")
    else:
        logger.error("JSON verileri yüklenemedi.")
        print("JSON verileri yüklenemedi. Dosya yolunu ve formatını kontrol edin.") 