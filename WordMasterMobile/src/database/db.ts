import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';

// SQLite türleri
export type SQLTransaction = SQLite.SQLTransaction;
export type SQLResultSet = SQLite.SQLResultSet;

// SQLite veritabanı tipi
export interface Database {
  transaction: (callback: (tx: Transaction) => void, error?: (error: Error) => void, success?: () => void) => void;
}

// SQLite transaction tipi
export interface Transaction {
  executeSql: (
    sqlStatement: string,
    args: any[],
    success?: (tx: Transaction, resultSet: ResultSet) => void,
    error?: (tx: Transaction, error: Error) => boolean
  ) => void;
}

// SQLite sonuç seti tipi
export interface ResultSet {
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
  rowsAffected: number;
  insertId?: number;
}

// Veritabanı bağlantısını oluştur
export const db = SQLite.openDatabase('wordmaster.db');

// Veritabanı bağlantısı
export const getDBConnection = () => {
  return SQLite.openDatabase('wordmaster.db');
};

// Veritabanı tablolarını oluştur
export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // Kullanıcılar tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS auth_user (
          id INTEGER PRIMARY KEY,
          password TEXT NOT NULL,
          last_login TEXT,
          is_superuser BOOLEAN NOT NULL,
          username TEXT NOT NULL UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          is_staff BOOLEAN NOT NULL,
          is_active BOOLEAN NOT NULL,
          date_joined TEXT NOT NULL
        )`,
        [],
        () => console.log('auth_user tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('auth_user tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Profil tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS accounts_profile (
          id INTEGER PRIMARY KEY,
          bio TEXT,
          profile_pic TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES auth_user (id)
        )`,
        [],
        () => console.log('accounts_profile tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('accounts_profile tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Kelime kategorileri tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_category (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          image TEXT
        )`,
        [],
        () => console.log('wordapp_category tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_category tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Kelimeler tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_word (
          id INTEGER PRIMARY KEY,
          english TEXT NOT NULL,
          turkish TEXT NOT NULL,
          example_sentence TEXT,
          pronunciation TEXT,
          difficulty INTEGER DEFAULT 1,
          category_id INTEGER,
          FOREIGN KEY (category_id) REFERENCES wordapp_category (id)
        )`,
        [],
        () => console.log('wordapp_word tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_word tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Kullanıcı kelime ilişkisi tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_userword (
          id INTEGER PRIMARY KEY,
          is_learned BOOLEAN DEFAULT 0,
          last_practiced TEXT,
          familiarity_level INTEGER DEFAULT 0,
          user_id INTEGER,
          word_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES auth_user (id),
          FOREIGN KEY (word_id) REFERENCES wordapp_word (id)
        )`,
        [],
        () => console.log('wordapp_userword tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_userword tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Quiz tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_quiz (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          difficulty INTEGER DEFAULT 1,
          category_id INTEGER,
          FOREIGN KEY (category_id) REFERENCES wordapp_category (id)
        )`,
        [],
        () => console.log('wordapp_quiz tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_quiz tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Quiz soruları tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_quizquestion (
          id INTEGER PRIMARY KEY,
          question_text TEXT NOT NULL,
          question_type TEXT NOT NULL,
          quiz_id INTEGER,
          word_id INTEGER,
          FOREIGN KEY (quiz_id) REFERENCES wordapp_quiz (id),
          FOREIGN KEY (word_id) REFERENCES wordapp_word (id)
        )`,
        [],
        () => console.log('wordapp_quizquestion tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_quizquestion tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Quiz cevapları tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_quizanswer (
          id INTEGER PRIMARY KEY,
          answer_text TEXT NOT NULL,
          is_correct BOOLEAN NOT NULL,
          question_id INTEGER,
          FOREIGN KEY (question_id) REFERENCES wordapp_quizquestion (id)
        )`,
        [],
        () => console.log('wordapp_quizanswer tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('wordapp_quizanswer tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Kullanıcı quiz sonuçları tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS wordapp_quizresult (
          id INTEGER PRIMARY KEY,
          score INTEGER NOT NULL,
          completion_time INTEGER,
          date_taken TEXT NOT NULL,
          user_id INTEGER,
          quiz_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES auth_user (id),
          FOREIGN KEY (quiz_id) REFERENCES wordapp_quiz (id)
        )`,
        [],
        () => {
          console.log('wordapp_quizresult tablosu oluşturuldu veya zaten var');
          resolve();
        },
        (_, error) => {
          console.error('wordapp_quizresult tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );

      // Oyun skorları tablosu
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS game_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          game_id TEXT NOT NULL,
          score INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES auth_user(id)
        )`,
        [],
        () => console.log('game_scores tablosu oluşturuldu veya zaten var'),
        (_, error) => {
          console.error('game_scores tablosu oluşturulurken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Tip tanımlamaları
export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  word_count?: number;
}

export interface Word {
  id: number;
  english: string;
  turkish: string;
  example_sentence?: string;
  pronunciation?: string;
  difficulty: number;
  category_id: number;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Profile {
  id: number;
  bio?: string;
  profile_pic?: string;
  points: number;
  level: number;
  experience_points?: number;
  user_id: number;
}

export interface UserWord {
  id: number;
  is_learned: boolean;
  last_practiced: string;
  familiarity_level: number;
  user_id: number;
  word_id: number;
}

// Veritabanından kategorileri getir
export const getCategories = (): Promise<Category[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM wordapp_category',
        [],
        (_, { rows }) => {
          resolve(rows._array as Category[]);
        },
        (_, error) => {
          console.error('Kategoriler getirilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Kategoriye göre kelimeleri getir
export const getWordsByCategory = (categoryId: number): Promise<Word[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM wordapp_word WHERE category_id = ?',
        [categoryId],
        (_, { rows }) => {
          resolve(rows._array as Word[]);
        },
        (_, error) => {
          console.error('Kelimeler getirilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Kullanıcının kelimelerini getir
export const getUserWords = (userId: number): Promise<UserWord[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM wordapp_userword WHERE user_id = ?',
        [userId],
        (_, { rows }) => {
          resolve(rows._array as UserWord[]);
        },
        (_, error) => {
          console.error('Kullanıcı kelimeleri getirilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Kullanıcı profilini getir
export const getUserProfile = (userId: number): Promise<Profile> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM accounts_profile WHERE user_id = ?',
        [userId],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0] as Profile);
          } else {
            reject(new Error('Kullanıcı profili bulunamadı'));
          }
        },
        (_, error) => {
          console.error('Kullanıcı profili getirilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Kullanıcı girişi
export const loginUser = (username: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM auth_user WHERE username = ? AND password = ?',
        [username, password],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows._array[0] as User);
          } else {
            reject(new Error('Kullanıcı adı veya şifre hatalı'));
          }
        },
        (_, error) => {
          console.error('Giriş yapılırken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Quiz sonucunu kaydet
export const saveQuizResult = (
  userId: number, 
  quizId: number, 
  score: number, 
  completionTime: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const dateTaken = new Date().toISOString();
    
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO wordapp_quizresult (user_id, quiz_id, score, completion_time, date_taken) VALUES (?, ?, ?, ?, ?)',
        [userId, quizId, score, completionTime, dateTaken],
        () => {
          resolve();
        },
        (_, error) => {
          console.error('Quiz sonucu kaydedilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Kelime öğrenme durumunu güncelle
export const updateWordLearningStatus = (
  userId: number, 
  wordId: number, 
  isLearned: boolean, 
  familiarityLevel: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const lastPracticed = new Date().toISOString();
    
    db.transaction((tx) => {
      // Önce kayıt var mı kontrol et
      tx.executeSql(
        'SELECT * FROM wordapp_userword WHERE user_id = ? AND word_id = ?',
        [userId, wordId],
        (_, { rows }) => {
          if (rows.length > 0) {
            // Kayıt varsa güncelle
            // İlerleme durumunu quiz başarı durumuna göre artırıyoruz
            const existingWord = rows.item(0);
            let newFamiliarityLevel = familiarityLevel;
            
            // Eğer quizde doğru cevap verildiyse ve is_learned değişiyorsa
            // veya familiarity_level değişiyorsa
            if (isLearned && (existingWord.is_learned !== isLearned || 
                existingWord.familiarity_level !== familiarityLevel)) {
              // Familiarity level'ı maksimum 5 olmak üzere artırıyoruz
              newFamiliarityLevel = Math.min(familiarityLevel, 5);
              
              // Eğer level 4'ten büyükse, kelimeyi öğrenilmiş olarak işaretle
              const newIsLearned = newFamiliarityLevel >= 4 ? 1 : isLearned ? 1 : 0;
              
              tx.executeSql(
                'UPDATE wordapp_userword SET is_learned = ?, familiarity_level = ?, last_practiced = ? WHERE user_id = ? AND word_id = ?',
                [newIsLearned, newFamiliarityLevel, lastPracticed, userId, wordId],
                () => {
                  resolve();
                },
                (_, error) => {
                  console.error('Kelime öğrenme durumu güncellenirken hata:', error);
                  reject(error);
                  return false;
                }
              );
            } else {
              // Quiz'de yanlış cevap verildiyse veya manuel değişiklik yapılıyorsa
              tx.executeSql(
                'UPDATE wordapp_userword SET is_learned = ?, familiarity_level = ?, last_practiced = ? WHERE user_id = ? AND word_id = ?',
                [isLearned ? 1 : 0, familiarityLevel, lastPracticed, userId, wordId],
                () => {
                  resolve();
                },
                (_, error) => {
                  console.error('Kelime öğrenme durumu güncellenirken hata:', error);
                  reject(error);
                  return false;
                }
              );
            }
          } else {
            // Kayıt yoksa oluştur
            tx.executeSql(
              'INSERT INTO wordapp_userword (user_id, word_id, is_learned, familiarity_level, last_practiced) VALUES (?, ?, ?, ?, ?)',
              [userId, wordId, isLearned ? 1 : 0, familiarityLevel, lastPracticed],
              () => {
                resolve();
              },
              (_, error) => {
                console.error('Kelime öğrenme durumu oluşturulurken hata:', error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error('Kelime öğrenme durumu kontrol edilirken hata:', error);
          reject(error);
          return false;
        }
      );
    }, 
    (error) => {
      console.error('Veritabanı işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Demo verileri ekleyen fonksiyon (basitleştirilmiş)
export const addDemoData = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // Demo kullanıcı ekle
      tx.executeSql(
        'SELECT * FROM auth_user WHERE username = ?',
        ['demo'],
        (_, { rows }) => {
          if (rows.length === 0) {
            tx.executeSql(
              'INSERT INTO auth_user (id, password, username, first_name, last_name, email, is_superuser, is_staff, is_active, date_joined) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [1, 'demo123', 'demo', 'Demo', 'Kullanıcı', 'demo@example.com', 0, 0, 1, new Date().toISOString()],
              () => {
                console.log('Demo veriler eklendi');
                resolve();
              },
              (_, error) => {
                console.error('Demo veriler eklenirken hata:', error);
                reject(error);
                return false;
              }
            );
          } else {
            console.log('Demo veriler zaten mevcut');
            resolve();
          }
        },
        (_, error) => {
          console.error('Demo veri kontrolü sırasında hata:', error);
          reject(error);
          return false;
        }
      );
    },
    (error) => {
      console.error('Demo veri ekleme işlemi başlatılırken hata:', error);
      reject(error);
    });
  });
};

// Veritabanı bağlantısını başlatan fonksiyon
export const initDatabaseConnection = async (): Promise<void> => {
  try {
    await initDatabase();
    await createGameScoresTable(); // Oyun skorları tablosunu ekle
    console.log('Veritabanı bağlantısı başarıyla kuruldu');
    
    // Demo verilerin varlığını kontrol et
    const demoDataExists = await checkDemoDataExists();
    
    if (!demoDataExists) {
      console.log('Demo veriler ekleniyor...');
      await addDemoData();
    } else {
      console.log('Demo veriler zaten mevcut');
    }
  } catch (error) {
    console.error('Veritabanı başlatılırken hata:', error);
  }
};

// Oyun skorları tablosu
export const createGameScoresTable = async () => {
  try {
    const db = getDBConnection();
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS game_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          game_id TEXT NOT NULL,
          score INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES auth_user(id)
        )`,
        [],
        () => {
          console.log('game_scores tablosu oluşturuldu veya zaten var');
        },
        (_, error) => {
          console.error('game_scores tablosu oluşturulurken hata:', error);
          return false;
        }
      );
    });
  } catch (error) {
    console.error('game_scores tablosu oluşturulurken hata:', error);
  }
};

// Oyun skoru kaydetme
export const saveGameScoreToLocalDB = async (userId: number, gameId: string, score: number): Promise<boolean> => {
  try {
    if (!userId || !gameId) {
      console.error('Geçersiz kullanıcı ID veya oyun ID\'si:', { userId, gameId });
      return false;
    }
    
    const db = getDBConnection();
    
    // Önce en yüksek skoru kontrol et
    const currentHighScore = await getUserHighScore(userId, gameId);
    
    // Eğer yeni skor daha yüksekse veya hiç skor yoksa kaydet
    if (score > currentHighScore) {
      // Varolan skoru güncelle veya yeni skor ekle
      const query = `
        INSERT OR REPLACE INTO game_scores (user_id, game_id, score)
        VALUES (?, ?, ?)
      `;
      
      return new Promise<boolean>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            query,
            [userId, gameId, score],
            () => {
              console.log(`Oyun skoru kaydedildi: Kullanıcı=${userId}, Oyun=${gameId}, Skor=${score}`);
              resolve(true);
            },
            (_, error) => {
              console.error('Oyun skoru kaydedilirken hata:', error);
              resolve(false);
              return false;
            }
          );
        });
      });
    } else {
      console.log(`Skor kaydedilmedi çünkü mevcut yüksek skordan (${currentHighScore}) düşük: ${score}`);
      return false;
    }
  } catch (error) {
    console.error('Oyun skoru kaydedilirken hata:', error);
    return false;
  }
};

// Kullanıcının bir oyundaki en yüksek skorunu getir
export const getUserHighScore = async (userId: number, gameId: string): Promise<number> => {
  try {
    if (!userId || !gameId) {
      console.error('Geçersiz kullanıcı ID veya oyun ID\'si:', { userId, gameId });
      return 0;
    }
    
    const db = getDBConnection();
    const query = `
      SELECT MAX(score) as high_score
      FROM game_scores
      WHERE user_id = ? AND game_id = ?
    `;
    
    return new Promise<number>((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          [userId, gameId],
          (_, results) => {
            if (results.rows.length > 0) {
              const highScore = results.rows.item(0).high_score || 0;
              resolve(highScore);
            } else {
              resolve(0);
            }
          },
          (_, error) => {
            console.error('Yüksek skor alınırken hata:', error);
            resolve(0);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Yüksek skor alınırken hata:', error);
    return 0;
  }
};

// Bir oyunun en yüksek skorlarını getir
export const getGameHighScores = async (gameId: string, limit: number = 10): Promise<any[]> => {
  try {
    if (!gameId) {
      console.error('Geçersiz oyun ID\'si:', gameId);
      return [];
    }
    
    const db = getDBConnection();
    const query = `
      SELECT gs.*, u.username
      FROM game_scores gs
      JOIN auth_user u ON gs.user_id = u.id
      WHERE gs.game_id = ?
      ORDER BY gs.score DESC
      LIMIT ?
    `;
    
    return new Promise<any[]>((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          [gameId, limit],
          (_, results) => {
            const scores = [];
            for (let i = 0; i < results.rows.length; i++) {
              scores.push(results.rows.item(i));
            }
            resolve(scores);
          },
          (_, error) => {
            console.error('Oyun yüksek skorları alınırken hata:', error);
            resolve([]);
            return false;
          }
        );
      });
    });
  } catch (error) {
    console.error('Oyun yüksek skorları alınırken hata:', error);
    return [];
  }
};

// Demo verilerin varlığını kontrol et
export const checkDemoDataExists = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM wordapp_category',
          [],
          (_, results) => {
            const count = results.rows.item(0).count;
            resolve(count > 0);
          },
          (_, error) => {
            console.error('Demo veri kontrolü sırasında hata:', error);
            resolve(false);
            return false;
          }
        );
      },
      (error) => {
        console.error('Demo veri kontrolü transaction hatası:', error);
        resolve(false);
      }
    );
  });
};

export default {
  initDatabase,
  getCategories,
  getWordsByCategory,
  getUserWords,
  getUserProfile,
  loginUser,
  saveQuizResult,
  updateWordLearningStatus,
  addDemoData,
  initDatabaseConnection,
  createGameScoresTable,
  saveGameScoreToLocalDB,
  getUserHighScore,
  getGameHighScores,
  checkDemoDataExists
}; 