import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  TextInput 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

// Мапа всіх типів погоди з OpenWeatherMap API і їх українських перекладів
const WEATHER_TRANSLATIONS: Record<number, string> = {
  // Thunderstorm group (200-232)
  200: "гроза з легким дощем",
  201: "гроза з дощем", 
  202: "гроза з сильним дощем",
  210: "легка гроза",
  211: "гроза",
  212: "сильна гроза", 
  221: "рвана гроза",
  230: "гроза з легкою мороссю",
  231: "гроза з мороссю",
  232: "гроза з сильною мороссю",

  // Drizzle group (300-321) 
  300: "легка морось",
  301: "морось",
  302: "сильна морось",
  310: "легкий дощ з мороссю",
  311: "дощ з мороссю", 
  312: "сильний дощ з мороссю",
  313: "зливовий дощ з мороссю",
  314: "сильний зливовий дощ з мороссю",
  321: "зливова морось",

  // Rain group (500-531)
  500: "легкий дощ",
  501: "помірний дощ",
  502: "сильний дощ",
  503: "дуже сильний дощ", 
  504: "екстремальний дощ",
  511: "дощ що замерзає",
  520: "легкий зливовий дощ",
  521: "зливовий дощ",
  522: "сильний зливовий дощ", 
  531: "рваний зливовий дощ",

  // Snow group (600-622)
  600: "легкий сніг",
  601: "сніг", 
  602: "сильний сніг",
  611: "мокрий сніг",
  612: "легкий мокрий сніг",
  613: "мокрий сніг",
  615: "легкий дощ зі снігом",
  616: "дощ зі снігом",
  620: "легкий снігопад",
  621: "снігопад",
  622: "сильний снігопад",

  // Atmosphere group (701-781) 
  701: "туман",
  711: "дим",
  721: "легка імла",
  731: "піщані/пилові вихори",
  741: "туман",
  751: "пісок", 
  761: "пил",
  762: "вулканічний попіл",
  771: "шквал",
  781: "торнадо",

  // Clear group (800)
  800: "ясне небо",

  // Clouds group (801-804)
  801: "кілька хмар",
  802: "рвані хмари", 
  803: "хмарно",
  804: "похмуро"
};
// Групи схожих типів погоди
const WEATHER_GROUPS = {
  // Грози (всі грози схожі між собою)
  thunderstorm: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232],
  
  // Легкі опади (морось + легкий дощ)
  light_precipitation: [300, 301, 310, 311, 321, 500, 520],
  
  // Помірні опади (помірна морось + помірний дощ)
  moderate_precipitation: [302, 312, 501, 521, 531],
  
  // Сильні опади (важка морось + сильний дощ)
  heavy_precipitation: [313, 314, 502, 522],
  
  // Екстремальні опади
  extreme_precipitation: [503, 504],
  
  // Дощ що замерзає (окремо)
  freezing_rain: [511],
  
  // Легкий сніг
  light_snow: [600, 612, 615, 620],
  
  // Помірний/сильний сніг
  moderate_heavy_snow: [601, 602, 613, 616, 621, 622],
  
  // Мокрий сніг (окремо)
  sleet: [611],
  
  // Туман та імла
  fog_mist: [701, 721, 741],
  
  // Дим та забруднення
  smoke_haze: [711, 751, 761],
  
  // Пилові явища
  dust_sand: [731, 762],
  
  // Екстремальні явища
  extreme_weather: [771, 781],
  
  // Ясні умови (ясно + кілька хмар)
  clear_conditions: [800, 801],
  
  // Помірно хмарні умови (рвані хмари + хмарно)
  partly_cloudy: [802, 803],
  
  // Похмуро (суцільна хмарність)
  overcast: [804]
};

