import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  ToastAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEMINI_API_KEY } from '@env';

// Mesaj tipi tanımı
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

// Öğrenme ilerlemesi için tip tanımı
interface LearningProgress {
  correctAnswers: number;
  totalAttempts: number;
  lastSessionDate: string;
  streak: number;
}

// Rate Limiting için son istek zamanını saklayacak değişken
let lastRequestTime = 0;
// İki istek arasında olması gereken minimum süre (milisaniye)
const REQUEST_THROTTLE_MS = 3000; // 3 saniye

type ChatPracticeScreenProps = StackScreenProps<RootStackParamList, 'ChatPractice'>;

const ChatPracticeScreen: React.FC<ChatPracticeScreenProps> = ({ navigation, route }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  const [practiceMode, setPracticeMode] = useState<'konuşma' | 'kelime'>('konuşma');
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B1');
  const [progress, setProgress] = useState<LearningProgress>({
    correctAnswers: 0,
    totalAttempts: 0,
    lastSessionDate: new Date().toISOString().split('T')[0],
    streak: 0
  });
  
  const flatListRef = useRef<FlatList>(null);
  const { user, profile } = useSelector((state: RootState) => state.auth);
  
  // API için endpoint ve anahtar
  // .env dosyasından API anahtarını al veya boş string kullan
  const [apiKey, setApiKey] = useState(GEMINI_API_KEY || '');
  const [modelName, setModelName] = useState('gemini-1.0-pro-vision-latest');
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  // Alternatif modeller (API hatası durumunda denenecek)
  const alternativeModels = [
    'gemini-1.0-pro-vision-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'embedding-gecko-001'
  ];
  
  // AsyncStorage'dan ilerleme bilgilerini ve ayarları yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        // Kullanıcı ayarlarını yükle
        const savedSettings = await AsyncStorage.getItem('chat_practice_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setPracticeMode(settings.mode || 'konuşma');
          setLevel(settings.level || 'B1');
          console.log("Kullanıcı ayarları yüklendi:", settings);
        }
        
        // İlerleme bilgilerini yükle
        const savedProgress = await AsyncStorage.getItem('learning_progress');
        if (savedProgress) {
          const progressData = JSON.parse(savedProgress);
          
          // Günlük streak kontrolü
          const today = new Date().toISOString().split('T')[0];
          const lastDate = progressData.lastSessionDate;
          
          let streak = progressData.streak || 0;
          
          if (lastDate === today) {
            // Bugün zaten giriş yapılmış, streak'i koru
          } else if (isYesterday(lastDate)) {
            // Dün giriş yapılmış, streak'i artır
            streak += 1;
          } else {
            // Ardışık giriş yapılmamış, streak'i sıfırla
            streak = 1;
          }
          
          setProgress({
            ...progressData,
            lastSessionDate: today,
            streak: streak
          });
          
          console.log("İlerleme bilgileri yüklendi:", progressData);
        }
        
        // API anahtarını kontrol et ve çalışan bir model bul
        if (apiKey) {
          findWorkingModel();
        } else {
          console.warn("API anahtarı bulunamadı");
        }
      } catch (error) {
        console.error("Veri yüklenemedi:", error);
      }
    };
    
    loadData();
  }, []);
  
  // Dün mü kontrolü
  const isYesterday = (dateString: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return yesterday.toISOString().split('T')[0] === dateString;
  };

  // İlk mesajı yükle
  useEffect(() => {
    // Kullanıcı adını al
    const userName = user?.first_name || user?.username || 'User';
    
    // Seviyeye göre farklı karşılama mesajları
    const welcomeMessagesByLevel = {
      'A1': `Merhaba ${userName}! Ben senin İngilizce öğrenme asistanınım. Basit İngilizce kelimeleri ve günlük konuşmaları pratik edelim. Hazır mısın? (Are you ready?)`,
      'A2': `Merhaba ${userName}! Ben senin kişisel İngilizce koçunum. Günlük konuşmalar yaparak İngilizceni geliştirmene yardım edeceğim. Bugün nasıl hissediyorsun? (How are you feeling today?)`,
      'B1': `Merhaba ${userName}! İngilizce konuşma ve kelime becerilerini geliştirmek için yanındayım. Seni daha akıcı konuşmaya teşvik edeceğim. Hangi konuda pratik yapmak istersin?`,
      'B2': `Merhaba ${userName}! İngilizce becerilerini ilerletmek için birlikte çalışacağız. Çeşitli konularda tartışarak kelime haznenizi ve akıcılığınızı geliştirebiliriz. Bugün hangi konuyu keşfetmek istersin?`,
      'C1': `Merhaba ${userName}! İleri seviye İngilizce pratiği için buradayım. Karmaşık konularda tartışarak dil becerilerini daha da geliştirebiliriz. Nüanslı ve derinlemesine konuşmalar yapmaya hazır mısın?`,
      'C2': `Merhaba ${userName}! Profesyonel seviyede İngilizce pratiği yapmak için hazırım. Akademik, edebi veya uzmanlık gerektiren konularda detaylı tartışmalar yapabiliriz. Dil zenginliğini keşfetmeye başlayalım.`
    };
    
    // Moda göre farklı başlangıç mesajları
    const modeSpecificMessage = practiceMode === 'konuşma' 
      ? 'Şu anda konuşma modundasın. Seninle sohbet ederek İngilizce pratik yapacağız. Cevaplarını değerlendirip geri bildirim vereceğim.' 
      : 'Şu anda kelime modundasın. Sana İngilizce kelimeler soracağım ve anlamlarını bilip bilmediğini kontrol edeceğim. Doğru cevaplarında o kelimeyle ilgili daha fazla bilgi sunacağım.';
    
    // Başlangıç mesajını ekle
    const initialMessage: Message = {
      id: Date.now().toString(),
      text: `${welcomeMessagesByLevel[level as keyof typeof welcomeMessagesByLevel]}\n\n${modeSpecificMessage}\n\nNot: Gemini ${modelName} modelini kullanıyorum, yapay zeka asistanı olarak size yardımcı olacağım.`,
      sender: 'ai',
      timestamp: Date.now()
    };
    
    setMessages([initialMessage]);
  }, [user, apiKey, level, practiceMode]);

  // Mesaj gönderme işlemi
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Dokunsal geri bildirim
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Kullanıcı mesajını ekle
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Kullanıcı API anahtarı girmediyse veya API'ye erişilemiyorsa
      if (!apiKey) {
        console.log("API anahtarı girilmediği için yerel yanıt kullanılıyor");
        // Yerel basit yanıt mekanizması
        setTimeout(() => {
          const localResponses = [
            "Merhaba! İngilizce pratik yapmak için bir konu seçelim mi?",
            "Bu kelimeyi bir cümlede kullanabilir misin?",
            "Harika bir cevap! Başka neler hakkında konuşmak istersin?",
            "Bu soruyu İngilizce olarak cevaplayabilir misin?",
            "Türkçe olarak da açıklayabilirim. Anlamadığın bir şey olursa söylemen yeterli.",
            "Çok iyi gidiyorsun! İngilizce konuşma pratiği için harika bir çaba."
          ];
          
          const randomResponse = localResponses[Math.floor(Math.random() * localResponses.length)];
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: randomResponse,
            sender: 'ai',
            timestamp: Date.now()
          };
          
          setMessages(prevMessages => [...prevMessages, aiResponse]);
          setIsLoading(false);
        }, 1500);
        
        return;
      }
      
      // Kullanıcının önceki mesajlarını alarak bağlam oluştur
      const conversationHistory = messages
        .slice(-6) // Son 6 mesajı al (bağlam için)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          content: msg.text
        }));
      
      // Son AI mesajını al (kullanıcının cevap verdiği soru)
      const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
      
      // Seviye açıklamaları
      const levelDescriptions = {
        'A1': 'başlangıç - temel kelimeler ve basit cümleler',
        'A2': 'temel - günlük konuşmalar ve basit ifadeler',
        'B1': 'orta - günlük konuşma ve genel konular',
        'B2': 'orta-üst - akıcı konuşma ve soyut konular',
        'C1': 'ileri - karmaşık konular ve akademik dil',
        'C2': 'profesyonel - anadil seviyesine yakın akıcılık'
      };
      
      // Kelime modu için örnek kelimeler (seviyeye göre)
      const exampleWordsByLevel = {
        'A1': ['cat', 'dog', 'house', 'book', 'friend', 'school', 'water', 'food', 'family', 'car', 'apple', 'chair', 'table', 'door', 'window', 'teacher', 'student', 'morning', 'night', 'hand'],
        'A2': ['weather', 'hobby', 'holiday', 'travel', 'restaurant', 'shopping', 'email', 'weekend', 'movie', 'music', 'famous', 'birthday', 'interesting', 'important', 'delicious', 'difficult', 'beautiful', 'exciting', 'dangerous', 'expensive'],
        'B1': ['environment', 'experience', 'technology', 'culture', 'education', 'relationship', 'opinion', 'solution', 'communication', 'achievement', 'consider', 'recommend', 'accomplish', 'participate', 'contribute', 'investigate', 'determine', 'demonstrate', 'appreciate', 'recognize'],
        'B2': ['controversy', 'perspective', 'sustainability', 'innovation', 'consequence', 'negotiation', 'implementation', 'diversity', 'assessment', 'initiative', 'enthusiasm', 'compromise', 'collaborate', 'anticipate', 'coordinate', 'differentiate', 'emphasize', 'acknowledge', 'tremendous', 'relevance'],
        'C1': ['ambiguity', 'phenomenon', 'paradigm', 'discourse', 'ideology', 'implication', 'methodology', 'hypothesis', 'synthesis', 'extrapolation', 'scrutinize', 'articulate', 'substantiate', 'pragmatic', 'convoluted', 'meticulous', 'quintessential', 'unprecedented', 'ramification', 'encompass'],
        'C2': ['nuance', 'dichotomy', 'juxtaposition', 'quintessential', 'idiosyncrasy', 'ephemeral', 'esoteric', 'ubiquitous', 'surreptitious', 'equivocal', 'serendipity', 'parsimonious', 'perfunctory', 'recalcitrant', 'obfuscate', 'pernicious', 'propensity', 'sycophant', 'cacophony', 'antediluvian']
      };
      
      // Kullanıcı cevabını değerlendirmek için ek prompt
      const evaluationPrompt = practiceMode === 'kelime' ? 
        `Kullanıcının cevabı doğru mu değerlendir. Kelimenin SADECE Türkçe anlamını sorduğunda, kullanıcı sadece Türkçe anlamını yazmışsa kabul et, cümle kurmasını ASLA isteme. Örneğin "cat" için "kedi" cevabı yeterlidir. Cevabın başında [DOĞRU] veya [YANLIŞ] etiketi kullan, ardından açıklama yap. Doğru cevaptan sonra MUTLAKA YENİ BİR KELİME sor, aynı kelime üzerinde durmaya devam etme.` :
        `Kullanıcının İngilizce cevabını değerlendir. Değerlendirmeni İNGİLİZCE olarak yap. Cevabın başında [CORRECT] veya [INCORRECT] etiketi kullan, ardından varsa hataları düzelt. Sonra konuşmaya İNGİLİZCE olarak devam et ve yeni bir soru sor. Kullanıcı konuşmayı bitirmek isterse o zaman Türkçe konuş.`;
      
      const promptText = `Sen profesyonel bir İngilizce öğretmeni ve dil arkadaşısın. Kullanıcı Türk ve İngilizce pratik yapmak istiyor.

Kullanıcının İngilizce seviyesi: ${level} (${levelDescriptions[level as keyof typeof levelDescriptions]}).
Uygulama modu: ${practiceMode}.

ÇOK ÖNEMLİ KURALLAR:

1. Eğer mod "kelime" ise:
   - İngilizce seviyeye uygun bir kelime seç. İşte ${level} seviyesi için örnek kelimeler: ${exampleWordsByLevel[level as keyof typeof exampleWordsByLevel].join(', ')}
   - Kullanıcıya kelimenin Türkçesini sor (örnek: "What is the meaning of 'cat' in Turkish?")
   - Kullanıcı sadece Türkçe anlamını yazdıysa (örn. "kedi") bu cevabı kabul et ve DOĞRU olarak değerlendir.
   - ASLA kullanıcıdan cümle kurmasını isteme, sadece kelimenin anlamını sor.
   - Doğruysa tebrik et ve HEMEN YENİ BİR KELİME sor. Aynı kelime üzerinde durmaya devam etme.
   - Yanlışsa doğru cevabı açıkla ve yeni bir kelime sor.
   - Her seferinde farklı kelimeler kullan, tekrar etme.
   - Çok kısa ve öz cevaplar ver.

2. Eğer mod "konuşma" ise:
   - Seviyeye uygun günlük bir konuşma sorusu sor (İNGİLİZCE olarak).
   - A1 için basit sorular: "What's your name?", "How are you?", "Do you like coffee?"
   - A2 için: "What did you do yesterday?", "What's your favorite food?", "Can you describe your family?"
   - B1 için: "Can you describe your hometown?", "What do you think about social media?", "Tell me about your hobbies."
   - B2 için: "What are the advantages and disadvantages of working from home?", "How has technology changed education?"
   - C1 için: "What measures should be taken to address climate change?", "How does culture influence language learning?"
   - C2 için: "What paradigm shifts have occurred in your field of expertise?", "Analyze the socioeconomic factors affecting urban development."
   - Kullanıcının verdiği İngilizce cevabı İNGİLİZCE olarak değerlendir. Değerlendirmen kısa olsun (maksimum 2 cümle).
   - Değerlendirmeden sonra konuşmaya İNGİLİZCE olarak devam et ve yeni bir soru sor.
   - KESİNLİKLE ŞART: Eğer kullanıcı sana bir soru sorarsa (örneğin "What about you?", "And you?", "What is your favorite color?", "peki ya sen?", "sen ne düşünüyorsun?", "senin favori rengin ne?"), MUTLAKA bu soruya İNGİLİZCE olarak cevap ver. Soruyu ASLA görmezden gelme.
   - Kullanıcı senin favori rengin, hayvanın, yemeğin, vb. sorduğunda kesinlikle bir cevap ver. Örneğin "My favorite color is blue." gibi.
   - Her seferinde farklı konular sor, tekrar etme.
   - Gerçek bir konuşma gibi akıcı bir diyalog kur, sadece soru soran bir robot gibi davranma.
   - Kullanıcı "konuşmayı bitir", "görüşürüz", "bye" gibi ifadeler kullanırsa, o zaman Türkçe konuşmaya geç ve vedalaş.

Genel kurallar:
- Cevapların kısa, sade ve samimi olsun (maksimum 2-3 cümle).
- Kelime modunda: Sadece kelime anlamını sor, cümle kurdurma, doğru cevaptan sonra hemen yeni kelimeye geç.
- Konuşma modunda: İngilizce soru sor, kullanıcının cevabını İngilizce değerlendir, sonra İngilizce yeni soru sor.
- Konuşma modunda kullanıcı sana soru sorarsa, KESİNLİKLE cevap ver ve diyaloğu sürdür. Özellikle "senin favori X nedir?" tarzı sorulara mutlaka cevap ver.
- Tekrar eden örnekler verme, her seferinde farklı içerik kullan.
- Kullanıcının seviyesine uygun kelimeler ve dilbilgisi yapıları kullan.
- Öğretici ol, ama akademik değil, daha çok bir dil arkadaşı gibi davran.

${evaluationPrompt}

Şimdi kullanıcının şu mesajına yanıt ver: "${inputText}"
Cevabın 50 kelimeden az olsun.`;

      // İki istek arasında minimum süre kontrol edilecek
      const currentTime = Date.now();
      const timeElapsed = currentTime - lastRequestTime;
      
      // Eğer son istekten bu yana yeterli süre geçmediyse bekleyelim
      if (timeElapsed < REQUEST_THROTTLE_MS) {
        const waitTime = REQUEST_THROTTLE_MS - timeElapsed;
        console.log(`API istek limiti için ${waitTime}ms bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Son istek zamanını güncelleyelim
      lastRequestTime = Date.now();
      
      // API'ye istek göndermeden önce gecikme ekleyelim (429 hatası için)
      const delayedApiCall = async (retryCount = 0, maxRetries = 3) => {
        try {
          // API'ye istek gönder
          const response = await fetch(`${API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptText
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              }
            })
          });
          
          console.log("API isteği gönderildi:", API_URL);
          
          if (response.status === 429 && retryCount < maxRetries) {
            // 429 hatası (Too Many Requests) - biraz bekleyip tekrar deneyelim
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`API limit aşıldı (429). ${retryDelay}ms sonra tekrar deneniyor... (${retryCount + 1}/${maxRetries})`);
            
            // Kullanıcıya bilgi verelim
            ToastAndroid.show(`API limit aşıldı. Tekrar deneniyor... (${retryCount + 1}/${maxRetries})`, ToastAndroid.SHORT);
            
            // Belirtilen süre kadar bekleyip tekrar deneyelim
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return delayedApiCall(retryCount + 1, maxRetries);
                      } else if (response.status === 404) {
              // Model bulunamadı hatası - alternatif model deneyelim
              console.error("Model bulunamadı (404). Alternatif model deneniyor...");
              switchToAlternativeModel();
              // Kullanıcıya bilgi mesajı göster
              Alert.alert(
                "Model Değişikliği",
                "Seçilen model kullanılamadı. Alternatif bir model deneniyor.",
                [{ text: "Tamam", style: "default" }]
              );
              throw new Error('Model not found');
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error("API hata yanıtı:", response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }
          
          return await response.json();
        } catch (error) {
          // Son denemeyse hatayı fırlat, değilse tekrar dene
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          console.error(`API isteği başarısız (${retryCount + 1}/${maxRetries}):`, error);
          const retryDelay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return delayedApiCall(retryCount + 1, maxRetries);
        }
      };
      
      // Yeniden deneme mekanizması ile API'yi çağıralım
      const data = await delayedApiCall();
      console.log("API yanıtı alındı");
      
      // API yanıtını işle
      let aiResponseText = "";
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        // Normal yanıt formatı
        aiResponseText = data.candidates[0].content.parts[0].text.trim();
      } else if (data.candidates && data.candidates[0]?.content?.parts) {
        // Alternatif yanıt formatı - parts bir dizi olabilir
        const parts = data.candidates[0].content.parts;
        aiResponseText = parts.map((part: any) => part.text || "").join(" ").trim();
      } else if (data.error) {
        // API hata yanıtı
        console.error("API hata mesajı:", data.error.message);
        throw new Error(data.error.message || "API error");
      } else {
        // Bilinmeyen yanıt formatı
        console.error("Beklenmeyen API yanıt formatı:", JSON.stringify(data));
        
        // Varsayılan bir yanıt oluştur
        aiResponseText = "I'm sorry, I couldn't process your message. Could you try asking something else?";
      }
      
      if (aiResponseText) {
        // Doğru/Yanlış değerlendirmesini kontrol et
        const isCorrect = aiResponseText.includes('[DOĞRU]');
        const isWrong = aiResponseText.includes('[YANLIŞ]');
        
        // İlerlemeyi güncelle
        if (isCorrect || isWrong) {
          updateProgress(isCorrect);
          
          // Etiketleri kaldır
          aiResponseText = aiResponseText
            .replace('[DOĞRU]', '')
            .replace('[YANLIŞ]', '')
            .trim();
        }
        
        // İngilizce cümle veya kelime örneklerini işaretlemek için formatla
        aiResponseText = formatEnglishSamples(aiResponseText);
        
        // AI yanıtını ekle
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          sender: 'ai',
          timestamp: Date.now()
        };
        
        setMessages(prevMessages => [...prevMessages, aiResponse]);
        
        // Otomatik olarak AI yanıtını seslendir
        handleSpeak(aiResponse.text, aiResponse.id);
      } else {
        throw new Error('Empty response from API');
      }
    } catch (error) {
      console.error('AI yanıtı alınamadı:', error);
      
      // Eğer hata model bulunamazsa veya 404 ise başka bir model deneyelim
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Model not found'))) {
        const newModel = switchToAlternativeModel();
        Alert.alert(
          'Model Hatası',
          `Seçilen model (${modelName}) kullanılamadı. Şimdi "${newModel}" modeli deneniyor. Lütfen tekrar mesaj gönderin.`,
          [{ text: "Tamam", style: "default" }]
        );
      } else {
        Alert.alert(
          'Hata',
          'Yapay zeka yanıtı alınamadı. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Metni sesli okuma
  const handleSpeak = (text: string, messageId: string) => {
    try {
      // Eğer şu anda konuşuyorsa durdur
      if (isSpeaking) {
        Speech.stop();
        // Eğer aynı mesaj ise sadece durdur ve çık
        if (currentSpeakingId === messageId) {
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
          return;
        }
      }
      
      // Konuşma başladı olarak işaretle
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
      
      // İngilizce kelimeleri veya cümleleri ayır
      const textToSpeak = prepareTextForSpeech(text);
      
      // Metni seslendir
      Speech.speak(textToSpeak, { 
        language: 'en-US',
        pitch: 1.0,
        rate: 0.85, // Biraz daha yavaş konuşsun
        onStart: () => {
          console.log('Konuşma başladı');
          setIsSpeaking(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onDone: () => {
          console.log('Konuşma tamamlandı');
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
        },
        onStopped: () => {
          console.log('Konuşma durduruldu');
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
        },
        onError: (error) => {
          console.error('Telaffuz hatası:', error);
          setIsSpeaking(false);
          setCurrentSpeakingId(null);
          Alert.alert("Hata", "Sesli telaffuz sırasında bir hata oluştu.");
        }
      });
    } catch (error) {
      console.error('Telaffuz işlemi başlatılamadı:', error);
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      Alert.alert("Hata", "Telaffuz özelliği kullanılamıyor.");
    }
  };
  
  // Metni konuşma için hazırla (Türkçe açıklamaları çıkar)
  const prepareTextForSpeech = (text: string): string => {
    // Türkçe ve İngilizce açıklamaları ayır
    // Genellikle İngilizce cümleler veya kelimeler tırnak içinde veya parantez içinde olur
    
    // İngilizce kelime/cümle bulma kalıpları
    const patterns = [
      /"([^"]+)"/g,          // Çift tırnak içindeki metinler
      /'([^']+)'/g,          // Tek tırnak içindeki metinler
      /\(([^)]+)\)/g,        // Parantez içindeki metinler
      /example: ([^.!?]+)/ig // "example:" sonrası metinler
    ];
    
    // İngilizce içeriği çıkar
    let englishContent = '';
    let match;
    
    for (const pattern of patterns) {
      while ((match = pattern.exec(text)) !== null) {
        if (match[1].trim().length > 0) {
          englishContent += match[1] + '. ';
        }
      }
    }
    
    // Eğer kalıplarla bir şey bulunamadıysa, metni olduğu gibi kullan
    // ama muhtemelen karma bir metin olduğu için olumsuz etkileri olacaktır
    if (englishContent.trim().length === 0) {
      return text;
    }
    
    return englishContent;
  };

  // İlerleme bilgilerini güncelle ve kaydet
  const updateProgress = async (isCorrect: boolean) => {
    try {
      const newProgress = {
        ...progress,
        correctAnswers: isCorrect ? progress.correctAnswers + 1 : progress.correctAnswers,
        totalAttempts: progress.totalAttempts + 1
      };
      
      setProgress(newProgress);
      await AsyncStorage.setItem('learning_progress', JSON.stringify(newProgress));
      
      // Doğru cevap için kullanıcıya geri bildirim
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Harika! Doğru cevap!', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error("İlerleme kaydedilemedi:", error);
    }
  };

  // İpucu iste
  const requestHint = async () => {
    if (!apiKey) {
      Alert.alert("Hata", "İpucu için API anahtarı gerekli. Lütfen ayarlardan API anahtarını ekleyin.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Son AI mesajını al
      const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
      
      if (!lastAiMessage) {
        throw new Error("İpucu istenecek bir soru bulunamadı");
      }
      
      const hintPrompt = `Son sorduğum soru şu: "${lastAiMessage.text}"
                  
Bu soru için kullanıcıya yardımcı olacak kısa bir ipucu ver. İpucu 1-2 cümle olsun ve çok fazla bilgi vermesin, sadece yönlendirici olsun. Cevabı direkt söyleme.

İpucu şöyle başlamalı: "İpucu: "`;
      
      // API'ye istek gönder
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: hintPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      let hintText = "";
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        hintText = data.candidates[0].content.parts[0].text.trim();
      }
      
      if (hintText) {
        setCurrentHint(hintText);
        setShowHintModal(true);
      } else {
        throw new Error('Empty hint response');
      }
    } catch (error) {
      console.error('İpucu alınamadı:', error);
      Alert.alert('Hata', 'İpucu alınamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mod ve seviye ayarlarını kaydet
  const savePracticeSettings = async () => {
    try {
      const settings = {
        mode: practiceMode,
        level: level
      };
      
      await AsyncStorage.setItem('chat_practice_settings', JSON.stringify(settings));
      setShowSettingsModal(false);
      
      // Yeni ayarlarla ilgili bilgilendirme mesajı gönder
      const settingsMessage: Message = {
        id: Date.now().toString(),
        text: `Ayarlar güncellendi:\nMod: ${practiceMode}\nSeviye: ${level}`,
        sender: 'ai',
        timestamp: Date.now()
      };
      
      setMessages(prevMessages => [...prevMessages, settingsMessage]);
    } catch (error) {
      console.error("Ayarlar kaydedilemedi:", error);
      Alert.alert("Hata", "Ayarlar kaydedilemedi");
    }
  };

  // Mesaj öğesini render et
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isAI = item.sender === 'ai';
    
    return (
      <View style={[
        styles.messageContainer,
        isAI ? styles.aiMessageContainer : styles.userMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isAI ? styles.aiMessageBubble : styles.userMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isAI ? styles.aiMessageText : styles.userMessageText
          ]}>
            {item.text}
          </Text>
          
          {isAI && (
            <TouchableOpacity 
              style={[
                styles.speakButton,
                currentSpeakingId === item.id && styles.speakButtonActive
              ]}
              onPress={() => handleSpeak(item.text, item.id)}
            >
              <Ionicons 
                name={currentSpeakingId === item.id ? "volume-high" : "volume-medium"} 
                size={20} 
                color={currentSpeakingId === item.id ? COLORS.primary : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      </View>
    );
  };

  // Liste güncellendikçe en alta kaydır
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // API Durumunu kontrol et ve kullanıcıya göster
  const showApiStatus = () => {
    if (!apiKey) {
      console.warn("API anahtarı bulunamadı");
      Alert.alert(
        "API Anahtarı Eksik",
        "Gemini API anahtarı bulunamadı. Lütfen .env dosyasında GEMINI_API_KEY değişkenini kontrol edin.",
        [{ text: "Tamam", style: "default" }]
      );
    } else {
      console.log("API anahtarı bulundu:", apiKey.substring(0, 5) + "...");
      console.log("Kullanılan API endpoint:", API_URL);
      
      Alert.alert(
        "API Durumu",
        `API anahtarı: ${apiKey.substring(0, 5)}...\nKullanılan model: ${modelName}\nAPI URL: ${API_URL}`,
        [
          { text: "Model Değiştir", onPress: switchToAlternativeModel },
          { text: "Tamam", style: "default" }
        ]
      );
    }
  };
  
  // Kullanılabilir modelleri listele
  const listAvailableModels = async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          console.log("Kullanılabilir modeller (v1beta):");
          let foundSuitableModel = false;
          
          data.models.forEach((model: any) => {
            console.log(`- ${model.name} (${model.displayName || 'No display name'})`);
            
            // generateContent desteği olan bir Gemini 1.5 modeli bulalım
            if (model.name.includes('gemini-1.5') && 
                model.supportedGenerationMethods?.includes('generateContent') &&
                !foundSuitableModel) {
              foundSuitableModel = true;
              const newModelName = model.name.replace('models/', '');
              setModelName(newModelName);
              console.log(`Kullanılacak model otomatik olarak ayarlandı: ${newModelName}`);
              console.log(`Yeni API_URL: https://generativelanguage.googleapis.com/v1beta/models/${newModelName}:generateContent`);
            }
          });
        } else {
          console.log("Kullanılabilir model bulunamadı");
        }
      } else {
        const errorText = await response.text();
        console.error("Model listesi alınamadı:", response.status, errorText);
      }
    } catch (error) {
      console.error("Model listesi hatası:", error);
    }
  };
  
  // API bağlantısını test et
  const testApiConnection = async () => {
    try {
      // Basit bir test isteği
      const testResponse = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Hello"
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256
          }
        })
      });
      
      if (testResponse.ok) {
        console.log("API bağlantı testi başarılı!");
        const data = await testResponse.json();
        console.log("Test yanıtı:", data.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        const errorText = await testResponse.text();
        console.error("API bağlantı testi başarısız:", testResponse.status, errorText);
      }
    } catch (error) {
      console.error("API bağlantı testi hatası:", error);
    }
  };

  // Alternatif bir model seçer
  const switchToAlternativeModel = () => {
    const currentIndex = alternativeModels.indexOf(modelName);
    const nextIndex = (currentIndex + 1) % alternativeModels.length;
    const newModel = alternativeModels[nextIndex];
    
    console.log(`Model değiştiriliyor: ${modelName} -> ${newModel}`);
    setModelName(newModel);
    
    // Bilgi mesajı göster
    ToastAndroid.show(`Alternatif model deneniyor: ${newModel}`, ToastAndroid.SHORT);
    
    return newModel;
  };

  // Çalışan bir model bulma fonksiyonu
  const findWorkingModel = async () => {
    console.log("Çalışan model aranıyor...");
    
    try {
      // Önce modelleri listele
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        console.error("Model listesi alınamadı:", response.status);
        return;
      }
      
      const data = await response.json();
      
      if (!data.models || data.models.length === 0) {
        console.log("Kullanılabilir model bulunamadı");
        return;
      }
      
      console.log("Model listesi alındı, çalışan bir model aranıyor...");
      
      // Çalışabilen bir model bulmak için alternatifler arasında gezinme
      for (const model of alternativeModels) {
        // Bu model listede var mı kontrol et
        const foundModel = data.models.find((m: any) => 
          m.name === `models/${model}` && 
          m.supportedGenerationMethods?.includes('generateContent')
        );
        
        if (foundModel) {
          console.log(`Çalışabilir model bulundu: ${model}`);
          setModelName(model);
          
          // Basit bir test isteği yap
          const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const testResponse = await fetch(testUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Hello, are you working?"
                    }
                  ]
                }
              ]
            })
          });
          
          if (testResponse.ok) {
            console.log(`Model ${model} çalışıyor!`);
            ToastAndroid.show(`Model ${model} aktif edildi`, ToastAndroid.SHORT);
            return;
          } else {
            console.log(`Model ${model} çalışmıyor, hata: ${testResponse.status}`);
          }
        }
      }
      
      // Hiçbir model çalışmadıysa kullanıcıyı bilgilendir
      console.warn("Çalışan bir model bulunamadı!");
      Alert.alert(
        "Model Hatası",
        "Çalışan bir yapay zeka modeli bulunamadı. Lütfen daha sonra tekrar deneyin.",
        [{ text: "Tamam", style: "default" }]
      );
      
    } catch (error) {
      console.error("Model arama hatası:", error);
    }
  };

  // İngilizce cümle veya kelime örneklerini formatlama
  const formatEnglishSamples = (text: string): string => {
    // İngilizce örnekleri tırnak içine alarak vurgulama
    let formattedText = text;
    
    // Örnek tanıma desenleri
    const patterns = [
      {regex: /Example:?\s+([^.!?]+[.!?])/gi, replacement: 'Example: "$1"'},
      {regex: /For example:?\s+([^.!?]+[.!?])/gi, replacement: 'For example: "$1"'},
      {regex: /For instance:?\s+([^.!?]+[.!?])/gi, replacement: 'For instance: "$1"'},
      {regex: /Pronunciation:?\s+([^.!?]+)/gi, replacement: 'Pronunciation: *$1*'},
      {regex: /Etymology:?\s+([^.!?]+)/gi, replacement: 'Etymology: *$1*'}
    ];
    
    // Desenleri uygula
    patterns.forEach(pattern => {
      formattedText = formattedText.replace(pattern.regex, pattern.replacement);
    });
    
    return formattedText;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İngilizce Pratik</Text>
                  <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.apiStatusButton}
            onPress={showApiStatus}
          >
            <Ionicons name="cloud-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="options-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        </View>
        
        {/* İlerleme bilgisi */}
        <View style={styles.progressContainer}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Doğru</Text>
            <Text style={styles.progressValue}>{progress.correctAnswers}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Toplam</Text>
            <Text style={styles.progressValue}>{progress.totalAttempts}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Seri</Text>
            <Text style={styles.progressValue}>{progress.streak} gün</Text>
          </View>
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={requestHint}
            disabled={isLoading}
          >
            <Ionicons name="bulb-outline" size={20} color={COLORS.text} />
            <Text style={styles.hintButtonText}>İpucu</Text>
          </TouchableOpacity>
        </View>
        
        {/* Mesaj listesi */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
        />
        
        {/* Yükleniyor göstergesi */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
        
        {/* Mesaj giriş alanı */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={inputText.trim() ? "#fff" : "rgba(255,255,255,0.5)"} 
            />
          </TouchableOpacity>
        </KeyboardAvoidingView>
        
        {/* İpucu Modal */}
        <Modal
          visible={showHintModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowHintModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>İpucu</Text>
              <Text style={styles.hintText}>{currentHint}</Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowHintModal(false)}
              >
                <Text style={styles.closeButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {/* Pratik Ayarları Modal */}
        <Modal
          visible={showSettingsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Pratik Ayarları</Text>
              
              <Text style={styles.settingsLabel}>Mod:</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[
                    styles.modeButton, 
                    practiceMode === 'konuşma' && styles.activeButton
                  ]}
                  onPress={() => setPracticeMode('konuşma')}
                >
                  <Text style={[
                    styles.modeButtonText,
                    practiceMode === 'konuşma' && styles.activeButtonText
                  ]}>Konuşma</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.modeButton, 
                    practiceMode === 'kelime' && styles.activeButton
                  ]}
                  onPress={() => setPracticeMode('kelime')}
                >
                  <Text style={[
                    styles.modeButtonText,
                    practiceMode === 'kelime' && styles.activeButtonText
                  ]}>Kelime</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.settingsLabel}>Seviye:</Text>
              <View style={styles.buttonRow}>
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => (
                  <TouchableOpacity 
                    key={lvl}
                    style={[
                      styles.levelButton, 
                      level === lvl && styles.activeButton
                    ]}
                    onPress={() => setLevel(lvl)}
                  >
                    <Text style={[
                      styles.levelButtonText,
                      level === lvl && styles.activeButtonText
                    ]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowSettingsModal(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={savePracticeSettings}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  messagesList: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  messageContainer: {
    marginBottom: SPACING.m,
    maxWidth: '80%',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: SIZES.base,
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  aiMessageBubble: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 0,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 0,
  },
  messageText: {
    fontSize: SIZES.medium,
  },
  aiMessageText: {
    color: COLORS.text,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.m,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    paddingHorizontal: SPACING.m,
    maxHeight: 100,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
    ...SHADOWS.small,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.s,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: SIZES.base,
    alignSelf: 'flex-start',
    marginLeft: SPACING.m,
    marginBottom: SPACING.s,
  },
  loadingText: {
    marginLeft: SPACING.xs,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  speakButton: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: COLORS.background,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  speakButtonActive: {
    backgroundColor: 'rgba(0,120,255,0.1)',
  },
  settingsButton: {
    padding: SPACING.xs,
  },
  apiStatusButton: {
    padding: SPACING.xs,
    marginRight: SPACING.s,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  modalDescription: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    marginBottom: SPACING.m,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.textLight,
    padding: SPACING.m,
    borderRadius: SIZES.base,
  },
  cancelButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
  },
  saveButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsLabel: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeButton: {
    backgroundColor: COLORS.background,
    padding: SPACING.s,
    borderRadius: SIZES.base,
  },
  activeButton: {
    backgroundColor: 'rgba(0,120,255,0.1)',
  },
  modeButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  activeButtonText: {
    color: COLORS.primary,
  },
  levelButton: {
    backgroundColor: COLORS.background,
    padding: SPACING.s,
    borderRadius: SIZES.base,
  },
  levelButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  progressValue: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,120,255,0.1)',
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.base,
  },
  hintButtonText: {
    marginLeft: 4,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  hintText: {
    fontSize: SIZES.medium,
    color: COLORS.text,
    marginVertical: SPACING.m,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    alignSelf: 'center',
    marginTop: SPACING.m,
  },
  closeButtonText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ChatPracticeScreen; 