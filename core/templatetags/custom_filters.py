from django import template

register = template.Library()

@register.filter
def get_completed_steps(steps):
    """Tamamlanan adım sayısını döndürür."""
    return sum(1 for step in steps if step['completed'])

@register.filter
def get_progress_percentage(steps):
    """Tamamlanan adımların yüzdesini döndürür."""
    total = len(steps)
    if total == 0:
        return 0
    completed = sum(1 for step in steps if step['completed'])
    return int((completed / total) * 100)

@register.filter
def mul(value, arg):
    """İki değeri çarpar."""
    return value * arg

@register.filter
def divisibleby(value, arg):
    """Bir değerin başka bir değere bölümünü döndürür."""
    if arg == 0:
        return 0
    return value / arg

@register.filter
def get_item(dictionary, key):
    """Dictionary'den anahtar ile değer alır"""
    return dictionary.get(key) 