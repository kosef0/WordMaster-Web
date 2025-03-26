from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from ..models import UserProgress, UserWord
from ..serializers import UserProgressSerializer
from django.db.models import Count, Avg
from django.utils import timezone
import datetime

@api_view(['GET'])
def get_user_progress(request):
    """
    Get the user's learning progress
    """
    # Get the last 7 days of progress
    end_date = timezone.now().date()
    start_date = end_date - datetime.timedelta(days=6)
    
    progress_data = []
    current_date = start_date
    
    while current_date <= end_date:
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            date=current_date,
            defaults={
                'words_learned': 0,
                'words_reviewed': 0,
                'quiz_score': 0.0,
                'streak_days': 0
            }
        )
        
        progress_data.append(progress)
        current_date += datetime.timedelta(days=1)
    
    serializer = UserProgressSerializer(progress_data, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_learning_stats(request):
    """
    Get statistics about the user's learning
    """
    total_words = UserWord.objects.filter(user=request.user).count()
    learned_words = UserWord.objects.filter(user=request.user, is_learned=True).count()
    
    # Calculate average quiz score
    avg_score = UserProgress.objects.filter(
        user=request.user,
        quiz_score__gt=0
    ).aggregate(avg_score=Avg('quiz_score'))['avg_score'] or 0
    
    # Get current streak
    latest_progress = UserProgress.objects.filter(user=request.user).order_by('-date').first()
    current_streak = latest_progress.streak_days if latest_progress else 0
    
    return Response({
        'total_words': total_words,
        'learned_words': learned_words,
        'avg_quiz_score': avg_score,
        'current_streak': current_streak
    })