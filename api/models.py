from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"

class Word(models.Model):
    english = models.CharField(max_length=100)
    turkish = models.CharField(max_length=100)
    part_of_speech = models.CharField(max_length=50, blank=True)
    difficulty = models.CharField(max_length=20, choices=[
        ('easy', 'Kolay'),
        ('medium', 'Orta'),
        ('hard', 'Zor'),
    ])
    example_sentence = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    audio_url = models.URLField(blank=True)
    categories = models.ManyToManyField(Category, related_name='words')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.english} - {self.turkish}"

class UserWord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_words')
    word = models.ForeignKey(Word, on_delete=models.CASCADE, related_name='user_words')
    is_learned = models.BooleanField(default=False)
    familiarity_level = models.IntegerField(default=0)  # 0-5 scale
    next_review_date = models.DateTimeField(null=True, blank=True)
    last_reviewed = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'word')
    
    def __str__(self):
        return f"{self.user.username} - {self.word.english}"

class Quiz(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"

class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    word = models.ForeignKey(Word, on_delete=models.CASCADE)
    question_type = models.CharField(max_length=50, choices=[
        ('multiple_choice', 'Çoktan Seçmeli'),
        ('true_false', 'Doğru/Yanlış'),
        ('fill_blank', 'Boşluk Doldurma'),
    ])
    is_correct = models.BooleanField(null=True, blank=True)
    
    def __str__(self):
        return f"Question for {self.word.english}"

class UserProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    date = models.DateField()
    words_learned = models.IntegerField(default=0)
    words_reviewed = models.IntegerField(default=0)
    quiz_score = models.FloatField(default=0.0)  # Average score for the day
    streak_days = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('user', 'date')
    
    def __str__(self):
        return f"{self.user.username}'s progress on {self.date}"