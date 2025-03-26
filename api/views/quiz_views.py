from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from ..models import Quiz, QuizQuestion, Word
from ..serializers import QuizSerializer, QuizQuestionSerializer
import random
from django.utils import timezone

@api_view(['POST'])
def create_quiz(request):
    """
    Create a new quiz for the user
    """
    # Get words for the quiz (for now, just random 10 words)
    words = list(Word.objects.all())
    if len(words) > 10:
        quiz_words = random.sample(words, 10)
    else:
        quiz_words = words
    
    # Create quiz
    quiz = Quiz.objects.create(
        user=request.user,
        title=f"Quiz {timezone.now().strftime('%Y-%m-%d %H:%M')}",
        description="Test your vocabulary knowledge"
    )
    
    # Create quiz questions
    for word in quiz_words:
        QuizQuestion.objects.create(
            quiz=quiz,
            word=word,
            question_type='multiple_choice'
        )
    
    serializer = QuizSerializer(quiz)
    return Response(serializer.data)

@api_view(['GET'])
def get_quiz(request, quiz_id):
    """
    Get a specific quiz
    """
    quiz = get_object_or_404(Quiz, id=quiz_id, user=request.user)
    serializer = QuizSerializer(quiz)
    return Response(serializer.data)

@api_view(['POST'])
def submit_quiz(request, quiz_id):
    """
    Submit answers for a quiz
    """
    quiz = get_object_or_404(Quiz, id=quiz_id, user=request.user)
    
    # Process answers (simplified for now)
    answers = request.data.get('answers', [])
    correct_count = 0
    
    for answer in answers:
        question_id = answer.get('questionId')
        user_answer = answer.get('answer')
        
        question = get_object_or_404(QuizQuestion, id=question_id, quiz=quiz)
        
        # Simple check - in a real app, this would be more complex
        if user_answer == question.word.turkish:  # Assuming the answer should match the Turkish translation
            question.is_correct = True
            correct_count += 1
        else:
            question.is_correct = False
        
        question.save()
    
    # Update quiz with score
    total_questions = quiz.questions.count()
    if total_questions > 0:
        quiz.score = (correct_count / total_questions) * 100
    else:
        quiz.score = 0
    
    quiz.completed_at = timezone.now()
    quiz.save()
    
    return Response({
        'score': quiz.score,
        'correct_count': correct_count,
        'total_questions': total_questions
    })