// Функція для отримання схожих типів погоди
function getSimilarWeatherTypes(currentWeatherType: string): string[] {
  const lowerWeatherType = currentWeatherType.toLowerCase();
  
  // Спочатку намагаємося знайти точний збіг у групах
  for (const [groupName, codes] of Object.entries(WEATHER_GROUPS)) {
    if (codes.some(code => WEATHER_TRANSLATIONS[code] === currentWeatherType)) {
      // Знайшли групу, повертаємо всі типи з цієї групи
      const similarTypes = codes.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Знайдено точний збіг для "${currentWeatherType}" в групі "${groupName}":`, similarTypes);
      return similarTypes;
    }
  }
  
  // Якщо точного збігу немає, використовуємо розширену логіку за ключовими словами
  
  // Грози - всі види грози схожі
  if (lowerWeatherType.includes('гроз')) {
    const thunderstormTypes = WEATHER_GROUPS.thunderstorm.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
    console.log(`Розпізнано грозу для "${currentWeatherType}":`, thunderstormTypes);
    return thunderstormTypes;
  }
  
  // Дощ - групуємо за інтенсивністю, але з перекриттям
  if (lowerWeatherType.includes('дощ') || lowerWeatherType.includes('морос')) {
    if (lowerWeatherType.includes('легк') || lowerWeatherType.includes('слаб')) {
      // Легкий дощ + морось
      const lightRain = [...WEATHER_GROUPS.light_precipitation, ...WEATHER_GROUPS.moderate_precipitation.slice(0, 2)]
        .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано легкий дощ для "${currentWeatherType}":`, lightRain);
      return lightRain;
    } else if (lowerWeatherType.includes('сильн') || lowerWeatherType.includes('важк')) {
      // Сильний дощ + екстремальний
      const heavyRain = [...WEATHER_GROUPS.heavy_precipitation, ...WEATHER_GROUPS.extreme_precipitation]
        .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано сильний дощ для "${currentWeatherType}":`, heavyRain);
      return heavyRain;
    } else if (lowerWeatherType.includes('екстремальн') || lowerWeatherType.includes('дуже')) {
      const extremeRain = WEATHER_GROUPS.extreme_precipitation.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано екстремальний дощ для "${currentWeatherType}":`, extremeRain);
      return extremeRain;
    } else if (lowerWeatherType.includes('замерз')) {
      const freezingRain = WEATHER_GROUPS.freezing_rain.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано дощ що замерзає для "${currentWeatherType}":`, freezingRain);
      return freezingRain;
    } else {
      // Помірний дощ + легкий та важкий (розширений діапазон)
      const moderateRain = [...WEATHER_GROUPS.light_precipitation.slice(-2), ...WEATHER_GROUPS.moderate_precipitation, ...WEATHER_GROUPS.heavy_precipitation.slice(0, 1)]
        .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано помірний дощ для "${currentWeatherType}":`, moderateRain);
      return moderateRain;
    }
  }
  
  // Сніг - групуємо за інтенсивністю
  if (lowerWeatherType.includes('сніг') || lowerWeatherType.includes('снігопад')) {
    if (lowerWeatherType.includes('мокр')) {
      const sleet = WEATHER_GROUPS.sleet.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано мокрий сніг для "${currentWeatherType}":`, sleet);
      return sleet;
    } else if (lowerWeatherType.includes('легк')) {
      const lightSnow = [...WEATHER_GROUPS.light_snow, ...WEATHER_GROUPS.moderate_heavy_snow.slice(0, 1)]
        .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано легкий сніг для "${currentWeatherType}":`, lightSnow);
      return lightSnow;
    } else if (lowerWeatherType.includes('сильн')) {
      const heavySnow = WEATHER_GROUPS.moderate_heavy_snow.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано сильний сніг для "${currentWeatherType}":`, heavySnow);
      return heavySnow;
    } else {
      // Всі види снігу (крім мокрого)
      const allSnow = [...WEATHER_GROUPS.light_snow, ...WEATHER_GROUPS.moderate_heavy_snow]
        .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано сніг для "${currentWeatherType}":`, allSnow);
      return allSnow;
    }
  }
  
  // Хмари - ПОКРАЩЕНА ЛОГІКА
  if (lowerWeatherType.includes('хмар') || lowerWeatherType.includes('ясн') || lowerWeatherType.includes('сонячн')) {
    if (lowerWeatherType.includes('ясн') || lowerWeatherType.includes('сонячн') || 
        lowerWeatherType.includes('кільк') || lowerWeatherType.includes('мало')) {
      // Ясні умови включають ясне небо та кілька хмар
      const clearConditions = WEATHER_GROUPS.clear_conditions.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано ясні умови для "${currentWeatherType}":`, clearConditions);
      return clearConditions;
    } else if (lowerWeatherType.includes('похмур') || lowerWeatherType.includes('суцільн')) {
      // Похмуро окремо
      const overcast = WEATHER_GROUPS.overcast.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано похмуро для "${currentWeatherType}":`, overcast);
      return overcast;
    } else {
      // Помірно хмарні умови (рвані хмари + хмарно + трохи ясних та похмурих)
      const partlyCloudy = [
        ...WEATHER_GROUPS.clear_conditions.slice(-1), // кілька хмар
        ...WEATHER_GROUPS.partly_cloudy,              // рвані хмари + хмарно
        ...WEATHER_GROUPS.overcast.slice(0, 1)        // початок похмуро
      ].map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
      console.log(`Розпізнано хмарні умови для "${currentWeatherType}":`, partlyCloudy);
      return partlyCloudy;
    }
  }
  
  // Туман та імла
  if (lowerWeatherType.includes('туман') || lowerWeatherType.includes('імла')) {
    const fogMist = WEATHER_GROUPS.fog_mist.map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
    console.log(`Розпізнано туман/імлу для "${currentWeatherType}":`, fogMist);
    return fogMist;
  }
  
  // Дим та забруднення
  if (lowerWeatherType.includes('дим') || lowerWeatherType.includes('пил')) {
    const smokeHaze = [...WEATHER_GROUPS.smoke_haze, ...WEATHER_GROUPS.dust_sand]
      .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
    console.log(`Розпізнано дим/пил для "${currentWeatherType}":`, smokeHaze);
    return smokeHaze;
  }
  
  // Екстремальні явища
  if (lowerWeatherType.includes('торнадо') || lowerWeatherType.includes('шквал') || 
      lowerWeatherType.includes('вулкан') || lowerWeatherType.includes('вихор')) {
    const extreme = [...WEATHER_GROUPS.extreme_weather, ...WEATHER_GROUPS.dust_sand.slice(0, 1)]
      .map(code => WEATHER_TRANSLATIONS[code]).filter(Boolean);
    console.log(`Розпізнано екстремальні явища для "${currentWeatherType}":`, extreme);
    return extreme;
  }
  
  // Якщо не знайдено схожих типів, повертаємо тільки поточний тип
  console.log(`Не знайдено схожих типів для "${currentWeatherType}", повертаємо тільки поточний`);
  return [currentWeatherType];
}

