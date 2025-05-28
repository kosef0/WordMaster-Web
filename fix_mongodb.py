import pymongo
import logging
from bson import ObjectId
import os
import django

# Django ortamını kur
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from django.conf import settings

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_mongodb_log.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Beklenen koleksiyon isimleri
EXPECTED_COLLECTIONS = {
    'categories': 'Kategoriler',
    'words': 'Kelimeler',
    'learning_progresses': 'Kullanıcı ilerleme kayıtları',
    'users': 'Kullanıcı bilgileri',
    'quizzes': 'Quiz verileri'
}

# Alternatif koleksiyon isimlerine göre eşleştirme
COLLECTION_MAPPING = {
    'category': 'categories',
    'Category': 'categories',
    'CATEGORIES': 'categories',
    'word': 'words', 
    'Word': 'words',
    'WORDS': 'words',
    'learning_progress': 'learning_progresses',
    'progress': 'learning_progresses',
    'user_progress': 'learning_progresses',
    'user': 'users',
    'User': 'users',
    'USERS': 'users',
    'quiz': 'quizzes',
    'Quiz': 'quizzes',
    'QUIZZES': 'quizzes'
}

def fix_mongodb_collections():
    """MongoDB koleksiyonlarını kontrol eder ve düzeltir"""
    try:
        # MongoDB bağlantısı
        client = pymongo.MongoClient("mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority")
        db = client["wmmobil"]
        logger.info("MongoDB bağlantısı başarılı!")
        
        # Mevcut koleksiyonları listele
        existing_collections = db.list_collection_names()
        logger.info(f"Mevcut koleksiyonlar: {existing_collections}")
        
        # Beklenen koleksiyonları kontrol et
        missing_collections = []
        for expected_collection in EXPECTED_COLLECTIONS:
            if expected_collection not in existing_collections:
                missing_collections.append(expected_collection)
        
        if not missing_collections:
            logger.info("Tüm beklenen koleksiyonlar mevcut!")
            return
        
        logger.warning(f"Eksik koleksiyonlar: {missing_collections}")
        
        # Alternatif isimleri kontrol et
        for missing in missing_collections:
            found = False
            
            # Alternatif isimlerden uygun olanı bul
            for alt_name in existing_collections:
                if alt_name in COLLECTION_MAPPING and COLLECTION_MAPPING[alt_name] == missing:
                    # Koleksiyonu yeniden adlandır
                    logger.info(f"'{alt_name}' koleksiyonu '{missing}' olarak yeniden adlandırılacak")
                    
                    # MongoDB'de koleksiyon adı değiştirme: tüm verileri yeni koleksiyona kopyala
                    docs = list(db[alt_name].find())
                    if docs:
                        db[missing].insert_many(docs)
                        logger.info(f"{len(docs)} doküman '{alt_name}' koleksiyonundan '{missing}' koleksiyonuna kopyalandı")
                    
                    # Eski koleksiyonu sil (opsiyonel)
                    # db[alt_name].drop()
                    # logger.info(f"'{alt_name}' koleksiyonu silindi")
                    
                    found = True
                    break
            
            if not found:
                # Boş bir koleksiyon oluştur
                db.create_collection(missing)
                logger.info(f"'{missing}' koleksiyonu oluşturuldu (boş)")
        
        # Son durumu kontrol et
        updated_collections = db.list_collection_names()
        logger.info(f"Güncellenmiş koleksiyonlar: {updated_collections}")
        
        for expected in EXPECTED_COLLECTIONS:
            if expected in updated_collections:
                count = db[expected].count_documents({})
                logger.info(f"'{expected}' koleksiyonu: {count} doküman")
        
    except Exception as e:
        logger.error(f"MongoDB düzeltme işlemi sırasında hata: {e}")

def display_collections_summary():
    """Tüm koleksiyonların özetini gösterir"""
    try:
        # MongoDB bağlantısı
        client = pymongo.MongoClient("mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority")
        db = client["wmmobil"]
        
        print("\n=== MongoDB Koleksiyonları Özeti ===")
        
        for collection_name in db.list_collection_names():
            count = db[collection_name].count_documents({})
            print(f"{collection_name}: {count} doküman")
            
            # İlk 2 dokümanı göster
            if count > 0:
                print("Örnek dokümanlar:")
                for i, doc in enumerate(db[collection_name].find().limit(2)):
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])  # ObjectId'yi string'e çevir
                    print(f"  {i+1}. {doc}")
            
            print("-" * 50)
        
    except Exception as e:
        logger.error(f"Koleksiyon özeti gösterilirken hata: {e}")

if __name__ == "__main__":
    fix_mongodb_collections()
    display_collections_summary() 