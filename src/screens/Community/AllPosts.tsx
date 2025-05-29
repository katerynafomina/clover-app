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
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

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

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const AllPosts: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      getCurrentWeatherAndFetchPosts(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        getCurrentWeatherAndFetchPosts(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Фільтрація постів по пошуковому запиту
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }
    
    return allPosts.filter(post => 
      post.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, allPosts, searchQuery]);

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
        
        // Шукаємо користувачів з постами
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
      const { data: userWeather, error: weatherError } = await supabase
        .from('weather')
        .select('weather_type, min_tempurature, max_tempurature')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (weatherError) {
        console.log('Не вдалося отримати поточну погоду, показуємо всі пости');
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

  const fetchFilteredPosts = async (
    currentSession: Session | null, 
    userTemp: number, 
    userWeatherType: string
  ) => {
    try {
      setLoading(true);
      
      const minTemp = userTemp - 2;
      const maxTemp = userTemp + 2;

      let query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          outfits!inner (
            id,
            date,
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
        .gte('outfits.weather.min_tempurature', minTemp)
        .lte('outfits.weather.max_tempurature', maxTemp)
        .eq('outfits.weather.weather_type', userWeatherType);

      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filtered posts:', error);
        fetchAllPosts(currentSession);
        return;
      }

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
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: savesCount } = await supabase
            .from('saved_posts')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            likes_count: likesCount || 0,
            saves_count: savesCount || 0,
            comments_count: commentsCount || 0
          };
        })
      );

      const rawData = postsWithStats as unknown as (RawPostData & {
        likes_count: number;
        saves_count: number;
        comments_count: number;
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
        comments_count: post.comments_count
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

      setPosts(postsWithImages);
      if (!isFiltered || !searchQuery) {
        setAllPosts(postsWithImages);
      }
    } catch (error) {
      console.error('Error processing posts:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці постів');
    } finally {
      setLoading(false);
    }
  };

  // Навігація до профілю користувача
  const navigateToUserProfile = (username: string) => {
    navigation.navigate('UserProfile', { username });
  };

  const selectUser = (username: string) => {
    setSearchQuery(username);
    setShowSuggestions(false);
    // Можемо також одразу перейти на профіль
    // navigateToUserProfile(username);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const renderUserSuggestion = ({ item }: { item: UserSuggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => navigateToUserProfile(item.username)} // Переходимо на профіль
    >
      <Image 
        source={{ uri: item.avatar_url }} 
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
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        {/* Аватар з навігацією */}
        <TouchableOpacity onPress={() => navigateToUserProfile(item.username)}>
          <Image 
            source={{ 
              uri: item.avatar_url || DEFAULT_AVATAR_URL
            }} 
            style={styles.avatar} 
            defaultSource={require('../../assets/icon.png')}
          />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          {/* Ім'я користувача з навігацією */}
          <TouchableOpacity onPress={() => navigateToUserProfile(item.username)}>
            <Text style={styles.username}>{item.username}</Text>
          </TouchableOpacity>
          <Text style={styles.postDate}>
            {new Date(item.post_created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.weatherInfoCompact}>
          <View style={styles.weatherDetails}>
            <Text style={styles.cityText}>{item.city}</Text>
            <Text style={styles.weatherType}>{item.weather_type}</Text>
            <Text style={styles.temperature}>
              {Math.round(item.min_tempurature)}° - {Math.round(item.max_tempurature)}°C
            </Text>
          </View>
          {item.weather_icon && (
            <Image 
              source={{ uri: `http://openweathermap.org/img/wn/${item.weather_icon}.png` }} 
              style={styles.weatherIcon} 
            />
          )}
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
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>❤️</Text>
          <Text style={styles.statText}>{item.likes_count}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statText}>{item.comments_count}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📥</Text>
          <Text style={styles.statText}>{item.saves_count}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Завантаження постів...</Text>
        {currentWeather && (
          <Text style={styles.filterInfo}>
            Фільтруємо по температурі: {Math.round(currentWeather.temp)}°C (±2°) та погоді: {currentWeather.weather_type}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Всі пости</Text>
        {currentWeather && (
          <Text style={styles.filterSubtitle}>
            Схожа погода: {Math.round(currentWeather.temp)}°C, {currentWeather.weather_type}
          </Text>
        )}
        
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
        } : undefined}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? `Немає постів від користувача "${searchQuery}"` 
                : (currentWeather 
                  ? 'Немає постів з подібною погодою' 
                  : 'Поки немає жодних постів у спільноті'
                )}
            </Text>
            {(currentWeather || searchQuery) && (
              <TouchableOpacity 
                style={styles.showAllButton}
                onPress={() => {
                  setCurrentWeather(null);
                  setSearchQuery('');
                  fetchAllPosts(session);
                }}
              >
                <Text style={styles.showAllButtonText}>Показати всі пости</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        onScrollBeginDrag={() => setShowSuggestions(false)}
      />
      
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
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  showAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2', // Зміна кольору для вказівки на можливість натискання
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
    color: '#1976d2',
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
    color: '#1976d2',
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
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  myPostsButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myPostsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AllPosts;