// 3. Виправляємо інтерфейс RawOutfitData
interface RawOutfitData {
  id: any;
  date: any;
  user_id: any; // ДОДАЄМО це поле
  profiles: {
    username: any;
    avatar_url: any;
  };
  weather: {
    weather_type: any;
    min_tempurature: any;
    max_tempurature: any;
    weather_icon: any;
    date: any;
    city: any;
  };
  outfit_item: {
    wardrobe: {
      id: any;
      photo_url: any;
      category: any;
      subcategory: any;
    };
  }[];
}

// 4. Виправляємо функції з перевіркою на null
const fetchFilteredPosts = async (
  currentSession: Session | null, 
  userTemp: number, 
  userWeatherType: string
) => {
  try {
    setLoading(true);
    
    const tempTolerance = 3;
    const minTemp = userTemp - tempTolerance;
    const maxTemp = userTemp + tempTolerance;
    
    const similarWeatherTypes = getSimilarWeatherTypes(userWeatherType);
    console.log('Поточний тип погоди:', userWeatherType);
    console.log('Схожі типи погоди для пошуку:', similarWeatherTypes);
    console.log('Температурний діапазон:', minTemp, '-', maxTemp);
    
    let query = supabase
      .from('posts')
      .select(`
        id,
        created_at,
        outfits!inner (
          id,
          date,
          user_id,
          profiles!inner (
            username,
            avatar_url
          ),
          weather!inner (
            weather_type,
            min_tempurature,
            max_tempurature,
            weather_icon,
            date,
            city
          ),
          outfit_item (
            wardrobe (
              id,
              photo_url,
              category,
              subcategory
            )
          )
        )
      `)
      .lte('outfits.weather.min_tempurature', maxTemp)
      .gte('outfits.weather.max_tempurature', minTemp)
      .in('outfits.weather.weather_type', similarWeatherTypes);

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching filtered posts:', error);
      fetchAllPosts(currentSession);
      return;
    }

    console.log(`Знайдено ${data?.length || 0} постів зі схожою погодою і температурою`);
    // ДОДАЄМО перевірку на null
    await processPosts(data || [], currentSession, true);
  } catch (error) {
    console.error('Error in fetchFilteredPosts:', error);
    fetchAllPosts(currentSession);
  }
};

const fetchAllPosts = async (currentSession: Session | null) => {
  try {
    setLoading(true);
    
    let query = supabase
      .from('posts')
      .select(`
        id,
        created_at,
        outfits!inner (
          id,
          date,
          user_id,
          profiles!inner (
            username,
            avatar_url
          ),
          weather!inner (
            weather_type,
            min_tempurature,
            max_tempurature,
            weather_icon,
            date,
            city
          ),
          outfit_item (
            wardrobe (
              id,
              photo_url,
              category,
              subcategory
            )
          )
        )
      `);

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Помилка', 'Не вдалося завантажити пости');
      return;
    }

    // ДОДАЄМО перевірку на null
    await processPosts(data || [], currentSession, false);
  } catch (error) {
    console.error('Error:', error);
    Alert.alert('Помилка', 'Щось пішло не так');
  }
};
// Інтерфейси для типізації
interface OutfitItem {
  item_id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
  image?: string;
}

