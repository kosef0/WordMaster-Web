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
from django.db.models import Count
from django.db import transaction

# Logging ayarları
logging.basicConfig(
    filename='add_missing_words.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Örnek kelimeler
SAMPLE_WORDS = {
    # Yiyecekler kategorisi için örnek kelimeler
    "Food": [
        ("apple", "elma"), ("bread", "ekmek"), ("water", "su"), 
        ("milk", "süt"), ("coffee", "kahve"), ("tea", "çay"),
        ("egg", "yumurta"), ("cheese", "peynir"), ("meat", "et"),
        ("chicken", "tavuk"), ("fish", "balık"), ("rice", "pirinç"),
        ("orange", "portakal"), ("banana", "muz"), ("tomato", "domates")
    ],
    # Hayvanlar kategorisi için örnek kelimeler
    "Animal": [
        ("dog", "köpek"), ("cat", "kedi"), ("bird", "kuş"), 
        ("fish", "balık"), ("rabbit", "tavşan"), ("horse", "at"),
        ("cow", "inek"), ("pig", "domuz"), ("sheep", "koyun"), 
        ("lion", "aslan"), ("tiger", "kaplan"), ("elephant", "fil"),
        ("wolf", "kurt"), ("bear", "ayı"), ("fox", "tilki")
    ],
    # Renkler kategorisi için örnek kelimeler
    "Color": [
        ("red", "kırmızı"), ("blue", "mavi"), ("green", "yeşil"),
        ("yellow", "sarı"), ("black", "siyah"), ("white", "beyaz"),
        ("brown", "kahverengi"), ("pink", "pembe"), ("purple", "mor"),
        ("orange", "turuncu"), ("gray", "gri"), ("gold", "altın rengi")
    ],
    # Sayılar kategorisi için örnek kelimeler
    "Number": [
        ("one", "bir"), ("two", "iki"), ("three", "üç"),
        ("four", "dört"), ("five", "beş"), ("six", "altı"),
        ("seven", "yedi"), ("eight", "sekiz"), ("nine", "dokuz"),
        ("ten", "on"), ("hundred", "yüz"), ("thousand", "bin")
    ],
    # Aile kategorisi için örnek kelimeler
    "Family": [
        ("father", "baba"), ("mother", "anne"), ("brother", "erkek kardeş"),
        ("sister", "kız kardeş"), ("son", "oğul"), ("daughter", "kız"),
        ("husband", "koca"), ("wife", "eş"), ("grandfather", "büyükbaba"),
        ("grandmother", "büyükanne"), ("uncle", "amca"), ("aunt", "teyze")
    ],
    # Genel örnek kelimeler - diğer kategoriler için
    "General": [
        ("hello", "merhaba"), ("goodbye", "hoşçakal"), ("yes", "evet"), 
        ("no", "hayır"), ("thank you", "teşekkür ederim"), ("please", "lütfen"),
        ("good", "iyi"), ("bad", "kötü"), ("big", "büyük"),
        ("small", "küçük"), ("today", "bugün"), ("tomorrow", "yarın"),
        ("house", "ev"), ("car", "araba"), ("book", "kitap")
    ]
}

def add_words_to_category(category, word_list, min_words=12):
    """Belirli bir kategoriye kelimeler ekler."""
    existing_count = Word.objects.filter(category=category).count()
    
    if existing_count >= min_words:
        logger.info(f"Kategori '{category.name}' zaten yeterli kelimeye sahip: {existing_count} kelime")
        return 0
    
    # Eklenecek kelime sayısını belirle
    required_words = min_words - existing_count
    
    # Mevcut kelimeleri al, tekrar eklemekten kaçınmak için
    existing_words = set(Word.objects.filter(category=category).values_list('english', flat=True))
    
    # Eklenen kelime sayısını takip et
    added_count = 0
    
    # Örnek kelimelerden eksik olanları ekle
    with transaction.atomic():
        for english, turkish in word_list:
            # Eğer kelime zaten varsa atla
            if english.lower() in existing_words or added_count >= required_words:
                continue
            
            # Yeni kelime oluştur
            word = Word(
                english=english,
                turkish=turkish,
                category=category,
                difficulty_level=1,
                created_at=datetime.now()
            )
            word.save()
            
            added_count += 1
            existing_words.add(english.lower())
            
            if added_count >= required_words:
                break
    
    logger.info(f"Kategori '{category.name}' için {added_count} kelime eklendi. Toplam: {existing_count + added_count}")
    return added_count

def find_matching_words(category_name):
    """Kategori adına göre en uygun örnek kelime listesini belirler."""
    category_name_lower = category_name.lower()
    
    # Kategori adına göre uygun örnek kelime setini belirle
    if "food" in category_name_lower or "yiyecek" in category_name_lower or "yemek" in category_name_lower:
        return SAMPLE_WORDS["Food"]
    elif "animal" in category_name_lower or "hayvan" in category_name_lower:
        return SAMPLE_WORDS["Animal"]
    elif "color" in category_name_lower or "renk" in category_name_lower:
        return SAMPLE_WORDS["Color"]
    elif "number" in category_name_lower or "sayı" in category_name_lower:
        return SAMPLE_WORDS["Number"]
    elif "family" in category_name_lower or "aile" in category_name_lower:
        return SAMPLE_WORDS["Family"]
    else:
        return SAMPLE_WORDS["General"]

def process_categories():
    """Tüm kategorileri işler ve eksik kelimeleri ekler."""
    # Tüm kategorileri al
    categories = Category.objects.all()
    logger.info(f"Toplam {categories.count()} kategori işlenecek")
    
    total_added = 0
    min_words_per_category = 12  # Her kategori için minimum kelime sayısı
    
    for category in categories:
        # Kategori adına göre uygun kelime listesini al
        word_list = find_matching_words(category.name)
        
        # Eksik kelimeleri ekle
        added = add_words_to_category(category, word_list, min_words_per_category)
        total_added += added
    
    return total_added

if __name__ == "__main__":
    logger.info("Eksik kelimeler için kontrol başlatılıyor...")
    print("Eksik kelimeler için kontrol başlatılıyor...")
    
    # Kategorileri işle ve eksik kelimeleri ekle
    total_added = process_categories()
    
    logger.info(f"İşlem tamamlandı. Toplam {total_added} kelime eklendi.")
    print(f"İşlem tamamlandı. Toplam {total_added} kelime eklendi.")
    
    # Güncel durumu göster
    categories = Category.objects.annotate(word_count=Count('words'))
    empty_categories = categories.filter(word_count=0).count()
    
    print(f"\nGüncel durum:")
    print(f"- Toplam kategori sayısı: {categories.count()}")
    print(f"- Boş kategori sayısı: {empty_categories}")
    print(f"- Toplam kelime sayısı: {Word.objects.count()}")
    
    # Az kelimeli kategorileri göster
    low_word_categories = categories.filter(word_count__lt=5).order_by('word_count')
    if low_word_categories:
        print("\nAz kelimeli kategoriler:")
        for category in low_word_categories:
            print(f"- {category.name}: {category.word_count} kelime") 