from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='category_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    difficulty_level = models.IntegerField(default=1)  # 1-5 zorluk seviyesi
    order = models.IntegerField(default=0)  # Kategorilerin sıralama düzeni
    mongo_id = models.CharField(max_length=24, blank=True, null=True, db_index=True)  # MongoDB ObjectId'yi saklamak için
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['order', 'difficulty_level', 'name']

# ChatPractice için gerekli modeller
class ChatMessage(models.Model):
    SENDER_CHOICES = (
        ('user', 'User'),
        ('ai', 'AI'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField()
    sender = models.CharField(max_length=5, choices=SENDER_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.sender} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        ordering = ['timestamp']

class ChatPracticeProgress(models.Model):
    ENGLISH_LEVELS = (
        ('A1', 'A1 - Beginner'),
        ('A2', 'A2 - Elementary'),
        ('B1', 'B1 - Intermediate'),
        ('B2', 'B2 - Upper Intermediate'),
        ('C1', 'C1 - Advanced'),
        ('C2', 'C2 - Proficiency'),
    )
    
    PRACTICE_MODES = (
        ('konuşma', 'Konuşma Pratiği'),
        ('kelime', 'Kelime Pratiği'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_practice_progress')
    correct_answers = models.IntegerField(default=0)
    total_attempts = models.IntegerField(default=0)
    last_session_date = models.DateField(auto_now=True)
    streak = models.IntegerField(default=0)
    english_level = models.CharField(max_length=2, choices=ENGLISH_LEVELS, default='B1')
    practice_mode = models.CharField(max_length=10, choices=PRACTICE_MODES, default='konuşma')
    
    def __str__(self):
        return f"{self.user.username} - {self.english_level} - {self.practice_mode}"
    
    class Meta:
        unique_together = ['user', 'english_level', 'practice_mode']

class Word(models.Model):
    english = models.CharField(max_length=100)
    turkish = models.CharField(max_length=100)
    definition = models.TextField(blank=True, null=True)
    example_sentence = models.TextField(blank=True, null=True)
    pronunciation = models.CharField(max_length=200, blank=True, null=True)
    difficulty_level = models.IntegerField(default=1)  # 1-5 zorluk seviyesi
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='words')
    image = models.ImageField(upload_to='word_images/', blank=True, null=True)
    audio = models.FileField(upload_to='word_audio/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.english} - {self.turkish}"

class LearningPath(models.Model):
    """Öğrenme yolu - kategorilerin sıralı bir şekilde öğrenilmesi"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='learning_path_images/', blank=True, null=True)
    categories = models.ManyToManyField(Category, through='LearningPathCategory')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class LearningPathCategory(models.Model):
    """Öğrenme yolundaki kategorilerin sırası"""
    learning_path = models.ForeignKey(LearningPath, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)
    required_score = models.IntegerField(default=80)  # Bir sonraki kategorinin kilidini açmak için gereken minimum puan
    
    class Meta:
        ordering = ['order']
        unique_together = ['learning_path', 'category']
    
    def __str__(self):
        return f"{self.learning_path.name} - {self.category.name} (Sıra: {self.order})"

class LearningStep(models.Model):
    """Kategori içindeki öğrenme adımları"""
    STEP_TYPES = (
        ('vocabulary', 'Kelime Öğrenme'),
        ('matching', 'Eşleştirme'),
        ('multiple_choice', 'Çoktan Seçmeli'),
        ('writing', 'Yazma'),
        ('listening', 'Dinleme'),
        ('final_quiz', 'Final Quiz'),
        ('treasure', 'Hazine'),
    )
    
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='learning_steps')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    step_type = models.CharField(max_length=20, choices=STEP_TYPES)
    order = models.IntegerField(default=0)
    word_count = models.IntegerField(default=10)  # Bu adımda kaç kelime öğretileceği
    max_mistakes = models.IntegerField(default=3, blank=True, null=True)  # Final quiz için maksimum hata sayısı
    
    class Meta:
        ordering = ['category', 'order']
    
    def __str__(self):
        return f"{self.category.name} - {self.name} (Adım: {self.order})"

class UserStepProgress(models.Model):
    """Kullanıcının adım bazında ilerlemesi"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='step_progress')
    learning_step = models.ForeignKey(LearningStep, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=100)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'learning_step']
    
    def __str__(self):
        return f"{self.user.username} - {self.learning_step.category.name} - {self.learning_step.name}"

class UserCategoryProgress(models.Model):
    """Kullanıcının kategori bazında ilerlemesi"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='category_progress')
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    unlocked = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=100)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'category']
    
    def __str__(self):
        return f"{self.user.username} - {self.category.name}"

class UserProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    word = models.ForeignKey(Word, on_delete=models.CASCADE, related_name='learners')
    proficiency_level = models.IntegerField(default=0)  # 0-5 bilme seviyesi
    last_reviewed = models.DateTimeField(auto_now=True)
    next_review_date = models.DateTimeField(null=True, blank=True)
    times_reviewed = models.IntegerField(default=0)
    is_mastered = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username} - {self.word.english} - Level: {self.proficiency_level}"
    
    class Meta:
        unique_together = ['user', 'word']

class Quiz(models.Model):
    QUIZ_TYPES = (
        ('multiple_choice', 'Çoktan Seçmeli'),
        ('writing', 'Yazma'),
        ('matching', 'Eşleştirme'),
        ('listening', 'Dinleme'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='quizzes', null=True, blank=True)
    learning_step = models.ForeignKey(LearningStep, on_delete=models.CASCADE, related_name='quizzes', null=True, blank=True)
    quiz_type = models.CharField(max_length=20, choices=QUIZ_TYPES)
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    date_taken = models.DateTimeField(auto_now_add=True)
    wrong_answers = models.IntegerField(default=0)  # Yanlış cevap sayısı
    
    def __str__(self):
        return f"{self.user.username} - {self.quiz_type} Quiz - {self.date_taken.strftime('%Y-%m-%d')}"

class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    word = models.ForeignKey(Word, on_delete=models.CASCADE, related_name='quiz_questions')
    is_correct = models.BooleanField(default=False)
    user_answer = models.CharField(max_length=200, blank=True, null=True)
    
    def __str__(self):
        return f"Quiz Question - {self.word.english}"

class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.ImageField(upload_to='achievement_icons/', blank=True, null=True)
    date_earned = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='user_avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    level = models.IntegerField(default=1)
    experience_points = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_activity = models.DateTimeField(auto_now=True)
    current_learning_path = models.ForeignKey(LearningPath, on_delete=models.SET_NULL, null=True, blank=True, related_name='learners')
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

class GameScore(models.Model):
    GAME_TYPES = (
        ('word_hunt', 'Kelime Avı'),
        ('word_puzzle', 'Kelime Yapbozu'),
        ('speed_quiz', 'Hızlı Quiz'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_scores')
    game_type = models.CharField(max_length=20, choices=GAME_TYPES)
    best_score = models.IntegerField(default=0)
    date_achieved = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'game_type']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_game_type_display()} - {self.best_score}"