interface Post {
  post_id: number;
  post_created_at: string;
  username: string;
  avatar_url: string | null;
  weather_type: string;
  min_tempurature: number;
  max_tempurature: number;
  weather_icon: string | null;
  weather_date: string;
  city: string;
  outfit_items: OutfitItem[];
  likes_count: number;
  saves_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
  popularity_score: number;
}

interface CurrentWeatherData {
  temp: number;
  weather_type: string;
}

interface UserSuggestion {
  username: string;
  avatar_url: string | null;
  posts_count: number;
}

interface WardrobeItem {
  id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
}

interface OutfitItemData {
  wardrobe: WardrobeItem;
}

interface WeatherData {
  weather_type: string;
  min_tempurature: number;
  max_tempurature: number;
  weather_icon: string | null;
  date: string;
  city: string;
}

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

interface RawOutfitData {
  id: any;
  date: any;
  profiles: {
    username: any;
    avatar_url: any;
  };
  weather: {
    weather_type: any;
    min_tempurature: any;
    max_tempurature: any;
    weather_icon: any;
    date: any;
    city: any;
  };
  outfit_item: {
    wardrobe: {
      id: any;
      photo_url: any;
      category: any;
      subcategory: any;
    };
  }[];
}

interface RawPostData {
  id: any;
  created_at: any;
  outfits: RawOutfitData;
  _count?: {
    likes: number;
    saved_posts: number;
    comments: number;
  };
}

type TabType = 'all' | 'following';

