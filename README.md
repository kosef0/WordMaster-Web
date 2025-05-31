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
![Ekran görüntüsü 2025-05-28 185816](https://github.com/user-attachments/assets/e2e63005-5ae3-4ecd-ba4e-df1a50be3cdc)
![Ekra![Ekran görüntüsü 2025-05-28 185658](https://github.com/user-attachments/assets/2b5b0899-0462-413b-a939-070aee41d9da)
![Ekran görüntüsü 2025-05-28 185637](https://github.com/user-attachments/assets/f7ec894f-6b50-4c96-8608-28efaddaebd7)
![Ekran görüntüsü 2025-05-28 185615](https://github.com/user-attachments/assets/ccace9fa-ae0f-4474-b6e0-b144999058c6)
![Ekran görüntüsü 2025-05-28 185558](https://github.com/user-attachments/assets/837ccdd2-0c79-4798-b0be-a383d3188d65)
![Ekran görüntüsü 2025-05-28 185339](https://github.com/user-attachments/assets/f97fedcb-b281-4040-8d58-3f95a8e70f05)
![Ekran görüntüsü 2025-05-28 185837](https://github.com/user-attachments/assets/e4fd2252-bafd-4d33-8846-61b4073f5056)
n görüntüsü 2025-05-28 185722](https://github.com/user-attachments/assets/7f22c91d-00d7-46ce-8e20-a56e70773645)
![Ekran görüntüsü 2025-05-25 151052](https://github.com/user-attachments/assets/612763d9-e1a2-4c8d-a487-f57ca7bf52d6)
![Ekran görüntüsü 2025-05-25 151109](https://github.com/user-attachments/assets/c6b24dd1-6b09-46de-b147-118522f92c5a)
![Ekran görüntüsü 2025-05-25 195456](https://github.com/user-attachments/assets/26206c38-8590-42b3-b1ef-660640ab5f55)
![Ekran görüntüsü 2025-05-25 195446](https://github.com/user-attachments/assets/cfa10b31-fdd7-4603-8c44-93e2375d257a)
![Ekran görüntüsü 2025-05-25 195431](https://github.com/user-attachments/assets/bce27daa-8ff6-4a92-ba47-647cc39853d1)
![Ekran görüntüsü 2025-05-25 195505](https://github.com/user-attachments/assets/68fc3632-5d3e-4d73-b0be-9e80d6a90dc6)
## 🔄 Veri İşlemleri

Proje, veri işlemleri için çeşitli yönetim komutları içerir:

- `python manage.py populate_data`: Örnek verilerle veritabanını doldurur

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
5. CORS ayarlarını sadece gerekli domainlerle sınırlayın

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
