import json
import pymongo
from bson.objectid import ObjectId
import sys

# Bağlantı bilgileri
CONNECTION_STRING = "mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority"

def create_categories_from_words(words):
    """Kelimelerden benzersiz kategoriler oluştur"""
    categories = {}
    for word in words:
        category_name = word.get("category", "").title()  # Kategori adını büyük harfle başlat
        if category_name and category_name not in categories:
            categories[category_name] = {
                "name": category_name,
                "description": f"{category_name} kategorisindeki kelimeler",
                "image": get_category_image(category_name)
            }
    return list(categories.values())

def get_category_image(category_name):
    """Kategori için varsayılan bir görsel URL'si döndür"""
    # Basit bir görsel URL mapping
    image_mapping = {
        "Foods": "https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=500",
        "Animals": "https://images.unsplash.com/photo-1484406566174-9da000fda645?q=80&w=500",
        "Clothes": "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=500",
        "Colors": "https://images.unsplash.com/photo-1541336744128-c4b211d13087?q=80&w=500",
        "Family": "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=500",
        "Friends": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500",
        "Health": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=500",
        "Drinks": "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=500",
        "Home": "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=500",
        "Body And Face": "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=500",
        "Numbers": "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?q=80&w=500",
        "Materials": "https://images.unsplash.com/photo-1473621038790-b778b4750efe?q=80&w=500",
        "School": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=500",
        "Sports": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=500",
        "Places": "https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=500",
        "Directions": "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=500",
        "Transport": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=500",
        "Weather": "https://images.unsplash.com/photo-1592210454359-9043f067919b?q=80&w=500",
        "Work": "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=500",
        "Toys": "https://images.unsplash.com/photo-1558060370-d644485927b2?q=80&w=500",
        "Suggestions": "https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=500",
        "Events": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=500",
        "Personal Information": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=500",
        "Nationality": "https://images.unsplash.com/photo-1526471809545-5e974a20fb77?q=80&w=500",
        "Occupation": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=500"
    }
    
    return image_mapping.get(category_name, "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=500")

def prepare_words(words, category_id_map):
    """Kelimeleri MongoDB formatına dönüştür"""
    formatted_words = []
    for word in words:
        category_name = word.get("category", "").title()
        if category_name in category_id_map:
            formatted_words.append({
                "english": word.get("english_word", ""),
                "turkish": word.get("turkish_word", ""),
                "level": word.get("level", "A1"),
                "definition": "",  # Boş tanım
                "example_sentence": "",  # Boş örnek
                "category_id": category_id_map[category_name]
            })
    return formatted_words

def main():
    try:
        # JSON dosyasını oku
        print("Kelimeler.json dosyası okunuyor...")
        with open("kelimeler.json", "r", encoding="utf-8") as file:
            words_data = json.load(file)
        
        print(f"Toplam {len(words_data)} kelime bulundu.")
        
        # MongoDB'ye bağlan
        print("MongoDB Atlas'a bağlanılıyor...")
        client = pymongo.MongoClient(CONNECTION_STRING)
        db = client["wmmobil"]
        
        # Koleksiyonları al
        categories_collection = db["categories"]
        words_collection = db["words"]
        
        # Önce mevcut kategori ve kelime sayılarını kontrol et
        existing_categories = list(categories_collection.find())
        existing_words = list(words_collection.find())
        print(f"Mevcut veritabanında {len(existing_categories)} kategori ve {len(existing_words)} kelime bulunuyor.")
        
        # Benzersiz kategorileri oluştur
        unique_categories = create_categories_from_words(words_data)
        print(f"{len(unique_categories)} farklı kategori oluşturuldu.")
        
        # Kategorileri ekle ve ID'leri al
        category_id_map = {}
        for category in unique_categories:
            # Aynı isimde bir kategori var mı kontrol et
            existing_category = categories_collection.find_one({"name": category["name"]})
            
            if existing_category:
                category_id = existing_category["_id"]
                print(f"Kategori zaten mevcut: {category['name']}")
            else:
                result = categories_collection.insert_one(category)
                category_id = result.inserted_id
                print(f"Yeni kategori eklendi: {category['name']}")
            
            category_id_map[category["name"]] = category_id
        
        # Kelimeleri formatla ve ekle
        formatted_words = prepare_words(words_data, category_id_map)
        
        # Kelime bazında kontrol ederek ekle
        added_count = 0
        duplicate_count = 0
        
        for word in formatted_words:
            # Aynı kategoride aynı İngilizce kelime var mı kontrol et
            existing_word = words_collection.find_one({
                "english": word["english"],
                "category_id": word["category_id"]
            })
            
            if not existing_word:
                words_collection.insert_one(word)
                added_count += 1
            else:
                duplicate_count += 1
                
        print(f"{added_count} yeni kelime eklendi, {duplicate_count} kelime zaten mevcuttu.")
        print("İşlem tamamlandı!")
        
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main()) 