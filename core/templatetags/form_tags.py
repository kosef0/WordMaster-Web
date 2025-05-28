from django import template

register = template.Library()

@register.filter
def add_class(field, css_class):
    """Form alanlarına CSS sınıfı ekler"""
    return field.as_widget(attrs={"class": css_class}) 