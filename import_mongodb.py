import json
import pymongo
from bson import ObjectId
import logging
import os
import django
from datetime import datetime

# Django ortamını kur
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from django.conf import settings

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('import_log.log'),
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
    exit(1)

# Koleksiyon isimleri
COLLECTION_CATEGORIES = 'categories'
COLLECTION_WORDS = 'words'

def import_categories():
    """
    Kategorileri MongoDB'ye aktarır
    """
    logger.info("Kategori verileri içe aktarılıyor...")
    
    # Örnek kategori verileri
    categories = [
        {
            "name": "Foods",
            "description": "Foods kategorisindeki kelimeler",
            "image": "https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=500"
        },
        {
            "name": "Animals", 
            "description": "Animals kategorisindeki kelimeler",
            "image": "https://images.unsplash.com/photo-1484406566174-9da000fda645?q=80&w=500"
        },
        {
            "name": "Colors",
            "description": "Colors kategorisindeki kelimeler",
            "image": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=500"
        },
        {
            "name": "Numbers",
            "description": "Numbers kategorisindeki kelimeler",
            "image": "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?q=80&w=500"
        },
        {
            "name": "Family",
            "description": "Family kategorisindeki kelimeler",
            "image": "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=500"
        }
    ]
    
    # Mevcut kategorileri kontrol et
    existing_categories = list(db[COLLECTION_CATEGORIES].find({}, {"name": 1}))
    existing_category_names = [cat["name"] for cat in existing_categories]
    
    # Yeni kategorileri ekle
    categories_added = 0
    for category in categories:
        if category["name"] not in existing_category_names:
            result = db[COLLECTION_CATEGORIES].insert_one(category)
            logger.info(f"Kategori eklendi: {category['name']} (ID: {result.inserted_id})")
            categories_added += 1
    
    if categories_added == 0:
        logger.info("Tüm kategoriler zaten mevcut.")
    else:
        logger.info(f"Toplam {categories_added} yeni kategori eklendi.")

def import_words_from_json(json_file_path):
    """
    JSON dosyasından kelime verilerini içe aktarır
    """
    logger.info(f"{json_file_path} dosyasından kelimeler içe aktarılıyor...")
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            words_data = json.load(file)
            
        logger.info(f"JSON dosyasından {len(words_data)} kelime yüklendi.")
        
        # Kategori-ID eşleştirmesi için kategori veritabanını çek
        categories = list(db[COLLECTION_CATEGORIES].find({}, {"name": 1}))
        category_map = {cat["name"].lower(): cat["_id"] for cat in categories}
        
        # Eksik kategorileri ekle
        unique_categories = set(word["category"].lower() for word in words_data)
        for category_name in unique_categories:
            if category_name not in category_map:
                # Yeni kategoriyi oluştur
                new_category = {
                    "name": category_name.capitalize(),
                    "description": f"{category_name.capitalize()} kategorisindeki kelimeler"
                }
                result = db[COLLECTION_CATEGORIES].insert_one(new_category)
                category_map[category_name] = result.inserted_id
                logger.info(f"Yeni kategori oluşturuldu: {category_name.capitalize()} (ID: {result.inserted_id})")
        
        # Kelimeleri ekle
        words_added = 0
        duplicates = 0
        
        for word_data in words_data:
            # Kategorinin MongoDB ID'sini bul
            category_name = word_data["category"].lower()
            category_id = category_map.get(category_name)
            
            if not category_id:
                logger.warning(f"Kategori bulunamadı: {category_name} - kelime: {word_data['english_word']}")
                continue
            
            # MongoDB'de benzer kelime var mı kontrol et
            existing_word = db[COLLECTION_WORDS].find_one({
                "english": word_data["english_word"],
                "category_id": category_id
            })
            
            if existing_word:
                duplicates += 1
                continue
            
            # Kelimeyi veritabanına ekle
            new_word = {
                "english": word_data["english_word"],
                "turkish": word_data["turkish_word"],
                "level": word_data.get("level", ""),
                "definition": word_data.get("definition", ""),
                "example_sentence": word_data.get("example_sentence", ""),
                "category_id": category_id
            }
            
            result = db[COLLECTION_WORDS].insert_one(new_word)
            words_added += 1
            
            # Her 100 kelimede bir log kaydı
            if words_added % 100 == 0:
                logger.info(f"{words_added} kelime eklendi...")
        
        logger.info(f"Toplam {words_added} yeni kelime eklendi.")
        logger.info(f"Toplam {duplicates} çift kelime atlandı.")
        
    except Exception as e:
        logger.error(f"Kelime verileri içe aktarılırken hata: {e}")

def main():
    logger.info("MongoDB içe aktarma işlemi başlatılıyor...")
    
    # Kategorileri içe aktar
    import_categories()
    
    # Kelimeleri içe aktar
    import_words_from_json('kelimeler.json')
    
    logger.info("MongoDB içe aktarma işlemi tamamlandı.")

if __name__ == "__main__":
    main() 