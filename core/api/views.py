from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
import re
import logging

from core.models import (
    Category, Word, UserProfile, UserProgress, 
    LearningPath, LearningStep, UserCategoryProgress,
    GameScore
)
from core.api.serializers import (
    CategorySerializer, WordSerializer, UserSerializer, UserProfileSerializer,
    UserProgressSerializer, LearningPathSerializer, LearningStepSerializer,
    UserCategoryProgressSerializer, LoginSerializer, RegisterSerializer,
    GameScoreSerializer
)

logger = logging.getLogger('core')

class RegistrationRateThrottle(AnonRateThrottle):
    rate = '5/hour'

class LoginRateThrottle(AnonRateThrottle):
    rate = '10/minute'

class RegisterView(APIView):
    """
    API endpoint kullanıcı kaydı için
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegistrationRateThrottle]
    
    def post(self, request, *args, **kwargs):
        # Kullanıcı adı güvenlik kontrolü
        username = request.data.get('username', '')
        if not re.match(r'^[\w.@+-]+$', username):
            return Response({
                'error': 'Kullanıcı adı sadece harf, rakam ve @/./+/-/_ karakterlerini içerebilir.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Şifre güvenlik kontrolü
        password = request.data.get('password', '')
        if len(password) < 8:
            return Response({
                'error': 'Şifre en az 8 karakter uzunluğunda olmalıdır.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                
                # Kullanıcı profili oluştur
                profile = UserProfile.objects.create(user=user)
                
                # Token oluştur
                token, created = Token.objects.get_or_create(user=user)
                
                return Response({
                    'token': token.key,
                    'user_id': user.pk,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'level': profile.level,
                    'experience_points': profile.experience_points,
                    'streak_days': profile.streak_days
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Kayıt hatası: {str(e)}")
                return Response({
                    'error': 'Kayıt işlemi sırasında bir hata oluştu.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(ObtainAuthToken):
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # Brute force saldırılarını önlemek için başarısız giriş denemelerini logla
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            
            # Kullanıcı profili
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Başarılı girişi logla
            logger.info(f"Başarılı giriş: {username}")
            
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'level': profile.level,
                'experience_points': profile.experience_points,
                'streak_days': profile.streak_days
            })
        else:
            # Başarısız girişi logla
            logger.warning(f"Başarısız giriş denemesi: {username}")
            
            return Response({
                'error': 'Kullanıcı adı veya şifre hatalı'
            }, status=status.HTTP_401_UNAUTHORIZED)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by('order', 'difficulty_level', 'name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class WordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Word.objects.all()
        
        # Kategori filtreleme
        category_id = self.request.query_params.get('category', None)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset

class UserProfileViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Sadece kendi profilini görebilir
        return UserProfile.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        # URL'den gelen pk değerini al
        pk = kwargs.get('pk')
        
        # Eğer pk, mevcut kullanıcının ID'si ise veya 'me' ise
        if pk == 'me' or str(pk) == str(request.user.id):
            # Mevcut kullanıcının profilini bul veya oluştur
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        
        # Diğer kullanıcıların profillerini görüntülemeyi engelle
        return Response(
            {"detail": "Bu profile erişim izniniz yok."}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    def perform_create(self, serializer):
        # Eğer user parametresi verilmemişse, mevcut kullanıcıyı kullan
        if 'user' not in serializer.validated_data:
            serializer.save(user=self.request.user)
        else:
            # Başka bir kullanıcı için profil oluşturmayı engelle
            if serializer.validated_data['user'] != self.request.user:
                raise permissions.PermissionDenied("Başka bir kullanıcı için profil oluşturamazsınız.")
            serializer.save()
        
    def create(self, request, *args, **kwargs):
        # Kullanıcı için profil zaten var mı kontrol et
        try:
            # Önce request.data'daki user ID'yi kontrol et
            user_id = request.data.get('user')
            if user_id and int(user_id) != request.user.id:
                return Response(
                    {"detail": "Başka bir kullanıcı için profil oluşturamazsınız."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            profile = UserProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except (UserProfile.DoesNotExist, User.DoesNotExist):
            # Profil yoksa yeni oluştur
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class UserProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    def create(self, request, *args, **kwargs):
        """Yeni bir kelime ilerlemesi oluşturur veya mevcut ilerlemeyi günceller"""
        try:
            # Kelime ID'sini al
            word_id = request.data.get('word')
            if not word_id:
                return Response(
                    {"error": "word parametresi gereklidir"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Kelime var mı kontrol et
            try:
                word = Word.objects.get(id=word_id)
            except Word.DoesNotExist:
                return Response(
                    {"error": f"ID={word_id} olan kelime bulunamadı"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Mevcut ilerleme var mı kontrol et
            try:
                progress = UserProgress.objects.get(user=request.user, word=word)
                serializer = self.get_serializer(progress, data=request.data, partial=True)
            except UserProgress.DoesNotExist:
                # Yeni ilerleme oluştur
                serializer = self.get_serializer(data=request.data)
            
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"İlerleme kaydetme hatası: {str(e)}")
            return Response(
                {"error": f"İlerleme kaydedilirken bir hata oluştu: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def update(self, request, *args, **kwargs):
        """Kelime ilerlemesini günceller"""
        try:
            instance = self.get_object()
            
            # Sadece kendi ilerlemesini güncelleyebilir
            if instance.user != request.user:
                return Response(
                    {"error": "Bu ilerlemeyi güncelleme izniniz yok"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"İlerleme güncelleme hatası: {str(e)}")
            return Response(
                {"error": f"İlerleme güncellenirken bir hata oluştu: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LearningPathViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LearningPath.objects.all()
    serializer_class = LearningPathSerializer
    permission_classes = [permissions.IsAuthenticated]

class LearningStepViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LearningStepSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = LearningStep.objects.all()
        
        # Kategori filtreleme
        category_id = self.request.query_params.get('category', None)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset

class UserCategoryProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserCategoryProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserCategoryProgress.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Yeni bir kategori ilerlemesi oluşturur veya mevcut ilerlemeyi günceller"""
        try:
            # Kategori ID'sini al
            category_id = request.data.get('category')
            if not category_id:
                return Response(
                    {"error": "category parametresi gereklidir"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Kategori var mı kontrol et
            try:
                category = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                return Response(
                    {"error": f"ID={category_id} olan kategori bulunamadı"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Mevcut ilerleme var mı kontrol et
            try:
                progress = UserCategoryProgress.objects.get(user=request.user, category=category)
                serializer = self.get_serializer(progress, data=request.data, partial=True)
            except UserCategoryProgress.DoesNotExist:
                # Yeni ilerleme oluştur
                serializer = self.get_serializer(data=request.data)
            
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error(f"Kategori ilerlemesi kaydetme hatası: {str(e)}")
            return Response(
                {"error": f"Kategori ilerlemesi kaydedilirken bir hata oluştu: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Kategori ilerlemesini günceller"""
        try:
            instance = self.get_object()
            
            # Sadece kendi ilerlemesini güncelleyebilir
            if instance.user != request.user:
                return Response(
                    {"error": "Bu ilerlemeyi güncelleme izniniz yok"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Kategori ilerlemesi güncelleme hatası: {str(e)}")
            return Response(
                {"error": f"Kategori ilerlemesi güncellenirken bir hata oluştu: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GameScoreViewSet(viewsets.ModelViewSet):
    """
    API endpoint oyun skorlarını kaydetmek ve görüntülemek için
    """
    serializer_class = GameScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Oyun tipine göre filtreleme
        game_type = self.request.query_params.get('game_type', None)
        if game_type:
            return GameScore.objects.filter(game_type=game_type).order_by('-best_score')[:10]
        
        # Tüm oyun skorları
        return GameScore.objects.all().order_by('-best_score')[:20]
    
    def create(self, request, *args, **kwargs):
        """Yeni bir oyun skoru kaydeder veya mevcut skoru günceller"""
        try:
            # Oyun tipi kontrolü
            game_type = request.data.get('game_type')
            if not game_type:
                return Response(
                    {"error": "game_type parametresi gereklidir"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Skor kontrolü
            best_score = request.data.get('best_score')
            if best_score is None:
                return Response(
                    {"error": "best_score parametresi gereklidir"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Mevcut en yüksek skoru bul
                game_score = GameScore.objects.get(user=request.user, game_type=game_type)
                
                # Yeni skor daha yüksekse güncelle
                if int(best_score) > game_score.best_score:
                    game_score.best_score = best_score
                    game_score.save()
                    
                serializer = self.get_serializer(game_score)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
            except GameScore.DoesNotExist:
                # Yeni skor oluştur
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=request.user)
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Oyun skoru kaydetme hatası: {str(e)}")
            return Response(
                {"error": f"Oyun skoru kaydedilirken bir hata oluştu: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )