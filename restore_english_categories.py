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
    filename='restore_english_categories.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Geri yüklenecek İngilizce kategoriler
CATEGORIES_TO_RESTORE = [
    "Foods", 
    "Animals", 
    "Clothes"
]

# Örnek kelimeler
SAMPLE_WORDS = {
    # Foods kategorisi için örnek kelimeler
    "Foods": [
        ("apple", "elma"), ("bread", "ekmek"), ("water", "su"), 
        ("milk", "süt"), ("coffee", "kahve"), ("tea", "çay"),
        ("egg", "yumurta"), ("cheese", "peynir"), ("meat", "et"),
        ("chicken", "tavuk"), ("fish", "balık"), ("rice", "pirinç"),
        ("orange", "portakal"), ("banana", "muz"), ("tomato", "domates"),
        ("pasta", "makarna"), ("sugar", "şeker"), ("salt", "tuz"),
        ("butter", "tereyağı"), ("potato", "patates"), ("carrot", "havuç"),
        ("fruit", "meyve"), ("vegetable", "sebze"), ("dessert", "tatlı")
    ],
    # Animals kategorisi için örnek kelimeler
    "Animals": [
        ("dog", "köpek"), ("cat", "kedi"), ("bird", "kuş"), 
        ("fish", "balık"), ("rabbit", "tavşan"), ("horse", "at"),
        ("cow", "inek"), ("pig", "domuz"), ("sheep", "koyun"), 
        ("lion", "aslan"), ("tiger", "kaplan"), ("elephant", "fil"),
        ("wolf", "kurt"), ("bear", "ayı"), ("fox", "tilki"),
        ("monkey", "maymun"), ("snake", "yılan"), ("spider", "örümcek"),
        ("duck", "ördek"), ("chicken", "tavuk"), ("goat", "keçi"),
        ("giraffe", "zürafa"), ("zebra", "zebra"), ("penguin", "penguen")
    ],
    # Clothes kategorisi için örnek kelimeler
    "Clothes": [
        ("shirt", "gömlek"), ("pants", "pantolon"), ("dress", "elbise"),
        ("skirt", "etek"), ("jacket", "ceket"), ("coat", "palto"),
        ("hat", "şapka"), ("shoes", "ayakkabı"), ("socks", "çorap"),
        ("gloves", "eldiven"), ("scarf", "eşarp"), ("tie", "kravat"),
        ("belt", "kemer"), ("jeans", "kot pantolon"), ("t-shirt", "tişört"),
        ("sweater", "kazak"), ("hoodie", "kapüşonlu sweatshirt"), ("suit", "takım elbise"),
        ("blouse", "bluz"), ("pajamas", "pijama"), ("shorts", "şort"),
        ("swimsuit", "mayo"), ("underwear", "iç çamaşırı"), ("uniform", "üniforma")
    ]
}

def restore_categories():
    """İngilizce kategorileri geri yükler."""
    try:
        # JSON dosyasını ilk önce deneyelim
        json_file_path = "kelimeler.json"
        json_data = None
        
        try:
            if os.path.exists(json_file_path):
                with open(json_file_path, 'r', encoding='utf-8') as file:
                    json_data = json.load(file)
                    logger.info(f"JSON dosyası başarıyla yüklendi. Toplam {len(json_data)} kelime bulundu.")
        except Exception as e:
            logger.error(f"JSON dosyası okunurken hata: {e}")
            json_data = None
        
        restored_categories = 0
        restored_words = 0
        
        with transaction.atomic():
            for category_name in CATEGORIES_TO_RESTORE:
                # Kategori zaten var mı kontrol et
                if Category.objects.filter(name=category_name).exists():
                    logger.info(f"'{category_name}' kategorisi zaten var. Atlanıyor.")
                    continue
                
                # Yeni kategori oluştur
                category = Category.objects.create(
                    name=category_name,
                    description=f"{category_name} kategorisi",
                    difficulty_level=1,
                    order=0
                )
                
                # Kelimeleri ekle
                added_words = 0
                
                # Eğer JSON verisi varsa, içinden ilgili kategoriye ait kelimeleri bul
                if json_data:
                    category_words = [word for word in json_data if word.get('category', '').lower() == category_name.lower()]
                    
                    for word_data in category_words:
                        english = word_data.get('english_word', '')
                        turkish = word_data.get('turkish_word', '')
                        
                        if english and turkish:
                            Word.objects.create(
                                english=english,
                                turkish=turkish,
                                category=category,
                                difficulty_level=1,
                                created_at=datetime.now()
                            )
                            added_words += 1
                
                # Eğer JSON'dan yeterli kelime eklenmediyse, örnek kelimelerden ekle
                if added_words < 12 and category_name in SAMPLE_WORDS:
                    # Kaç kelime daha ekleyeceğiz?
                    remaining = 12 - added_words
                    
                    # Örnek kelimelerden ekle
                    for i, (english, turkish) in enumerate(SAMPLE_WORDS[category_name]):
                        if i >= remaining:
                            break
                            
                        # Zaten var mı kontrol et
                        if not Word.objects.filter(english=english, turkish=turkish, category=category).exists():
                            Word.objects.create(
                                english=english,
                                turkish=turkish,
                                category=category,
                                difficulty_level=1,
                                created_at=datetime.now()
                            )
                            added_words += 1
                
                logger.info(f"'{category_name}' kategorisi oluşturuldu ve {added_words} kelime eklendi.")
                restored_categories += 1
                restored_words += added_words
                
        return restored_categories, restored_words
        
    except Exception as e:
        logger.error(f"Kategoriler geri yüklenirken hata: {str(e)}")
        return 0, 0

if __name__ == "__main__":
    logger.info("İngilizce kategorileri geri yükleme işlemi başlatılıyor...")
    print("İngilizce kategorileri geri yükleme işlemi başlatılıyor...")
    
    try:
        # Kategorileri geri yükle
        restored_count, restored_words = restore_categories()
        
        logger.info(f"İşlem tamamlandı. {restored_count} kategori ve {restored_words} kelime geri yüklendi.")
        print(f"İşlem tamamlandı. {restored_count} kategori ve {restored_words} kelime geri yüklendi.")
        
        # Güncel kategori sayısını göster
        categories = Category.objects.all()
        
        print(f"\nGüncel durum:")
        print(f"- Toplam kategori sayısı: {categories.count()}")
        print(f"- Toplam kelime sayısı: {Word.objects.count()}")
        
        # İngilizce kategorileri göster
        eng_categories = Category.objects.filter(name__in=CATEGORIES_TO_RESTORE)
        if eng_categories:
            print("\nGeri yüklenen İngilizce kategoriler:")
            for category in eng_categories:
                word_count = Word.objects.filter(category=category).count()
                print(f"- {category.name}: {word_count} kelime")
        
    except Exception as e:
        logger.error(f"İşlem sırasında hata: {str(e)}")
        print(f"İşlem sırasında hata: {str(e)}")
        print("Detaylar için restore_english_categories.log dosyasını kontrol edin.") 