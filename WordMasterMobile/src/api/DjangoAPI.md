# Django API Entegrasyonu

Bu dosya, React Native mobil uygulaması ile Django web uygulaması arasında SQLite veritabanı senkronizasyonu için gerekli adımları içerir.

## 1. Django'da Gerekli API Endpoint'leri

Django projenizde `api` adında bir uygulama oluşturun:

```bash
python manage.py startapp api
```

## 2. API Uygulamasını settings.py'a Ekleyin

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework.authtoken',
    'api',
    # ...
]
```

## 3. API Servislerini Oluşturun

`api/views.py` dosyasını aşağıdaki gibi düzenleyin:

```python
import os
import base64
import datetime
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes

# Veritabanı dosya yolu
DB_PATH = os.path.join(settings.BASE_DIR, 'db.sqlite3')

class DatabaseDownloadView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # SQLite dosyasını oku
            with open(DB_PATH, 'rb') as db_file:
                db_content = db_file.read()
            
            # Base64 kodlama
            db_base64 = base64.b64encode(db_content)
            
            # HTTP yanıtı oluştur
            response = HttpResponse(db_base64, content_type='application/octet-stream')
            response['Content-Disposition'] = 'attachment; filename="wordmaster.db"'
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class DatabaseUploadView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # İstek gövdesinden base64 kodlu veritabanını al
            db_base64 = request.data.get('database')
            if not db_base64:
                return Response({'error': 'Veritabanı verisi bulunamadı'}, status=400)
            
            # Base64 kodunu çöz
            db_content = base64.b64decode(db_base64)
            
            # Yedek oluştur
            backup_path = f"{DB_PATH}.backup-{timezone.now().strftime('%Y%m%d%H%M%S')}"
            with open(backup_path, 'wb') as backup_file:
                with open(DB_PATH, 'rb') as current_file:
                    backup_file.write(current_file.read())
            
            # Yeni veritabanını kaydet
            with open(DB_PATH, 'wb') as db_file:
                db_file.write(db_content)
            
            # Son güncelleme zamanını güncelle
            update_last_update_time()
            
            return Response({'success': True, 'message': 'Veritabanı başarıyla güncellendi'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class DatabaseLastUpdateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Veritabanı dosyasının son değiştirilme zamanını al
            last_update = get_last_update_time()
            return Response({'last_update': last_update.isoformat()})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

# Yardımcı fonksiyonlar
def get_last_update_time():
    """Veritabanı son güncelleme zamanını al"""
    try:
        # settings.py'da tanımlanan bir değişkeni kontrol et
        last_update_file = os.path.join(settings.BASE_DIR, 'db_last_update.txt')
        if os.path.exists(last_update_file):
            with open(last_update_file, 'r') as f:
                timestamp = f.read().strip()
                return datetime.datetime.fromisoformat(timestamp)
        else:
            # Dosya yoksa, veritabanı dosyasının son değiştirilme zamanını kullan
            timestamp = os.path.getmtime(DB_PATH)
            last_update = datetime.datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone())
            update_last_update_time(last_update)
            return last_update
    except Exception as e:
        print(f"Son güncelleme zamanı alınırken hata: {e}")
        # Hata durumunda şu anki zamanı döndür
        return timezone.now()

def update_last_update_time(timestamp=None):
    """Veritabanı son güncelleme zamanını güncelle"""
    if timestamp is None:
        timestamp = timezone.now()
    
    last_update_file = os.path.join(settings.BASE_DIR, 'db_last_update.txt')
    with open(last_update_file, 'w') as f:
        f.write(timestamp.isoformat())
```

## 4. API URL'lerini Tanımlayın

`api/urls.py` dosyasını oluşturun:

```python
from django.urls import path
from .views import DatabaseDownloadView, DatabaseUploadView, DatabaseLastUpdateView

urlpatterns = [
    path('database/download', DatabaseDownloadView.as_view(), name='database-download'),
    path('database/upload', DatabaseUploadView.as_view(), name='database-upload'),
    path('database/last-update', DatabaseLastUpdateView.as_view(), name='database-last-update'),
]
```

## 5. Ana URL Yapılandırmasına Ekleyin

Ana `urls.py` dosyasını düzenleyin:

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),
    # ...
    path('api/', include('api.urls')),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),
    # ...
]
```

## 6. REST Framework Ayarlarını Yapılandırın

`settings.py` dosyasına aşağıdaki ayarları ekleyin:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

## 7. CORS Ayarlarını Yapılandırın

React Native uygulamasının API'ye erişebilmesi için CORS ayarlarını yapılandırın:

```bash
pip install django-cors-headers
```

`settings.py` dosyasına ekleyin:

```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # En üstte olmalı
    # Diğer middleware'ler...
]

CORS_ALLOW_ALL_ORIGINS = True  # Geliştirme için, üretimde spesifik origin'leri belirtin
```

## 8. Token Oluşturma

Kullanıcılar için API token'ları oluşturun:

```python
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Her kullanıcı için token oluştur
for user in User.objects.all():
    Token.objects.get_or_create(user=user)
```

Bu kodu Django shell'de çalıştırabilirsiniz:

```bash
python manage.py shell
```

## 9. Mobil Uygulamada API URL'sini Güncelleme

React Native uygulamasında `src/api/apiService.js` dosyasındaki API_URL değişkenini Django sunucunuzun adresine göre güncelleyin:

```javascript
const API_URL = 'http://YOUR_SERVER_IP:8000/api';
```

## 10. Güvenlik Notları

- Üretim ortamında HTTPS kullanın
- CORS ayarlarını sadece gerekli origin'lere izin verecek şekilde kısıtlayın
- Token'ları güvenli bir şekilde saklayın
- Veritabanı yedeklerini düzenli olarak alın 