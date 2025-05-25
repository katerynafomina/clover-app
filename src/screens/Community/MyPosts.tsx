import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import Button from '../../components/Button';
import { useNavigation, NavigationProp } from '@react-navigation/native';

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
  outfit_id: number; // Додано для можливості видалення
  likes_count: number; // Кількість лайків
  saves_count: number; // Кількість збережень
  is_liked: boolean; // Чи лайкнув поточний користувач
  is_saved: boolean; // Чи зберіг поточний користувач
  isLikeLoading?: boolean; // Для відстеження стану завантаження лайка
  isSaveLoading?: boolean; // Для відстеження стану завантаження збереження
}

// Інтерфейси для результатів запиту Supabase
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
  outfit_id: any;
  outfits: RawOutfitData;
  likes?: any; // Для підтримки різних форматів
  saved_posts?: any; // Для підтримки різних форматів
  is_liked?: boolean;
  is_saved?: boolean;
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const MyPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const navigation = useNavigation() as NavigationProp<any>;

  useEffect(() => {
    // Отримуємо сесію поточного користувача
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserPosts(session.user.id);
      }
    });

    // Підписуємось на зміни в сесії
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchUserPosts(session.user.id);
        } else {
          setPosts([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserPosts = async (userId: string) => {
    try {
      setLoading(true);
      
      // Запит до бази даних для отримання постів користувача
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          outfit_id,
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
          ),
          likes:likes(count),
          saved_posts:saved_posts(count)
        `)
        .eq('outfits.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити ваші пости');
        return;
      }

      // Отримуємо лайки поточного користувача
      const { data: userLikes, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);
        
      if (likesError) {
        console.error('Error fetching user likes:', likesError);
      }
      
      // Отримуємо збережені пости поточного користувача
      const { data: userSaves, error: savesError } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId);
        
      if (savesError) {
        console.error('Error fetching user saved posts:', savesError);
      }
      
      // Створюємо множини для швидкого пошуку
      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);
      const savedPostIds = new Set(userSaves?.map(save => save.post_id) || []);
      
      // Додаємо інформацію про взаємодію користувача до кожного поста
      const postsWithUserInteraction = data?.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        is_saved: savedPostIds.has(post.id)
      }));

      // Трансформуємо дані
      const rawData = postsWithUserInteraction as unknown as RawPostData[];
      
      // Підготовка даних без URL зображень
      const postsWithoutImages: Post[] = rawData?.map(post => {
        // Визначаємо кількість лайків та збережень
        let likesCount = 0;
        let savesCount = 0;
        
        // Перевіряємо різні можливі формати даних від Supabase
        if (post.likes) {
          if (typeof post.likes === 'number') {
            likesCount = post.likes;
          } else if (Array.isArray(post.likes)) {
            likesCount = post.likes.length;
          } else if (typeof post.likes === 'object') {
            if (post.likes.count !== undefined) {
              likesCount = post.likes.count;
            } else if (post.likes.length !== undefined) {
              likesCount = post.likes.length;
            }
          }
        }
        
        if (post.saved_posts) {
          if (typeof post.saved_posts === 'number') {
            savesCount = post.saved_posts;
          } else if (Array.isArray(post.saved_posts)) {
            savesCount = post.saved_posts.length;
          } else if (typeof post.saved_posts === 'object') {
            if (post.saved_posts.count !== undefined) {
              savesCount = post.saved_posts.count;
            } else if (post.saved_posts.length !== undefined) {
              savesCount = post.saved_posts.length;
            }
          }
        }
        
        return {
          post_id: post.id,
          post_created_at: post.created_at,
          outfit_id: post.outfit_id,
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
          likes_count: likesCount,
          saves_count: savesCount,
          is_liked: post.is_liked || false,
          is_saved: post.is_saved || false
        };
      }) || [];

      // Завантаження URL зображень для кожного поста
      const postsWithImages = await Promise.all(
        postsWithoutImages.map(async (post) => {
          // Завантаження URL аватара, якщо він є
          let avatarUrl = post.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: avatarData } = await supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            
            if (avatarData) {
              avatarUrl = avatarData.publicUrl;
            }
          }

          // Завантаження URL для кожного елемента одягу
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
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Помилка', 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: number) => {
    try {
      Alert.alert(
        'Підтвердження',
        'Ви впевнені, що хочете видалити цей пост?',
        [
          { text: 'Скасувати', style: 'cancel' },
          { 
            text: 'Видалити', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);
                
              if (error) {
                console.error('Error deleting post:', error);
                Alert.alert('Помилка', 'Не вдалося видалити пост');
                setLoading(false);
                return;
              }
              
              // Оновлюємо список постів після видалення
              if (session) {
                fetchUserPosts(session.user.id);
              }
              
              Alert.alert('Успішно', 'Пост видалено');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Помилка', 'Щось пішло не так при видаленні посту');
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!session) {
      Alert.alert('Увага', 'Щоб поставити лайк, необхідно увійти в систему');
      navigation.navigate('Login');
      return;
    }

    try {
      // Знаходимо пост, який лайкаємо
      const post = posts.find(p => p.post_id === postId);
      if (!post) return;

      // Визначаємо, чи вже лайкнутий пост
      const isLiked = post.is_liked;

      // Встановлюємо індикатор завантаження для кнопки
      setPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isLikeLoading: true }
            : p
        )
      );

      if (isLiked) {
        // Видаляємо лайк з бази даних
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);

        if (error) {
          console.error('Error removing like:', error);
          Alert.alert('Помилка', 'Не вдалося видалити лайк');
          
          // Знімаємо індикатор завантаження
          setPosts(currentPosts => 
            currentPosts.map(p => 
              p.post_id === postId 
                ? { ...p, isLikeLoading: false }
                : p
            )
          );
          return;
        }
        
        // Після успішного видалення оновлюємо стан
        setPosts(currentPosts => 
          currentPosts.map(p => 
            p.post_id === postId 
              ? { 
                  ...p, 
                  is_liked: false, 
                  likes_count: p.likes_count > 0 ? p.likes_count - 1 : 0,
                  isLikeLoading: false
                }
              : p
          )
        );
      } else {
        // Додаємо лайк до бази даних
        const { error } = await supabase
          .from('likes')
          .insert([
            { user_id: session.user.id, post_id: postId }
          ]);

        if (error) {
          console.error('Error adding like:', error);
          Alert.alert('Помилка', 'Не вдалося додати лайк');
          
          // Знімаємо індикатор завантаження
          setPosts(currentPosts => 
            currentPosts.map(p => 
              p.post_id === postId 
                ? { ...p, isLikeLoading: false }
                : p
            )
          );
          return;
        }
        
        // Після успішного додавання оновлюємо стан
        setPosts(currentPosts => 
          currentPosts.map(p => 
            p.post_id === postId 
              ? { 
                  ...p, 
                  is_liked: true, 
                  likes_count: p.likes_count + 1,
                  isLikeLoading: false
                }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці лайка');
    }
  };

  const handleSave = async (postId: number) => {
    if (!session) {
      Alert.alert('Увага', 'Щоб зберегти пост, необхідно увійти в систему');
      navigation.navigate('Login');
      return;
    }

    try {
      // Знаходимо пост, який зберігаємо
      const post = posts.find(p => p.post_id === postId);
      if (!post) return;

      // Визначаємо, чи вже збережений пост
      const isSaved = post.is_saved;

      // Встановлюємо індикатор завантаження для кнопки
      setPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isSaveLoading: true }
            : p
        )
      );

      if (isSaved) {
        // Видаляємо з збережених в базі даних
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);

        if (error) {
          console.error('Error removing from saved:', error);
          Alert.alert('Помилка', 'Не вдалося видалити пост зі збережених');
          
          // Знімаємо індикатор завантаження
          setPosts(currentPosts => 
            currentPosts.map(p => 
              p.post_id === postId 
                ? { ...p, isSaveLoading: false }
                : p
            )
          );
          return;
        }
        
        // Після успішного видалення оновлюємо стан
        setPosts(currentPosts => 
          currentPosts.map(p => 
            p.post_id === postId 
              ? { 
                  ...p, 
                  is_saved: false, 
                  saves_count: p.saves_count > 0 ? p.saves_count - 1 : 0,
                  isSaveLoading: false
                }
              : p
          )
        );
      } else {
        // Додаємо до збережених в базі даних
        const { error } = await supabase
          .from('saved_posts')
          .insert([
            { user_id: session.user.id, post_id: postId }
          ]);

        if (error) {
          console.error('Error adding to saved:', error);
          Alert.alert('Помилка', 'Не вдалося додати пост до збережених');
          
          // Знімаємо індикатор завантаження
          setPosts(currentPosts => 
            currentPosts.map(p => 
              p.post_id === postId 
                ? { ...p, isSaveLoading: false }
                : p
            )
          );
          return;
        }
        
        // Після успішного додавання оновлюємо стан
        setPosts(currentPosts => 
          currentPosts.map(p => 
            p.post_id === postId 
              ? { 
                  ...p, 
                  is_saved: true, 
                  saves_count: p.saves_count + 1,
                  isSaveLoading: false
                }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error handling save:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці збереження');
    }
  };

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
      {/* Заголовок поста з інформацією про користувача */}
      <View style={styles.postHeader}>
        <Image 
          source={{ 
            uri: item.avatar_url || DEFAULT_AVATAR_URL
          }} 
          style={styles.avatar} 
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.postDate}>
            {new Date(item.post_created_at).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deletePost(item.post_id)}
        >
          <Text style={styles.deleteButtonText}>✖</Text>
        </TouchableOpacity>
      </View>

      {/* Інформація про погоду */}
      <View style={styles.weatherInfo}>
        <Text style={styles.weatherTitle}>Погода в {item.city}</Text>
        <View style={styles.weatherDetails}>
          <Text style={styles.weatherType}>{item.weather_type}</Text>
          <Text style={styles.temperature}>
            {Math.round(item.min_tempurature)}° - {Math.round(item.max_tempurature)}°C
          </Text>
        </View>
        {item.weather_icon && (
          <Image 
            source={{ uri: `http://openweathermap.org/img/wn/${item.weather_icon}.png` }} 
            style={{ width: 50, height: 50, alignSelf: 'center' }} 
          />
        )}
      </View>

      {/* Одяг */}
      <View style={styles.outfitSection}>
        <Text style={styles.outfitTitle}>Образ:</Text>
        <FlatList
          data={item.outfit_items}
          renderItem={renderOutfitItem}
          keyExtractor={(outfitItem) => outfitItem.item_id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.outfitList}
        />
      </View>

      {/* Кнопки взаємодії */}
      <View style={styles.interactionButtons}>
        <View style={styles.interactionButtonGroup}>
          <TouchableOpacity 
            style={[
              styles.interactionButton, 
              item.is_liked && styles.activeButton,
              item.isLikeLoading && styles.loadingButton
            ]}
            onPress={() => handleLike(item.post_id)}
            disabled={item.isLikeLoading}
          >
            <Text style={[styles.buttonIcon, item.is_liked && styles.activeButtonText]}>
              {item.isLikeLoading ? '⏳' : (item.is_liked ? '❤️' : '🤍')}
            </Text>
            <Text style={[styles.buttonText, item.is_liked && styles.activeButtonText]}>
              {item.likes_count}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.interactionButtonGroup}>
          <TouchableOpacity 
            style={[
              styles.interactionButton, 
              item.is_saved && styles.activeButton,
              item.isSaveLoading && styles.loadingButton
            ]}
            onPress={() => handleSave(item.post_id)}
            disabled={item.isSaveLoading}
          >
            <Text style={[styles.buttonIcon, item.is_saved && styles.activeButtonText]}>
              {item.isSaveLoading ? '⏳' : (item.is_saved ? '📥' : '📤')}
            </Text>
            <Text style={[styles.buttonText, item.is_saved && styles.activeButtonText]}>
              {item.saves_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>У вас ще немає опублікованих постів</Text>
      <Button 
        text="Створити новий образ" 
        onPress={() => navigation.navigate('CreateOutfit')} 
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Завантаження ваших постів...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Увійдіть у свій акаунт, щоб побачити ваші пости</Text>
        <Button 
          text="Увійти" 
          onPress={() => navigation.navigate('Login')} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Мої пости</Text>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        ListEmptyComponent={renderEmptyList}
        refreshing={loading}
        onRefresh={() => session && fetchUserPosts(session.user.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
      />
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    gap: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
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
    marginBottom: 12,
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
    color: '#333',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4d4d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  weatherTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherType: {
    fontSize: 16,
    color: '#333',
    textTransform: 'capitalize',
  },
  temperature: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  outfitSection: {
    marginBottom: 12,
  },
  outfitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  outfitList: {
    flexGrow: 0,
  },
  outfitItem: {
    marginRight: 12,
    alignItems: 'center',
    width: 80,
  },
  outfitImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  outfitCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  outfitSubcategory: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  interactionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  interactionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
  },
  activeButton: {
    backgroundColor: '#e3f2fd',
  },
  loadingButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  buttonText: {
    fontSize: 14,
    color: '#666',
  },
  activeButtonText: {
    color: '#1976d2',
    fontWeight: '500',
  },
});

export default MyPosts;