from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    native_language = models.CharField(max_length=50, default='Turkish')
    learning_language = models.CharField(max_length=50, default='English')
    daily_goal = models.IntegerField(default=10)
    streak = models.IntegerField(default=0)
    last_activity = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"