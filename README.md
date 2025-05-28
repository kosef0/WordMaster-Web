# WordMaster

<div align="center">
  <img src="https://img.freepik.com/free-vector/english-teacher-concept-illustration_114360-7477.jpg" alt="WordMaster Logo" width="200"/>
  <h3>İngilizce Öğrenmenin En Kolay Yolu</h3>
</div>

## 📝 Proje Hakkında

WordMaster, İngilizce kelime öğrenmeyi eğlenceli ve etkili hale getiren kapsamlı bir web ve mobil uygulamadır. Duolingo benzeri bir öğrenme deneyimi sunar ve kullanıcıların kategorilere ayrılmış kelimeler üzerinden İngilizce bilgilerini geliştirmelerini sağlar.

### 🌟 Özellikler

- **Kategori Bazlı Öğrenme**: Farklı zorluk seviyelerinde kategorilere ayrılmış kelimeler
- **Öğrenme Yolları**: Yapılandırılmış öğrenme deneyimi için özel öğrenme yolları
- **Etkileşimli Quizler**: Çoktan seçmeli, eşleştirme, yazma ve dinleme quizleri
- **İlerleme Takibi**: Kullanıcı ilerlemesinin detaylı takibi
- **Oyunlaştırma**: Rozetler, seviyeler ve skor tabloları ile motivasyon artırıcı öğeler
- **Konuşma Pratiği**: AI destekli konuşma pratiği özelliği
- **Mobil Uygulama**: React Native ile geliştirilmiş mobil uygulama

## 🛠️ Teknolojiler

### Backend
- **Django**: Web framework
- **Django REST Framework**: API geliştirme
- **SQLite**: Veritabanı
- **MongoDB**: İkincil veritabanı

### Frontend
- **HTML/CSS/JavaScript**: Web arayüzü
- **Bootstrap 5**: Responsive tasarım
- **React Native**: Mobil uygulama

## 📊 Veri Modeli

Proje aşağıdaki ana veri modellerini içermektedir:

- **Category**: Kelime kategorileri
- **Word**: İngilizce-Türkçe kelimeler
- **LearningPath**: Öğrenme yolları
- **LearningStep**: Öğrenme adımları
- **UserProgress**: Kullanıcı ilerlemesi
- **Quiz**: Quiz sonuçları
- **UserProfile**: Kullanıcı profilleri
- **ChatPractice**: Konuşma pratiği verileri

## 🚀 Kurulum

### Gereksinimler
- Python 3.8+
- Node.js 14+
- npm/yarn

### Çevre Değişkenleri Ayarları
Projeyi çalıştırmadan önce `.env` dosyası oluşturmanız gerekmektedir. Örnek bir `.env` dosyası:

```
# Django ayarları
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=example.com,www.example.com

# MongoDB bağlantısı
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/dbname?retryWrites=true&w=majority
MONGODB_DB_NAME=wordmaster

# CORS ayarları
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

### Backend Kurulumu

```bash
# Repo'yu klonlayın
git clone https://github.com/kosef0/WordMaster-Web.git
cd WordMaster-Web

# Sanal ortam oluşturun
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Logs klasörünü oluşturun
mkdir -p logs

# .env dosyasını oluşturun
# (Yukarıdaki örneği kullanabilirsiniz)

# Veritabanını oluşturun
python manage.py migrate

# Sunucuyu çalıştırın
python manage.py runserver
```

### Mobil Uygulama Kurulumu

```bash
# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npm start
```

## 📱 Mobil Uygulama

WordMaster mobil uygulaması React Native ile geliştirilmiştir ve aşağıdaki özellikleri içerir:

- Kullanıcı kimlik doğrulama
- Kelime kategorileri
- Quizler ve oyunlar
- İlerleme takibi
- Offline çalışma modu

## 🌐 API Endpoints

WordMaster, mobil ve web uygulamaları için REST API sağlar:

- `/api/login/`: Kullanıcı girişi
- `/api/register/`: Yeni kullanıcı kaydı
- `/api/categories/`: Kelime kategorileri
- `/api/words/`: Kelimeler
- `/api/learning-paths/`: Öğrenme yolları
- `/api/progress/`: Kullanıcı ilerlemesi
- `/api/category-progress/`: Kategori bazlı ilerleme
- `/api/game-scores/`: Oyun skorları

## 🖼️ Ekran Görüntüleri

<div align="center">
  <img src="https://via.placeholder.com/250x500" alt="Ana Sayfa" width="200"/>
  <img src="https://via.placeholder.com/250x500" alt="Kategori Listesi" width="200"/>
  <img src="https://via.placeholder.com/250x500" alt="Quiz Ekranı" width="200"/>
</div>

## 🔄 Veri Senkronizasyonu

Proje, MongoDB ve SQLite arasında veri senkronizasyonu için çeşitli betikler içerir:

- `sync_mongodb_to_sqlite.py`: MongoDB'den SQLite'a veri aktarımı
- `import_json_to_sqlite.py`: JSON dosyalarından SQLite'a veri aktarımı
- `clean_duplicates.py`: Yinelenen kayıtları temizleme

## 🔒 Güvenlik

Bu proje aşağıdaki güvenlik önlemlerini içerir:

- **Çevresel Değişkenler**: Hassas bilgiler `.env` dosyasında saklanır ve kod deposunda bulunmaz
- **HTTPS Desteği**: Production ortamında HTTPS zorunlu kılınmıştır
- **CORS Koruması**: Production ortamında sadece izin verilen kaynaklara erişim sağlanır
- **API Hız Sınırlama**: DDoS saldırılarını önlemek için API istekleri sınırlandırılmıştır
- **Güçlü Şifre Politikası**: Minimum 8 karakterli şifre zorunluluğu ve güvenlik kontrolleri
- **XSS Koruması**: Tarayıcı XSS filtresi ve içerik türü denetimi
- **Clickjacking Koruması**: X-Frame-Options başlığı ile koruma

### Canlı Ortama Geçiş

Canlı ortama geçmeden önce aşağıdaki adımları takip edin:

1. Güçlü bir SECRET_KEY oluşturun
2. DEBUG modunu kapatın (`DJANGO_DEBUG=False`)
3. ALLOWED_HOSTS değerini sadece gerçek domain adlarınızla sınırlayın
4. HTTPS ayarlarını etkinleştirin
5. MongoDB bağlantı bilgilerinizi güvenceye alın
6. CORS ayarlarını sadece gerekli domainlerle sınırlayın

## 👥 Katkıda Bulunma

1. Bu repo'yu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inize push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.

## 📞 İletişim

Kosef - [GitHub](https://github.com/kosef0)

Proje Linki: [https://github.com/kosef0/WordMaster-Web](https://github.com/kosef0/WordMaster-Web) 