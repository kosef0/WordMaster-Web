from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///wordmaster.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    english = db.Column(db.String(100), nullable=False)
    turkish = db.Column(db.String(100), nullable=False)
    part_of_speech = db.Column(db.String(50))
    difficulty = db.Column(db.String(20))
    learned = db.Column(db.Boolean, default=False)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"Word('{self.english}', '{self.turkish}')"

# Routes
@app.route('/')
def home():
    return render_template('index.html', title='Home')

@app.route('/vocabulary')
def vocabulary():
    words = Word.query.order_by(Word.date_added.desc()).all()
    return render_template('vocabulary.html', title='My Vocabulary', words=words)

@app.route('/add_word', methods=['GET', 'POST'])
def add_word():
    if request.method == 'POST':
        english = request.form['english']
        turkish = request.form['turkish']
        part_of_speech = request.form['part_of_speech']
        difficulty = request.form['difficulty']
        
        word = Word(english=english, turkish=turkish, part_of_speech=part_of_speech, difficulty=difficulty)
        db.session.add(word)
        db.session.commit()
        
        flash('Word added successfully!', 'success')
        return redirect(url_for('vocabulary'))
    
    return render_template('add_word.html', title='Add Word')

@app.route('/practice')
def practice():
    return render_template('practice.html', title='Practice')

@app.route('/flashcards')
def flashcards():
    words = Word.query.filter_by(learned=False).all()
    return render_template('flashcards.html', title='Flashcards', words=words)

@app.route('/quiz')
def quiz():
    words = Word.query.filter_by(learned=False).limit(10).all()
    return render_template('quiz.html', title='Quiz', words=words)

@app.route('/profile')
def profile():
    total_words = Word.query.count()
    learned_words = Word.query.filter_by(learned=True).count()
    learning_progress = (learned_words / total_words * 100) if total_words > 0 else 0
    
    return render_template('profile.html', title='Profile', 
                          total_words=total_words, 
                          learned_words=learned_words,
                          learning_progress=learning_progress)

@app.route('/mark_learned/<int:word_id>')
def mark_learned(word_id):
    word = Word.query.get_or_404(word_id)
    word.learned = True
    db.session.commit()
    flash('Word marked as learned!', 'success')
    return redirect(url_for('vocabulary'))

@app.route('/animation-demo')
def animation_demo():
    return render_template('animation_demo.html', title='Animation Demo')

@app.route('/theme/<theme_name>')
def set_theme(theme_name):
    # This would typically set a cookie or session variable
    # For now, we'll just redirect back to the previous page
    return redirect(request.referrer or url_for('home'))

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html', title='Page Not Found'), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)