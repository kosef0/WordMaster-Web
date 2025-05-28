from rest_framework import serializers
from django.contrib.auth.models import User
from core.models import Category, Word, UserProfile, UserProgress, LearningPath, LearningStep, UserCategoryProgress, GameScore

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'avatar', 'bio', 'level', 'experience_points', 'streak_days']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'difficulty_level', 'order']

class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = ['id', 'english', 'turkish', 'definition', 'example_sentence', 
                  'pronunciation', 'difficulty_level', 'category', 'image', 'audio']

class UserProgressSerializer(serializers.ModelSerializer):
    word_detail = WordSerializer(source='word', read_only=True)
    
    class Meta:
        model = UserProgress
        fields = ['id', 'user', 'word', 'word_detail', 'proficiency_level', 
                 'last_reviewed', 'next_review_date', 'times_reviewed', 'is_mastered']
        read_only_fields = ['user', 'last_reviewed']
    
    def validate_word(self, value):
        """Kelime ID'sini veya kelime nesnesini doğrula"""
        if isinstance(value, dict):
            # Eğer kelime bir nesne olarak geldiyse, ID'sini al
            word_id = value.get('id')
            if not word_id:
                raise serializers.ValidationError("Geçersiz kelime nesnesi, ID gerekli")
                
            try:
                return Word.objects.get(id=word_id)
            except Word.DoesNotExist:
                raise serializers.ValidationError(f"ID={word_id} olan kelime bulunamadı")
        
        return value
        
    def create(self, validated_data):
        """Yeni bir ilerleme kaydı oluştur veya mevcut kaydı güncelle"""
        user = validated_data.get('user')
        word = validated_data.get('word')
        
        # Mevcut kayıt var mı kontrol et
        try:
            instance = UserProgress.objects.get(user=user, word=word)
            # Mevcut kaydı güncelle
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            return instance
        except UserProgress.DoesNotExist:
            # Yeni kayıt oluştur
            return super().create(validated_data)

class LearningPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPath
        fields = ['id', 'name', 'description', 'image']

class LearningStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningStep
        fields = ['id', 'category', 'name', 'description', 'step_type', 'order', 'word_count']

class UserCategoryProgressSerializer(serializers.ModelSerializer):
    # category alanı için hem ID hem de tam nesne desteği ekle
    category_detail = CategorySerializer(source='category', read_only=True)
    
    class Meta:
        model = UserCategoryProgress
        fields = ['id', 'user', 'category', 'category_detail', 'completed', 'score', 'max_score', 'completed_at', 'unlocked']
        read_only_fields = ['user', 'completed_at']
    
    def validate_category(self, value):
        """Kategori ID'sini veya kategori nesnesini doğrula"""
        if isinstance(value, dict):
            # Eğer kategori bir nesne olarak geldiyse, ID'sini al
            category_id = value.get('id')
            if not category_id:
                raise serializers.ValidationError("Geçersiz kategori nesnesi, ID gerekli")
                
            try:
                return Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                raise serializers.ValidationError(f"ID={category_id} olan kategori bulunamadı")
        
        return value
        
    def create(self, validated_data):
        """Yeni bir ilerleme kaydı oluştur veya mevcut kaydı güncelle"""
        user = validated_data.get('user')
        category = validated_data.get('category')
        
        # Mevcut kayıt var mı kontrol et
        try:
            instance = UserCategoryProgress.objects.get(user=user, category=category)
            # Mevcut kaydı güncelle
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            return instance
        except UserCategoryProgress.DoesNotExist:
            # Yeni kayıt oluştur
            return super().create(validated_data)

class GameScoreSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = GameScore
        fields = ['id', 'user', 'username', 'game_type', 'best_score', 'date_achieved']
        read_only_fields = ['user', 'date_achieved']
    
    def get_username(self, obj):
        return obj.user.username

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, trim_whitespace=False)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']
        
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu e-posta adresi zaten kullanılıyor.")
        return value
        
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Bu kullanıcı adı zaten kullanılıyor.")
        return value
        
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        return user 