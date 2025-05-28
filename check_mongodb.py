#!/usr/bin/env python
import os
import sys
import django
import logging
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
import time

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Logging ayarları
logging.basicConfig(
    filename='check_mongodb.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB bağlantı URL'si
MONGODB_URI = "mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority"

# Sabit kategori ID'leri
KATEGORI_YIYECEKLER_ID = "68262b5bd2ae30189de75fb0"
KATEGORI_HAYVANLAR_ID = "68262b5bd2ae30189de75fb1"

def get_mongodb_client():
    """MongoDB Atlas'a bağlantı kurar, başarısız olursa yeniden dener"""
    max_retries = 3
    retry_delay = 1  # saniye
    
    for attempt in range(max_retries):
        try:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            # Bağlantıyı test et
            client.admin.command('ping')
            logger.info("MongoDB Atlas'a bağlantı başarılı")
            return client
        except Exception as e:
            logger.warning(f"MongoDB bağlantı hatası (deneme {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2  # Deneme süresini uzat
    
    logger.error(f"MongoDB Atlas'a {max_retries} deneme sonrası bağlanamadı")
    return None

def check_mongodb_connection():
    """MongoDB Atlas bağlantısını kontrol eder ve temel bilgileri raporlar"""
    logger.info("----- MongoDB Bağlantı Kontrolü -----")
    logger.info(f"Tarih/Saat: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # MongoDB'ye bağlan
    client = get_mongodb_client()
    if not client:
        logger.error("MongoDB bağlantısı kurulamadı, kontrol sonlandırılıyor.")
        return False
    
    try:
        # Veritabanını seç
        db = client["wmmobil"]
        
        # Koleksiyonları listele
        collections = db.list_collection_names()
        logger.info(f"MongoDB koleksiyonları: {collections}")
        
        # Her koleksiyondaki belge sayısını kontrol et
        for collection_name in collections:
            try:
                doc_count = db[collection_name].count_documents({})
                logger.info(f"Koleksiyon '{collection_name}': {doc_count} belge")
                
                # Örnek bir belgeyi göster
                if doc_count > 0:
                    sample_doc = db[collection_name].find_one()
                    if sample_doc:
                        logger.info(f"Örnek belge alanları: {list(sample_doc.keys())}")
            except Exception as e:
                logger.error(f"Koleksiyon '{collection_name}' kontrolünde hata: {e}")
        
        # Kategori ve kelime bilgilerini kontrol et
        check_categories_and_words(db)
        
        return True
    except Exception as e:
        logger.error(f"MongoDB genel kontrol hatası: {e}")
        return False
    finally:
        # Bağlantıyı kapat
        client.close()
        logger.info("MongoDB bağlantısı kapatıldı")

def check_categories_and_words(db):
    """Kategorileri ve kelimeleri kontrol eder"""
    try:
        # Tüm kategorileri al
        categories = list(db["categories"].find())
        logger.info(f"Toplam {len(categories)} kategori bulundu")
        
        # Her kategori için bilgi göster
        for i, category in enumerate(categories[:5]):  # İlk 5 kategoriyi göster
            category_id = category.get("_id")
            category_name = category.get("name", "İsimsiz")
            
            logger.info(f"Kategori {i+1}: {category_name} (ID: {category_id})")
            
            # Bu kategorideki kelimeleri bul
            try:
                words = list(db["words"].find({"category_id": category_id}))
                logger.info(f"  - {len(words)} kelime bulundu (category_id ile)")
                
                # Eğer category_id ile kelime bulunamazsa kategori adı ile ara
                if not words:
                    words = list(db["words"].find({"category": category_name}))
                    logger.info(f"  - {len(words)} kelime bulundu (kategori adı ile)")
                    
                    # Eğer yine bulunamazsa case-insensitive ara
                    if not words:
                        words = list(db["words"].find({"category": {"$regex": category_name, "$options": "i"}}))
                        logger.info(f"  - {len(words)} kelime bulundu (regex ile)")
                
                # Kelime örneklerini göster
                if words:
                    for j, word in enumerate(words[:3]):  # İlk 3 kelimeyi göster
                        logger.info(f"    - Kelime {j+1}: {word.get('english', 'Bilinmiyor')} - {word.get('turkish', 'Bilinmiyor')}")
            except Exception as e:
                logger.error(f"Kategori {category_name} için kelime arama hatası: {e}")
        
        # Sabit kategori ID'leri ile kontrol
        logger.info("\n----- Sabit Kategori ID'leri ile Kontrol -----")
        
        # Yiyecekler kategorisi
        try:
            yiyecekler_id = ObjectId(KATEGORI_YIYECEKLER_ID)
            yiyecekler_category = db["categories"].find_one({"_id": yiyecekler_id})
            
            if yiyecekler_category:
                logger.info(f"Yiyecekler kategorisi bulundu: {yiyecekler_category.get('name', 'İsimsiz')}")
                
                # Kategoriye ait kelimeleri bul
                food_words = list(db["words"].find({"category_id": yiyecekler_id}))
                logger.info(f"Yiyecekler kategorisinde {len(food_words)} kelime bulundu")
                
                # İlk birkaç kelimeyi göster
                for i, word in enumerate(food_words[:5]):
                    logger.info(f"  - Kelime {i+1}: {word.get('english', 'Bilinmiyor')} - {word.get('turkish', 'Bilinmiyor')}")
            else:
                logger.warning(f"Yiyecekler kategorisi ID {KATEGORI_YIYECEKLER_ID} ile bulunamadı")
        except Exception as e:
            logger.error(f"Yiyecekler kategorisi kontrolünde hata: {e}")
        
        # Hayvanlar kategorisi
        try:
            hayvanlar_id = ObjectId(KATEGORI_HAYVANLAR_ID)
            hayvanlar_category = db["categories"].find_one({"_id": hayvanlar_id})
            
            if hayvanlar_category:
                logger.info(f"Hayvanlar kategorisi bulundu: {hayvanlar_category.get('name', 'İsimsiz')}")
                
                # Kategoriye ait kelimeleri bul
                animal_words = list(db["words"].find({"category_id": hayvanlar_id}))
                logger.info(f"Hayvanlar kategorisinde {len(animal_words)} kelime bulundu")
                
                # İlk birkaç kelimeyi göster
                for i, word in enumerate(animal_words[:5]):
                    logger.info(f"  - Kelime {i+1}: {word.get('english', 'Bilinmiyor')} - {word.get('turkish', 'Bilinmiyor')}")
            else:
                logger.warning(f"Hayvanlar kategorisi ID {KATEGORI_HAYVANLAR_ID} ile bulunamadı")
        except Exception as e:
            logger.error(f"Hayvanlar kategorisi kontrolünde hata: {e}")
        
        # Django kategorilerine göre test
        from core.models import Category
        logger.info("\n----- Django Kategorileri ile Test -----")
        
        django_categories = Category.objects.all()[:5]
        for django_category in django_categories:
            logger.info(f"Django kategori: {django_category.name} (ID: {django_category.id})")
            
            # Kategori adına göre kelime çek
            from core.mongodb import get_words_by_category_name
            mongo_words = get_words_by_category_name(django_category.name, limit=5)
            
            logger.info(f"  - {len(mongo_words)} kelime bulundu")
            
            # İlk birkaç kelimeyi göster
            for i, word in enumerate(mongo_words[:3]):
                logger.info(f"    - Kelime {i+1}: {word.get('english', 'Bilinmiyor')} - {word.get('turkish', 'Bilinmiyor')}")
        
    except Exception as e:
        logger.error(f"Kategori ve kelime kontrolünde genel hata: {e}")

if __name__ == "__main__":
    logger.info("MongoDB kontrol scripti başlatıldı")
    
    # MongoDB bağlantı ve veri kontrolü
    success = check_mongodb_connection()
    
    if success:
        logger.info("MongoDB kontrolü başarıyla tamamlandı")
        print("MongoDB kontrolü başarılı! Ayrıntılar check_mongodb.log dosyasında.")
    else:
        logger.error("MongoDB kontrolü tamamlanamadı, hatalar oluştu")
        print("MongoDB kontrolünde sorunlar tespit edildi. Lütfen check_mongodb.log dosyasını kontrol edin.") 