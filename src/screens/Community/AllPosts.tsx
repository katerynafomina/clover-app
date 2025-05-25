import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Image, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase'; // Переконайтеся, що шлях правильний

// Інтерфейси для типізації
interface OutfitItem {
  item_id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
  image?: string; // Додано поле для URL зображення з Storage
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
}

// Інтерфейси для результатів запиту Supabase
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

// Фактичні типи даних з Supabase, відповідно до формату відповіді
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
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const AllPosts: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostsAlternative();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_all_posts_with_details');
      
      if (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити пости');
        return;
      }

      setPosts(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Помилка', 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  // Альтернативний метод без RPC функції
  const fetchPostsAlternative = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити пости');
        return;
      }

      // Трансформуємо дані у потрібний формат
      const rawData = data as unknown as RawPostData[];
      
      // Підготовка даних без URL зображень
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
        })) || []
      })) || [];

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
                image: imageData?.publicUrl // Додаткове поле для сумісності з DayOutfit
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

  const handleVote = (postId: number, vote: 'like' | 'dislike') => {
    console.log(`Post ${postId} voted as ${vote}`);
    // Тут можна додати логіку для збереження голосування в базу даних
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

      {/* Кнопки голосування */}
      <View style={styles.voteButtons}>
        <Button 
          title="👍 Like" 
          onPress={() => handleVote(item.post_id, 'like')} 
        />
        <Button 
          title="👎 Dislike" 
          onPress={() => handleVote(item.post_id, 'dislike')} 
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Завантаження постів...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Всі пости</Text>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.post_id.toString()}
        refreshing={loading}
        onRefresh={fetchPostsAlternative}
        showsVerticalScrollIndicator={false}
      />
      <Button
        title="Перейти до моїх постів"
        onPress={() => navigation.navigate('MyPosts')}
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
  weatherIcon: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 4,
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
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
});

export default AllPosts;