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
from core.models import Category
from django.db import transaction

# Logging ayarları
logging.basicConfig(
    filename='translate_categories.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# İngilizce-Türkçe kategori çevirileri
CATEGORY_TRANSLATIONS = {
    "Foods": "Yiyecekler",
    "Animals": "Hayvanlar",
    "Clothes": "Kıyafetler",
    "Colors": "Renkler",
    "Numbers": "Sayılar",
    "Days": "Günler",
    "Months": "Aylar",
    "Seasons": "Mevsimler",
    "Weather": "Hava Durumu",
    "Family": "Aile",
    "Body": "Vücut",
    "House": "Ev",
    "School": "Okul",
    "Work": "İş",
    "Transportation": "Ulaşım",
    "Nature": "Doğa",
    "Sports": "Sporlar",
    "Music": "Müzik",
    "Art": "Sanat",
    "Technology": "Teknoloji",
    "Business": "İş Dünyası",
    "Health": "Sağlık",
    "Emotions": "Duygular",
    "Time": "Zaman",
    "Directions": "Yönler",
    "Countries": "Ülkeler",
    "Cities": "Şehirler",
    "Languages": "Diller",
    "Professions": "Meslekler",
    "Hobbies": "Hobiler",
    "Food & Drink": "Yiyecek ve İçecek",
    "Shopping": "Alışveriş",
    "Travel": "Seyahat",
    "Entertainment": "Eğlence",
    "Education": "Eğitim",
    "Science": "Bilim",
    "History": "Tarih",
    "Geography": "Coğrafya",
    "Politics": "Politika",
    "Religion": "Din",
    "Philosophy": "Felsefe",
    "Literature": "Edebiyat",
    "Mathematics": "Matematik",
    "Physics": "Fizik",
    "Chemistry": "Kimya",
    "Biology": "Biyoloji",
    "Medicine": "Tıp",
    "Law": "Hukuk",
    "Economics": "Ekonomi",
    "Psychology": "Psikoloji",
    "Sociology": "Sosyoloji"
}

def translate_categories():
    """Kategori isimlerini İngilizce'den Türkçe'ye çevirir."""
    try:
        translated_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            # Tüm kategorileri al
            categories = Category.objects.all()
            
            for category in categories:
                english_name = category.name
                
                # Eğer kategori zaten Türkçe ise atla
                if english_name in CATEGORY_TRANSLATIONS.values():
                    logger.info(f"'{english_name}' zaten Türkçe. Atlanıyor.")
                    skipped_count += 1
                    continue
                
                # İngilizce ismi Türkçe'ye çevir
                if english_name in CATEGORY_TRANSLATIONS:
                    turkish_name = CATEGORY_TRANSLATIONS[english_name]
                    
                    # Kategori ismini güncelle
                    category.name = turkish_name
                    category.save()
                    
                    logger.info(f"'{english_name}' -> '{turkish_name}' olarak çevrildi.")
                    translated_count += 1
                else:
                    logger.warning(f"'{english_name}' için çeviri bulunamadı.")
                    skipped_count += 1
        
        return translated_count, skipped_count
        
    except Exception as e:
        logger.error(f"Kategoriler çevrilirken hata: {str(e)}")
        return 0, 0

if __name__ == "__main__":
    logger.info("Kategori isimlerini Türkçe'ye çevirme işlemi başlatılıyor...")
    print("Kategori isimlerini Türkçe'ye çevirme işlemi başlatılıyor...")
    
    try:
        # Kategorileri çevir
        translated_count, skipped_count = translate_categories()
        
        logger.info(f"İşlem tamamlandı. {translated_count} kategori çevrildi, {skipped_count} kategori atlandı.")
        print(f"İşlem tamamlandı. {translated_count} kategori çevrildi, {skipped_count} kategori atlandı.")
        
        # Güncel kategori listesini göster
        categories = Category.objects.all().order_by('name')
        
        print("\nGüncel kategori listesi:")
        for category in categories:
            print(f"- {category.name}")
        
    except Exception as e:
        logger.error(f"İşlem sırasında hata: {str(e)}")
        print(f"İşlem sırasında hata: {str(e)}")
        print("Detaylar için translate_categories.log dosyasını kontrol edin.") 