from rest_framework import serializers
from .models import Word, UserWord, Category, Quiz, QuizQuestion, UserProgress

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class WordSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Word
        fields = ['id', 'english', 'turkish', 'part_of_speech', 'difficulty', 
                  'example_sentence', 'image_url', 'audio_url', 'categories']

class UserWordSerializer(serializers.ModelSerializer):
    word = WordSerializer(read_only=True)
    
    class Meta:
        model = UserWord
        fields = ['id', 'word', 'is_learned', 'familiarity_level', 
                  'next_review_date', 'last_reviewed']

class QuizQuestionSerializer(serializers.ModelSerializer):
    word = WordSerializer(read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'word', 'question_type', 'is_correct']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'created_at', 
                  'completed_at', 'score', 'questions']

class UserProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProgress
        fields = ['id', 'date', 'words_learned', 'words_reviewed', 
                  'quiz_score', 'streak_days']