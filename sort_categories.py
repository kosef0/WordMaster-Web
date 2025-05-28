from pymongo import MongoClient
import sys

def main():
    """Atlas veritabanındaki kategorileri sırala"""
    try:
        # MongoDB bağlantısı
        client = MongoClient("mongodb+srv://kosef:k132465f@clusterwordmaster.cle0svh.mongodb.net/wmmobil?retryWrites=true&w=majority")
        db = client["wmmobil"]
        categories_collection = db["categories"]
        
        # Tüm kategorileri getir
        categories = list(categories_collection.find())
        
        print(f"Toplam {len(categories)} kategori bulundu.")
        
        # Mevcut kategorileri göster
        print("\nMevcut kategoriler ve sıralamaları:")
        for i, cat in enumerate(categories):
            order = cat.get('order', i)
            diff = cat.get('difficulty_level', 1)
            print(f"{i+1}. {cat['name']} - Order: {order}, Zorluk: {diff}")
        
        # Yiyecekler kategorisini bul ve en başa yerleştir
        food_category = None
        for cat in categories:
            if cat['name'].lower() in ['yiyecekler', 'food', 'foods', 'yemekler']:
                food_category = cat
                break
        
        if food_category:
            print(f"\n'{food_category['name']}' kategorisi ilk sıraya yerleştirilecek.")
            # Yiyecekler kategorisini 0 order değeri ile güncelle
            categories_collection.update_one(
                {"_id": food_category["_id"]},
                {"$set": {"order": 0}}
            )
            
            # Diğer kategorilerin order değerlerini güncelle
            for i, cat in enumerate(categories):
                if cat["_id"] != food_category["_id"]:
                    # İlk kategoriden sonra sıralama 1'den başlar
                    categories_collection.update_one(
                        {"_id": cat["_id"]},
                        {"$set": {"order": i+1}}
                    )
            
            print("Tüm kategorilerin sıralaması güncellendi.")
        else:
            print("\nYiyecekler kategorisi bulunamadı!")
            
            # Kullanıcıya hangi kategoriyi ilk sıraya koymak istediğini sor
            print("\nMevcut kategoriler:")
            for i, cat in enumerate(categories):
                print(f"{i+1}. {cat['name']}")
            
            try:
                selection = int(input("\nHangi kategori ilk sırada olsun? (1-{0}): ".format(len(categories))))
                if 1 <= selection <= len(categories):
                    selected_category = categories[selection-1]
                    
                    # Seçilen kategoriyi 0 order değeri ile güncelle
                    categories_collection.update_one(
                        {"_id": selected_category["_id"]},
                        {"$set": {"order": 0}}
                    )
                    
                    # Diğer kategorilerin order değerlerini güncelle
                    for i, cat in enumerate(categories):
                        if cat["_id"] != selected_category["_id"]:
                            # İlk kategoriden sonra sıralama 1'den başlar
                            categories_collection.update_one(
                                {"_id": cat["_id"]},
                                {"$set": {"order": i+1}}
                            )
                    
                    print(f"'{selected_category['name']}' kategorisi ilk sıraya yerleştirildi.")
                    print("Tüm kategorilerin sıralaması güncellendi.")
                else:
                    print("Geçersiz seçim!")
            except ValueError:
                print("Geçersiz giriş!")
        
        # Güncellenmiş kategorileri göster
        print("\nGüncellenmiş kategori sıralaması:")
        updated_categories = list(categories_collection.find().sort([("order", 1)]))
        for i, cat in enumerate(updated_categories):
            order = cat.get('order', i)
            diff = cat.get('difficulty_level', 1)
            print(f"{i+1}. {cat['name']} - Order: {order}, Zorluk: {diff}")
            
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 