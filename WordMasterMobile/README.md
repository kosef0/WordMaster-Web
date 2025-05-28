# Word Master Mobile

Word Master İngilizce öğrenme platformunun mobil uygulaması. Bu uygulama, web uygulamasıyla aynı SQLite veritabanını kullanarak senkronize çalışır.

## Özellikler

- Kullanıcı kimlik doğrulama (giriş, kayıt)
- Kelime kategorileri
- Kelime öğrenme ve pratik yapma
- Quizler ve oyunlar
- İlerleme takibi
- Web uygulamasıyla veritabanı senkronizasyonu

## Kurulum

1. Projeyi klonlayın:

```bash
git clone https://github.com/yourusername/word-master-mobile.git
cd word-master-mobile
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. `src/api/apiService.js` dosyasındaki API_URL değişkenini Django sunucunuzun adresine göre güncelleyin:

```javascript
const API_URL = 'http://YOUR_SERVER_IP:8000/api';
```

4. Uygulamayı başlatın:

```bash
npm start
```

## Geliştirme

### Proje Yapısı

```
src/
├── api/              # API istekleri ve veritabanı senkronizasyonu
├── components/       # Yeniden kullanılabilir bileşenler
├── database/         # SQLite veritabanı işlemleri
├── navigation/       # React Navigation yapılandırması
├── screens/          # Uygulama ekranları
├── store/            # Redux store ve slice'lar
├── styles/           # Tema ve stil dosyaları
└── utils/            # Yardımcı fonksiyonlar
```

### Veritabanı Senkronizasyonu

Bu uygulama, Django web uygulamasıyla aynı SQLite veritabanını kullanır. Veritabanı senkronizasyonu için:

1. Django tarafında API endpoint'lerini ayarlayın (bkz. `src/api/DjangoAPI.md`)
2. Kullanıcı giriş yaptığında veya manuel olarak senkronizasyon başlatıldığında `syncDatabase()` fonksiyonu çağrılır
3. Sunucudaki ve yerel veritabanının son güncelleme zamanları karşılaştırılır
4. Daha yeni olan veritabanı diğerine kopyalanır

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir özellik dalı oluşturun (`git checkout -b yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Dalınıza push yapın (`git push origin yeni-ozellik`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje [MIT lisansı](LICENSE) altında lisanslanmıştır.
