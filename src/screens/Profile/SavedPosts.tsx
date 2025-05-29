import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';

interface SavedPost {
  id: number;
  created_at: string;
  post_id: number;
  posts: {
    id: number;
    created_at: string;
    outfit_id: number;
    outfits: {
      profiles: {
        username: string;
        avatar_url: string | null;
      };
      weather: {
        weather_type: string;
        min_tempurature: number;
        max_tempurature: number;
        weather_icon: string;
        city: string;
        date: string;
      };
      outfit_item: {
        wardrobe: {
          photo_url: string;
        };
      }[];
    };
  };
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const SavedPostsScreen = () => {
  const navigation = useNavigation() as NavigationProp<any>;
  const [session, setSession] = useState<Session | null>(null);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchSavedPosts = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          created_at,
          post_id,
          posts (
            id,
            created_at,
            outfit_id,
            outfits (
              profiles (
                username,
                avatar_url
              ),
              weather (
                weather_type,
                min_tempurature,
                max_tempurature,
                weather_icon,
                city,
                date
              ),
              outfit_item (
                wardrobe (
                  photo_url
                )
              )
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved posts:', error);
        return;
      }

      setSavedPosts(data || []);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSavedPosts();
    setRefreshing(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchSavedPosts();
      }
    }, [session])
  );

  const navigateToPost = (postId: number) => {
    console.log('Navigating to post:', postId);
    navigation.navigate('PostDetail', { postId });
  };

  const unsavePost = async (postId: number) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', session.user.id)
        .eq('post_id', postId);

      if (error) {
        console.error('Error unsaving post:', error);
        return;
      }

      // Оновлюємо локальний стан
      setSavedPosts(prev => prev.filter(savedPost => savedPost.post_id !== postId));
    } catch (error) {
      console.error('Error unsaving post:', error);
    }
  };

  const renderSavedPost = ({ item }: { item: SavedPost }) => {
    const post = item.posts;
    if (!post) return null;

    // Отримуємо перше фото з образу
    const firstImage = post.outfits?.outfit_item?.[0]?.wardrobe?.photo_url;
    let imageUrl = null;

    if (firstImage) {
      const { data } = supabase.storage
        .from('clothes')
        .getPublicUrl(firstImage);
      imageUrl = data?.publicUrl;
    }

    // Обробляємо аватар автора
    let authorAvatarUrl = post.outfits?.profiles?.avatar_url;
    if (authorAvatarUrl && !authorAvatarUrl.startsWith('http')) {
      const { data: avatarData } = supabase.storage
        .from('avatars')
        .getPublicUrl(authorAvatarUrl);
      
      if (avatarData) {
        authorAvatarUrl = avatarData.publicUrl;
      }
    }

    return (
      <TouchableOpacity
        style={styles.savedPostItem}
        onPress={() => navigateToPost(post.id)}
        activeOpacity={0.7}
      >
        {/* Заголовок з автором */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <Image 
              source={{ uri: authorAvatarUrl || DEFAULT_AVATAR_URL }} 
              style={styles.authorAvatar} 
            />
            <View style={styles.authorDetails}>
              <Text style={styles.authorUsername}>@{post.outfits?.profiles?.username}</Text>
              <Text style={styles.postDate}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={(e) => {
              e.stopPropagation();
              unsavePost(post.id);
            }}
          >
            <Text style={styles.unsaveButtonText}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Зображення образу */}
        <View style={styles.postImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.postImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📸</Text>
            </View>
          )}
        </View>

        {/* Інформація про погоду */}
        <View style={styles.weatherInfo}>
          <View style={styles.weatherLeft}>
            {post.outfits?.weather?.weather_icon && (
              <Image
                source={{ 
                  uri: `http://openweathermap.org/img/wn/${post.outfits.weather.weather_icon}.png` 
                }}
                style={styles.weatherIcon}
              />
            )}
            <Text style={styles.temperature}>
              {Math.round(post.outfits?.weather?.min_tempurature || 0)}° - {Math.round(post.outfits?.weather?.max_tempurature || 0)}°
            </Text>
          </View>
          <Text style={styles.cityText}>{post.outfits?.weather?.city}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>Завантаження збережених постів...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {savedPosts.length > 0 ? (
        <FlatList
          data={savedPosts}
          renderItem={renderSavedPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📥</Text>
          <Text style={styles.emptyTitle}>Немає збережених постів</Text>
          <Text style={styles.emptyDescription}>
            Збережіть цікаві образи, щоб переглянути їх пізніше
          </Text>
        </View>
      )}
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  savedPostItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 1 }], // Додаємо для анімації
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  unsaveButton: {
    padding: 8,
  },
  unsaveButtonText: {
    fontSize: 20,
  },
  postImageContainer: {
    aspectRatio: 16/9,
    backgroundColor: '#e0e0e0',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 48,
  },
  weatherInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  temperature: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cityText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SavedPostsScreen;