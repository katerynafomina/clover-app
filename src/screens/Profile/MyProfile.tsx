import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import Button from '../../components/Button';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  description: string | null;
  website: string | null;
}

interface UserPost {
  id: number;
  created_at: string;
  outfit_id: number;
  likes_count: number;
  comments_count: number;
  weather: {
    weather_type: string;
    min_tempurature: number;
    max_tempurature: number;
    weather_icon: string;
    city: string;
    date: string;
  };
  outfits: {
    outfit_item: {
      wardrobe: {
        photo_url: string;
      };
    }[];
  };
}

interface FollowStats {
  followers_count: number;
  following_count: number;
}

interface UserFollower {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const MyProfileScreen = () => {
  const navigation = useNavigation() as NavigationProp<any>;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [savedPostsCount, setSavedPostsCount] = useState<number>(0);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Стани для модального вікна фоловерів
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [modalFollowers, setModalFollowers] = useState<UserFollower[]>([]);
  const [modalFollowing, setModalFollowing] = useState<UserFollower[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

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

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        let avatarUrl = data.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const { data: avatarData } = await supabase.storage
            .from('avatars')
            .getPublicUrl(avatarUrl);
          
          if (avatarData) {
            avatarUrl = avatarData.publicUrl;
          }
        }

        setProfile({
          ...data,
          avatar_url: avatarUrl || DEFAULT_AVATAR_URL
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStats = async () => {
    if (!session?.user?.id) return;

    try {
      // Отримуємо кількість фоловерів (хто підписаний на поточного користувача)
      const { count: followersCount, error: followersError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', session.user.id);

      if (followersError) {
        console.error('Error fetching followers count:', followersError);
      }

      // Отримуємо кількість підписок (на кого підписаний поточний користувач)
      const { count: followingCount, error: followingError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', session.user.id);

      if (followingError) {
        console.error('Error fetching following count:', followingError);
      }

      setFollowStats({
        followers_count: followersCount || 0,
        following_count: followingCount || 0
      });

    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const fetchUserPosts = async () => {
    if (!session?.user?.id) return;

    try {
      setPostsLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          outfit_id,
          outfits!inner (
            outfit_item (
              wardrobe (
                photo_url
              )
            ),
            weather (
              weather_type,
              min_tempurature,
              max_tempurature,
              weather_icon,
              city,
              date
            )
          )
        `)
        .eq('outfits.user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
        return;
      }

      // Отримуємо статистику для кожного поста
      const postsWithStats = await Promise.all(
        (data || []).map(async (post) => {
          const [
            { count: likesCount },
            { count: commentsCount }
          ] = await Promise.all([
            supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)
          ]);

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            weather: post.outfits.weather,
            outfits: post.outfits
          };
        })
      );

      setPosts(postsWithStats);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchSavedPostsCount = async () => {
    if (!session?.user?.id) return;

    try {
      const { count, error } = await supabase
        .from('saved_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching saved posts count:', error);
        return;
      }

      setSavedPostsCount(count || 0);
    } catch (error) {
      console.error('Error fetching saved posts count:', error);
    }
  };

  // Функції для модального вікна фоловерів
  const fetchModalFollowers = async (): Promise<UserFollower[]> => {
    if (!session?.user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`
          follower_id,
          profiles!followers_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('following_id', session.user.id);

      if (error) {
        console.error('Error fetching modal followers:', error);
        return [];
      }

      const followersData = await Promise.all(
        (data || []).map(async (item: any) => {
          const profile = item.profiles;
          
          let avatarUrl = profile.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: avatarData } = await supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            avatarUrl = avatarData?.publicUrl;
          }

          return {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
            isFollowing: false, // Для власного профілю не показуємо кнопки підписки
            isFollowLoading: false
          };
        })
      );

      return followersData;
    } catch (error) {
      console.error('Error fetching modal followers:', error);
      return [];
    }
  };

  const fetchModalFollowing = async (): Promise<UserFollower[]> => {
    if (!session?.user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`
          following_id,
          profiles!followers_following_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', session.user.id);

      if (error) {
        console.error('Error fetching modal following:', error);
        return [];
      }

      const followingData = await Promise.all(
        (data || []).map(async (item: any) => {
          const profile = item.profiles;
          
          let avatarUrl = profile.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: avatarData } = await supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            avatarUrl = avatarData?.publicUrl;
          }

          return {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
            isFollowing: true, // Всі в списку підписок за замовчуванням підписані
            isFollowLoading: false
          };
        })
      );

      return followingData;
    } catch (error) {
      console.error('Error fetching modal following:', error);
      return [];
    }
  };

  const fetchModalData = async () => {
    try {
      setModalLoading(true);
      const [followersData, followingData] = await Promise.all([
        fetchModalFollowers(),
        fetchModalFollowing()
      ]);
      
      setModalFollowers(followersData);
      setModalFollowing(followingData);
    } catch (error) {
      console.error('Error fetching modal data:', error);
      Alert.alert('Помилка', 'Не вдалося завантажити дані');
    } finally {
      setModalLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      fetchUserPosts(),
      fetchSavedPostsCount(),
      fetchFollowStats()
    ]);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchProfile();
        fetchUserPosts();
        fetchSavedPostsCount();
        fetchFollowStats();
      }
    }, [session])
  );

  const handleSignOut = async () => {
    Alert.alert(
      'Вихід',
      'Ви впевнені, що хочете вийти з облікового запису?',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Вийти',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile', { profile });
  };

  const navigateToSavedPosts = () => {
    navigation.navigate('SavedPosts');
  };

  const navigateToFollowers = () => {
    setModalInitialTab('followers');
    setFollowersModalVisible(true);
    fetchModalData();
  };

  const navigateToFollowing = () => {
    setModalInitialTab('following');
    setFollowersModalVisible(true);
    fetchModalData();
  };

  const handleNavigateToProfile = (username: string) => {
    navigation.navigate('UserProfile', { username });
  };

  const closeFollowersModal = () => {
    setFollowersModalVisible(false);
    setModalFollowers([]);
    setModalFollowing([]);
  };

  const navigateToPost = (postId: number) => {
    console.log('Navigating to post from profile:', postId);
    try {
      navigation.navigate('PostDetail', { postId });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити пост');
    }
  };

  // Обробка відписки в модальному вікні
  const handleUnfollow = async (targetUserId: string) => {
    if (!session) return;

    try {
      // Оновлюємо стан завантаження
      setModalFollowing(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowLoading: true }
          : user
      ));

      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Error unfollowing:', error);
        Alert.alert('Помилка', 'Не вдалося відписатися');
        return;
      }

      // Видаляємо користувача зі списку підписок
      setModalFollowing(prev => prev.filter(user => user.id !== targetUserId));
      
      // Оновлюємо лічильник
      setFollowStats(prev => ({
        ...prev,
        following_count: Math.max(0, prev.following_count - 1)
      }));

    } catch (error) {
      console.error('Error handling unfollow:', error);
      Alert.alert('Помилка', 'Щось пішло не так');
    } finally {
      // Видаляємо стан завантаження
      setModalFollowing(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowLoading: false }
          : user
      ));
    }
  };

  const renderPost = ({ item: post }: { item: UserPost }) => {
    // Отримуємо перше фото з образу
    const firstImage = post.outfits?.outfit_item?.[0]?.wardrobe?.photo_url;
    let imageUrl = null;

    if (firstImage) {
      const { data } = supabase.storage
        .from('clothes')
        .getPublicUrl(firstImage);
      imageUrl = data?.publicUrl;
    }

    return (
      <TouchableOpacity
        style={styles.postItem}
        onPress={() => navigateToPost(post.id)}
        activeOpacity={0.7}
      >
        <View style={styles.postImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.postImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📸</Text>
            </View>
          )}
        </View>
        
        <View style={styles.postInfo}>
          <View style={styles.weatherInfo}>
            {post.weather?.weather_icon && (
              <Image
                source={{ uri: `http://openweathermap.org/img/wn/${post.weather.weather_icon}.png` }}
                style={styles.weatherIcon}
              />
            )}
            <Text style={styles.temperature}>
              {Math.round(post.weather?.min_tempurature || 0)}°
            </Text>
            <Text style={styles.cityText}>{post.weather?.city}</Text>
          </View>
          
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Image
                source={require('../../assets/heart.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statText}>{post.likes_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Image
                source={require('../../assets/chat-bubble.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statText}>{post.comments_count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalUserItem = ({ item }: { item: UserFollower }) => {
    const isCurrentUser = session?.user?.id === item.id;
    const showUnfollowButton = modalInitialTab === 'following' && !isCurrentUser;

    return (
      <TouchableOpacity
        style={styles.modalUserItem}
        onPress={() => {
          closeFollowersModal();
          handleNavigateToProfile(item.username);
        }}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.avatar_url }} style={styles.modalAvatar} />
        
        <View style={styles.modalUserInfo}>
          <Text style={styles.modalUsername}>{item.username}</Text>
          {item.full_name && (
            <Text style={styles.modalFullName}>{item.full_name}</Text>
          )}
        </View>

        {showUnfollowButton && (
          <TouchableOpacity
            style={[
              styles.unfollowButton,
              item.isFollowLoading && styles.unfollowButtonLoading
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleUnfollow(item.id);
            }}
            disabled={item.isFollowLoading}
          >
            {item.isFollowLoading ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <Text style={styles.unfollowButtonText}>Відписатися</Text>
            )}
          </TouchableOpacity>
        )}

        {isCurrentUser && (
          <View style={styles.youLabel}>
            <Text style={styles.youLabelText}>Ви</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderModalEmptyState = () => {
    const isFollowersTab = modalInitialTab === 'followers';
    const emptyText = isFollowersTab 
      ? 'У вас поки немає фоловерів'
      : 'Ви поки ні на кого не підписані';

    return (
      <View style={styles.modalEmptyContainer}>
        <Text style={styles.modalEmptyText}>{emptyText}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text>Завантаження профілю...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Не вдалося завантажити профіль</Text>
        <Button text="Спробувати знову" onPress={fetchProfile} />
      </View>
    );
  }

  const currentModalData = modalInitialTab === 'followers' ? modalFollowers : modalFollowing;

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Заголовок профілю */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.fullName}>{profile.full_name || 'Не вказано'}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.description && (
              <Text style={styles.description}>{profile.description}</Text>
            )}
            {profile.website && (
              <Text style={styles.website}>{profile.website}</Text>
            )}
          </View>
        </View>

        {/* Розширена статистика */}
        <View style={styles.statsContainer}>
          <View style={styles.statItemContainer}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Постів</Text>
          </View>
          
          <TouchableOpacity style={styles.statItemContainer} onPress={navigateToFollowers}>
            <Text style={styles.statNumber}>{followStats.followers_count}</Text>
            <Text style={styles.statLabel}>Фоловерів</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statItemContainer} onPress={navigateToFollowing}>
            <Text style={styles.statNumber}>{followStats.following_count}</Text>
            <Text style={styles.statLabel}>Підписок</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statItemContainer} onPress={navigateToSavedPosts}>
            <Text style={styles.statNumber}>{savedPostsCount}</Text>
            <Text style={styles.statLabel}>Збережених</Text>
          </TouchableOpacity>
        </View>

        {/* Кнопки дій */}
        <View style={styles.actionsContainer}>
          <Button text="Редагувати профіль" onPress={navigateToEditProfile} />
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Вийти з акаунту</Text>
          </TouchableOpacity>
        </View>

        {/* Пости користувача */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Мої пости</Text>
          
          {postsLoading ? (
            <View style={styles.postsLoadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
              <Text>Завантаження постів...</Text>
            </View>
          ) : posts.length > 0 ? (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.postsRow}
              scrollEnabled={false}
              contentContainerStyle={styles.postsGrid}
            />
          ) : (
            <View style={styles.emptyPostsContainer}>
              <Text style={styles.emptyPostsText}>
                У вас ще немає постів
              </Text>
              <Text style={styles.emptyPostsSubtext}>
                Створіть свій перший образ та поділіться ним зі спільнотою!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Модальне вікно фоловерів та підписок */}
      <Modal
        visible={followersModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFollowersModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Заголовок модального вікна */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>@{profile.username}</Text>
            <TouchableOpacity onPress={closeFollowersModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Сегментований контрол */}
          <View style={styles.modalSegmentedControl}>
            <TouchableOpacity
              style={[
                styles.modalSegmentButton,
                modalInitialTab === 'followers' && styles.modalActiveSegmentButton
              ]}
              onPress={() => setModalInitialTab('followers')}
            >
              <Text style={[
                styles.modalSegmentButtonText,
                modalInitialTab === 'followers' && styles.modalActiveSegmentButtonText
              ]}>
                Фоловери ({modalFollowers.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalSegmentButton,
                modalInitialTab === 'following' && styles.modalActiveSegmentButton
              ]}
              onPress={() => setModalInitialTab('following')}
            >
              <Text style={[
                styles.modalSegmentButtonText,
                modalInitialTab === 'following' && styles.modalActiveSegmentButtonText
              ]}>
                Підписки ({modalFollowing.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Список користувачів */}
          {modalLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
              <Text style={styles.modalLoadingText}>Завантаження...</Text>
            </View>
          ) : (
            <FlatList
              data={currentModalData}
              renderItem={renderModalUserItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              contentContainerStyle={currentModalData.length === 0 ? styles.modalEmptyListContainer : undefined}
              ListEmptyComponent={renderModalEmptyState}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  profileInfo: {
    alignItems: 'center',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#1976d2',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  website: {
    fontSize: 14,
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItemContainer: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 15,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  postsLoadingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  postsGrid: {
    gap: 15,
  },
  postsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  postItem: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  postImageContainer: {
    aspectRatio: 1,
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
    fontSize: 32,
  },
  postInfo: {
    padding: 12,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherIcon: {
    width: 24,
    height: 24,
    marginRight: 4,
  },
  temperature: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cityText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 12,
    height: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  emptyPostsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyPostsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyPostsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Стилі модального вікна
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalSegmentedControl: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalSegmentButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalActiveSegmentButton: {
    borderBottomColor: '#1976d2',
  },
  modalSegmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modalActiveSegmentButtonText: {
    color: '#1976d2',
  },
  modalList: {
    flex: 1,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 16,
    color: '#666',
  },
  modalEmptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUsername: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  modalFullName: {
    fontSize: 13,
    color: '#666',
  },
  unfollowButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  unfollowButtonLoading: {
    opacity: 0.7,
  },
  unfollowButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  youLabel: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  youLabelText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
});

export default MyProfileScreen;