// Ключі для AsyncStorage
const STORAGE_KEYS = {
  WEATHER_FILTER_DISABLED: '@allposts_weather_filter_disabled',
  ACTIVE_TAB: '@allposts_active_tab'
};

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const AllPosts: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [weatherFilterDisabled, setWeatherFilterDisabled] = useState(false);

  // Завантаження збережених налаштувань
  const loadSavedSettings = async () => {
    try {
      const [savedWeatherFilterDisabled, savedActiveTab] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WEATHER_FILTER_DISABLED),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)
      ]);

      if (savedWeatherFilterDisabled !== null) {
        setWeatherFilterDisabled(JSON.parse(savedWeatherFilterDisabled));
      }

      if (savedActiveTab !== null) {
        setActiveTab(savedActiveTab as TabType);
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  };

  // Збереження налаштувань фільтра
  const saveWeatherFilterSetting = async (disabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_FILTER_DISABLED, JSON.stringify(disabled));
    } catch (error) {
      console.error('Error saving weather filter setting:', error);
    }
  };

  // Збереження активної вкладки
  const saveActiveTabSetting = async (tab: TabType) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch (error) {
      console.error('Error saving active tab setting:', error);
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      await loadSavedSettings();
      
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchFollowingUsers(session.user.id);
        }
        getCurrentWeatherAndFetchPosts(session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
          if (session) {
            fetchFollowingUsers(session.user.id);
          }
          getCurrentWeatherAndFetchPosts(session);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeComponent();
  }, []);

  // Отримання списку користувачів, на яких підписаний поточний користувач
  const fetchFollowingUsers = async (currentUserId: string) => {
    try {
      const { data: followingData, error } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (error) {
        console.error('Error fetching following users:', error);
        return;
      }

      const userIds = followingData?.map(item => item.following_id) || [];
      setFollowingUserIds(userIds);
    } catch (error) {
      console.error('Error in fetchFollowingUsers:', error);
    }
  };

  // Фільтрація постів по пошуковому запиту та активній вкладці
  const filteredPosts = useMemo(() => {
    let currentPosts = activeTab === 'following' ? followingPosts : posts;
    
    if (!searchQuery.trim()) {
      return currentPosts;
    }
    
    return allPosts.filter(post => 
      post.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, followingPosts, allPosts, searchQuery, activeTab]);

  // Пошук користувачів для автокомпліту
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUserSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setSearchLoading(true);
        
        const { data: users, error } = await supabase
          .from('profiles')
          .select(`
            username,
            avatar_url,
            outfits(count)
          `)
          .ilike('username', `%${searchQuery}%`)
          .limit(5);

        if (error) {
          console.error('Error searching users:', error);
          return;
        }

        if (users) {
          const userSuggestions: UserSuggestion[] = await Promise.all(
            users
              .filter(user => user.outfits && user.outfits.length > 0)
              .map(async (user: any) => {
                let avatarUrl = user.avatar_url;
                if (avatarUrl && !avatarUrl.startsWith('http')) {
                  const { data: avatarData } = await supabase.storage
                    .from('avatars')
                    .getPublicUrl(avatarUrl);
                  
                  if (avatarData) {
                    avatarUrl = avatarData.publicUrl;
                  }
                }

                return {
                  username: user.username,
                  avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
                  posts_count: user.outfits?.[0]?.count || 0
                };
              })
          );

          setUserSuggestions(userSuggestions);
          setShowSuggestions(userSuggestions.length > 0);
        }
      } catch (error) {
        console.error('Error in user search:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const getCurrentWeatherAndFetchPosts = async (currentSession: Session | null) => {
    try {
      // Якщо фільтрація вимкнена, одразу завантажуємо всі пости
      if (weatherFilterDisabled) {
        fetchAllPosts(currentSession);
        return;
      }

      const { data: userWeather, error: weatherError } = await supabase
        .from('weather')
        .select('weather_type, min_tempurature, max_tempurature')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (weatherError) {
        fetchAllPosts(currentSession);
        return;
      }

      if (userWeather) {
        const avgTemp = (userWeather.min_tempurature + userWeather.max_tempurature) / 2;
        setCurrentWeather({
          temp: avgTemp,
          weather_type: userWeather.weather_type
        });
        fetchFilteredPosts(currentSession, avgTemp, userWeather.weather_type);
      } else {
        fetchAllPosts(currentSession);
      }
    } catch (error) {
      console.error('Error getting current weather:', error);
      fetchAllPosts(currentSession);
    }
  };

  // ВИПРАВЛЕНА функція для фільтрації з схожими типами погоди І температурою
  const fetchFilteredPosts = async (
    currentSession: Session | null, 
    userTemp: number, 
    userWeatherType: string
  ) => {
    try {
      setLoading(true);
      
      const tempTolerance = 3; // Збільшуємо толерантність до 3°C
      const minTemp = userTemp - tempTolerance;
      const maxTemp = userTemp + tempTolerance;
      
      // Отримуємо схожі типи погоди
      const similarWeatherTypes = getSimilarWeatherTypes(userWeatherType);
      console.log('Поточний тип погоди:', userWeatherType);
      console.log('Схожі типи погоди для пошуку:', similarWeatherTypes);
      console.log('Температурний діапазон:', minTemp, '-', maxTemp);
      
      let query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          outfits!inner (
            id,
            date,
            user_id,
            profiles!inner (
              username,
              avatar_url
            ),
            weather!inner (
              weather_type,
              min_tempurature,
              max_tempurature,
              weather_icon,
              date,
              city
            ),
            outfit_item (
              wardrobe (
                id,
                photo_url,
                category,
                subcategory
              )
            )
          )
        `)
        // ВИПРАВЛЕНА логіка: шукаємо пости де температурні діапазони перекриваються
        .lte('outfits.weather.min_tempurature', maxTemp)  // мінімальна температура поста <= наша максимальна
        .gte('outfits.weather.max_tempurature', minTemp)  // максимальна температура поста >= наша мінімальна
        .in('outfits.weather.weather_type', similarWeatherTypes); // І тип погоди схожий

      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filtered posts:', error);
        fetchAllPosts(currentSession);
        return;
      }

      console.log(`Знайдено ${data?.length || 0} постів зі схожою погодою і температурою`);
      await processPosts(data, currentSession, true);
    } catch (error) {
      console.error('Error in fetchFilteredPosts:', error);
      fetchAllPosts(currentSession);
    }
  };

  const fetchAllPosts = async (currentSession: Session | null) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          outfits!inner (
            id,
            date,
            user_id,
            profiles!inner (
              username,
              avatar_url
            ),
            weather!inner (
              weather_type,
              min_tempurature,
              max_tempurature,
              weather_icon,
              date,
              city
            ),
            outfit_item (
              wardrobe (
                id,
                photo_url,
                category,
                subcategory
              )
            )
          )
        `);

      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити пости');
        return;
      }

      await processPosts(data, currentSession, false);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Помилка', 'Щось пішло не так');
    }
  };

  const processPosts = async (data: any[], currentSession: Session | null, isFiltered: boolean = false) => {
    try {
      const postsWithStats = await Promise.all(
        data.map(async (post) => {
          const [
            { count: likesCount },
            { count: savesCount },
            { count: commentsCount },
            likeCheck,
            saveCheck
          ] = await Promise.all([
            supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('saved_posts')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            // Перевіряємо, чи лайкнув поточний користувач
            currentSession?.user?.id ? supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentSession.user.id)
              .single() : Promise.resolve({ data: null, error: null }),
            // Перевіряємо, чи зберіг поточний користувач
            currentSession?.user?.id ? supabase
              .from('saved_posts')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentSession.user.id)
              .single() : Promise.resolve({ data: null, error: null })
          ]);

          // Рахуємо популярність: лайки * 3 + коментарі * 2 + збереження * 1
          const popularityScore = (likesCount || 0) * 3 + (commentsCount || 0) * 2 + (savesCount || 0) * 1;

          return {
            ...post,
            likes_count: likesCount || 0,
            saves_count: savesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: !likeCheck.error && likeCheck.data !== null,
            is_saved: !saveCheck.error && saveCheck.data !== null,
            popularity_score: popularityScore
          };
        })
      );

      const rawData = postsWithStats as unknown as (RawPostData & {
        likes_count: number;
        saves_count: number;
        comments_count: number;
        is_liked: boolean;
        is_saved: boolean;
        popularity_score: number;
      })[];
      
      const postsWithoutImages: Post[] = rawData?.map(post => ({
        post_id: post.id,
        post_created_at: post.created_at,
        username: post.outfits.profiles.username,
        avatar_url: post.outfits.profiles.avatar_url,
        weather_type: post.outfits.weather.weather_type,
        min_tempurature: post.outfits.weather.min_tempurature,
        max_tempurature: post.outfits.weather.max_tempurature,
        weather_icon: post.outfits.weather.weather_icon,
        weather_date: post.outfits.weather.date,
        city: post.outfits.weather.city,
        outfit_items: post.outfits.outfit_item?.map(item => ({
          item_id: item.wardrobe.id,
          photo_url: item.wardrobe.photo_url,
          category: item.wardrobe.category,
          subcategory: item.wardrobe.subcategory
        })) || [],
        likes_count: post.likes_count,
        saves_count: post.saves_count,
        comments_count: post.comments_count,
        is_liked: post.is_liked,
        is_saved: post.is_saved,
        popularity_score: post.popularity_score
      })) || [];

      const postsWithImages = await Promise.all(
        postsWithoutImages.map(async (post) => {
          let avatarUrl = post.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: avatarData } = await supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            
            if (avatarData) {
              avatarUrl = avatarData.publicUrl;
            }
          }

          const outfitItemsWithImages = await Promise.all(
            post.outfit_items.map(async (item) => {
              if (!item.photo_url) {
                return item;
              }

              const { data: imageData } = await supabase.storage
                .from('clothes')
                .getPublicUrl(item.photo_url);

              return {
                ...item,
                photo_url: imageData?.publicUrl || item.photo_url,
                image: imageData?.publicUrl
              };
            })
          );

          return {
            ...post,
            avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
            outfit_items: outfitItemsWithImages
          };
        })
      );

      // Сортуємо пости за популярністю (від найпопулярніших до менш популярних)
      const sortedPosts = postsWithImages.sort((a, b) => b.popularity_score - a.popularity_score);

      setPosts(sortedPosts);
      if (!isFiltered || !searchQuery) {
        setAllPosts(sortedPosts);
                                                                                                                                                                                                                                                     
        // Фільтруємо пости тільки від підписок
        if (followingUserIds.length > 0) {
          const followingOnlyPosts = sortedPosts.filter(post => {
            // Отримуємо user_id з даних поста
            const originalPostData = rawData.find(raw => raw.id === post.post_id);
            return originalPostData && followingUserIds.includes(originalPostData.outfits.user_id);
          });
          setFollowingPosts(followingOnlyPosts);
        } else {
          setFollowingPosts([]);
        }
      }
    } catch (error) {
      console.error('Error processing posts:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці постів');
    } finally {
      setLoading(false);
    }
  };

  // Перемикання вкладок з збереженням у AsyncStorage
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery(''); // Очищаємо пошук при зміні вкладки
    setShowSuggestions(false);
    await saveActiveTabSetting(tab); // Зберігаємо нову вкладку
  };

  // Навігація до профілю користувача
  const navigateToUserProfile = (username: string) => {
    navigation.navigate('UserProfile', { username });
  };

  // Навігація до деталей поста
  const navigateToPostDetail = (postId: number) => {
    navigation.navigate('PostDetail', { postId });
  };

  const selectUser = (username: string) => {
    setSearchQuery(username);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Функція для показу всіх постів з збереженням налаштування
  const showAllPosts = async () => {
    setCurrentWeather(null);
    setSearchQuery('');
    setWeatherFilterDisabled(true);
    await saveWeatherFilterSetting(true); // Зберігаємо, що фільтрація вимкнена
    fetchAllPosts(session);
  };

  // Функція для повернення фільтрації по погоді
  const enableWeatherFilter = async () => {
    setWeatherFilterDisabled(false);
    await saveWeatherFilterSetting(false); // Зберігаємо, що фільтрація увімкнена
    getCurrentWeatherAndFetchPosts(session);
  };

  // Функція-переключалка для кнопки
  const toggleWeatherFilter = async () => {
    if (weatherFilterDisabled) {
      // Якщо зараз показуються всі пости, переключаємо на фільтрацію по погоді
      await enableWeatherFilter();
    } else {
      // Якщо зараз показуються пости по погоді, переключаємо на всі пости
      await showAllPosts();
    }
  };

  const renderUserSuggestion = ({ item }: { item: UserSuggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => navigateToUserProfile(item.username)}
    >
      <Image 
        source={{ uri: item.avatar_url || "" }} 
        style={styles.suggestionAvatar}
        defaultSource={require('../../assets/icon.png')}
      />
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionUsername}>{item.username}</Text>
        <Text style={styles.suggestionPostsCount}>{item.posts_count} постів</Text>
      </View>
    </TouchableOpacity>
  );

  const renderOutfitItem = ({ item }: { item: OutfitItem }) => (
    <View style={styles.outfitItem}>
      <Image 
        source={{ uri: item.image || item.photo_url }} 
        style={styles.outfitImage} 
        defaultSource={require('../../assets/icon.png')}
      />
      <Text style={styles.outfitCategory}>{item.category}</Text>
      {item.subcategory && (
        <Text style={styles.outfitSubcategory}>{item.subcategory}</Text>
      )}
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postContainer}
      onPress={() => navigateToPostDetail(item.post_id)}
      activeOpacity={0.9}
    >
      <View style={styles.postHeader}>
        {/* Аватар з навігацією до профілю */}
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            navigateToUserProfile(item.username);
          }}
        >
          <Image 
            source={{ 
              uri: item.avatar_url || DEFAULT_AVATAR_URL
            }} 
            style={styles.avatar} 
            defaultSource={require('../../assets/icon.png')}
          />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          {/* Ім'я користувача з навігацією до профілю */}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              navigateToUserProfile(item.username);
            }}
          >
            <Text style={styles.username}>{item.username}</Text>
          </TouchableOpacity>
          <Text style={styles.postDate}>
            {new Date(item.post_created_at).toLocaleDateString()}
          </Text>
        </View>
        {item.weather_icon && (
            <Image 
              source={{ uri: `http://openweathermap.org/img/wn/${item.weather_icon}.png` }} 
              style={styles.weatherIcon} 
            />
          )}
        <View style={styles.weatherInfoCompact}>
          <View style={styles.weatherDetails}>
            <Text style={styles.weatherType}>{item.weather_type}</Text>
            <Text style={styles.temperature}>
              {Math.round(item.min_tempurature)}°C
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.outfitSectionMain}>
        <Text style={styles.outfitTitle}>Образ:</Text>
        <FlatList
          data={item.outfit_items}
          renderItem={renderOutfitItem}
          keyExtractor={(outfitItem) => outfitItem.item_id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.outfitList}
          contentContainerStyle={styles.outfitListContent}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Image
            source={item.is_liked 
              ? require('../../assets/heart.png')
              : require('../../assets/heart_filled.png')
            }
            style={styles.statIconImage}
          />
          <Text style={styles.statText}>{item.likes_count}</Text>
        </View>

        <View style={styles.statItem}>
          <Image
            source={require('../../assets/chat-bubble.png')}
            style={styles.statIconImage}
          />
          <Text style={styles.statText}>{item.comments_count}</Text>
        </View>

        <View style={styles.statItem}>
          <Image
            source={item.is_saved 
              ? require('../../assets/save_filled.png')
              : require('../../assets/save.png')
            }
            style={styles.statIconImage}
          />
          <Text style={styles.statText}>{item.saves_count}</Text>
        </View>
      </View>

      {/* Індикатор популярності для топ-постів */}
      {item.popularity_score > 10 && (
        <View style={styles.popularityIndicator}>
          <Text style={styles.popularityText}>🔥 {item.popularity_score}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Завантаження постів...</Text>
        {currentWeather && !weatherFilterDisabled && (
          <Text style={styles.filterInfo}>
            Фільтруємо по температурі: {Math.round(currentWeather.temp)}°C (±3°) та погоді: {currentWeather.weather_type}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Стрічка постів</Text>
        {currentWeather && !weatherFilterDisabled && (
          <Text style={styles.filterSubtitle}>
            Схожа погода: {Math.round(currentWeather.temp)}°C, {currentWeather.weather_type}
          </Text>
        )}
        
        {/* Система вкладок */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'all' && styles.activeTabButton
            ]}
            onPress={() => handleTabChange('all')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'all' && styles.activeTabButtonText
            ]}>
              Всі пости
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'following' && styles.activeTabButton
            ]}
            onPress={() => handleTabChange('following')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'following' && styles.activeTabButtonText
            ]}>
              Підписки ({followingPosts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Пошук по користувачах */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Пошук по користувачах..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
            {searchLoading && (
              <ActivityIndicator 
                size="small" 
                color="#1976d2" 
                style={styles.searchLoader}
              />
            )}
          </View>
          
          {/* Автокомпліт */}
          {showSuggestions && userSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={userSuggestions}
                renderItem={renderUserSuggestion}
                keyExtractor={(item) => item.username}
                style={styles.suggestionsList}
              />
            </View>
          )}
        </View>

        {/* Результати пошуку */}
        {searchQuery && (
          <Text style={styles.searchResults}>
            Знайдено {filteredPosts.length} постів
            {filteredPosts.length > 0 && ` від користувача "${searchQuery}"`}
          </Text>
        )}

        {/* Інформація про сортування */}
        {!searchQuery && (
          <Text style={styles.sortingInfo}>
            📈 Пости відсортовані за популярністю
          </Text>
        )}
      </View>
      
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        refreshing={loading}
        onRefresh={() => getCurrentWeatherAndFetchPosts(session)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredPosts.length === 0 ? { 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center' 
        } : { paddingBottom: !searchQuery && activeTab !== 'following' ? 140 : 80 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'following' 
                ? (followingUserIds.length === 0 
                  ? 'Ви поки ні на кого не підписані' 
                  : 'Немає постів від користувачів, на яких ви підписані')
                : (searchQuery 
                  ? `Немає постів від користувача "${searchQuery}"` 
                  : (currentWeather && !weatherFilterDisabled
                    ? 'Немає постів з подібною погодою' 
                    : 'Поки немає жодних постів у спільноті'
                  ))}
            </Text>
            {activeTab === 'following' && followingUserIds.length === 0 && (
              <TouchableOpacity 
                style={styles.showAllButton}
                onPress={() => {
                  handleTabChange('all');
                  navigation.navigate('Social'); // Перехід до соціального розділу для пошуку користувачів
                }}
              >
                <Text style={styles.showAllButtonText}>Знайти користувачів</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        onScrollBeginDrag={() => setShowSuggestions(false)}
      />
      
      {/* Кнопка переключення фільтра - завжди видима (крім пошуку і вкладки підписок) */}
      {!searchQuery && activeTab !== 'following' && (
        <TouchableOpacity
          style={styles.toggleFilterButton}
          onPress={toggleWeatherFilter}
        >
          <Text style={styles.toggleFilterButtonText}>
            {weatherFilterDisabled ? ' Показати пости по погоді' : ' Показати всі пости'}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.myPostsButton}
        onPress={() => navigation.navigate('MyPosts')}
      >
        <Text style={styles.myPostsButtonText}>Мої пости</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    gap: 16,
    paddingHorizontal: 20,
  },
  filterInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  showAllButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  showAllButtonText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignContent:'flex-start'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  filterSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Стилі для інформації про вимкнену фільтрацію
  allPostsInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  allPostsText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  // Стилі для вкладок
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 23,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#1976d2',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  searchLoader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  suggestionPostsCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchResults: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  sortingInfo: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  postContainer: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  weatherInfoCompact: {
    alignItems: 'center',
    marginLeft: 12,
  },
  weatherDetails: {
    alignItems: 'center',
  },
  cityText: {
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  weatherType: {
    fontSize: 11,
    color: '#333',
    textTransform: 'capitalize',
  },
  temperature: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  weatherIcon: {
    width: 40,
    height: 40,
    marginTop: 4,
  },
  outfitSectionMain: {
    marginBottom: 16,
    minHeight: 120,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  outfitList: {
    flexGrow: 0,
  },
  outfitListContent: {
    paddingVertical: 8,
  },
  outfitItem: {
    marginRight: 16,
    alignItems: 'center',
    width: 90,
  },
  outfitImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  outfitCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  outfitSubcategory: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    minWidth: 60,
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statIconImage: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  popularityIndicator: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  postIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postIndicatorText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '500',
  },
  // Кнопка переключення фільтра над кнопкою "Мої пости"
  toggleFilterButton: {
    position: 'absolute',
    bottom: 80, // Розміщуємо над кнопкою "Мої пости"
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleFilterButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  myPostsButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  myPostsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AllPosts;