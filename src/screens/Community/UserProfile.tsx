import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { RouteProp } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';

// Інтерфейси
interface OutfitItem {
  item_id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
  image?: string;
}

interface Comment {
  id: number;
  created_at: string;
  comment: string;
  user_id: string;
  post_id: number;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

interface Post {
  post_id: number;
  post_created_at: string;
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
  isLikeLoading?: boolean;
  isSaveLoading?: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  total_posts: number;
  total_likes: number;
  total_saves: number;
  total_comments: number;
  followers_count: number;
  following_count: number;
}

interface UserProfileScreenProps {
  route: RouteProp<{ params: { username: string } }, 'params'>;
  navigation: any;
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ route, navigation }) => {
  const { username } = route.params;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  
  // Стани для підписок
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Стани для коментарів
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostComments, setSelectedPostComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    // Отримуємо сесію
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    fetchUserProfile();
    fetchUserPosts();

    return () => subscription.unsubscribe();
  }, [username]);

  useEffect(() => {
    if (session && userProfile) {
      checkIfOwnProfile();
      if (!isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [session, userProfile]);

  // Перевірка чи це власний профіль
  const checkIfOwnProfile = async () => {
    if (!session || !userProfile) return;
    
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single();
    
    setIsOwnProfile(currentUserProfile?.username === username);
  };

  // Перевірка статусу підписки
  const checkFollowStatus = async () => {
    if (!session || !userProfile) return;

    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', userProfile.id)
        .single();

      if (!error && data) {
        setIsFollowing(true);
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  };

  // Отримання кількості фоловерів та підписок
  const fetchFollowCounts = async (userId: string) => {
    try {
      // Кількість фоловерів
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      // Кількість підписок
      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      return {
        followers_count: followersCount || 0,
        following_count: followingCount || 0
      };
    } catch (error) {
      console.error('Error fetching follow counts:', error);
      return {
        followers_count: 0,
        following_count: 0
      };
    }
  };

  // Обробка підписки/відписки
  const handleFollow = async () => {
    if (!session) {
      Alert.alert('Увага', 'Щоб підписатися, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    if (!userProfile) return;

    try {
      setIsFollowLoading(true);

      if (isFollowing) {
        // Відписуємося
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', userProfile.id);

        if (error) {
          console.error('Error unfollowing:', error);
          Alert.alert('Помилка', 'Не вдалося відписатися');
          return;
        }

        setIsFollowing(false);
        setUserProfile(prev => prev ? {
          ...prev,
          followers_count: Math.max(0, prev.followers_count - 1)
        } : null);

      } else {
        // Підписуємося
        const { error } = await supabase
          .from('followers')
          .insert([
            {
              follower_id: session.user.id,
              following_id: userProfile.id
            }
          ]);

        if (error) {
          console.error('Error following:', error);
          Alert.alert('Помилка', 'Не вдалося підписатися');
          return;
        }

        setIsFollowing(true);
        setUserProfile(prev => prev ? {
          ...prev,
          followers_count: prev.followers_count + 1
        } : null);
      }

    } catch (error) {
      console.error('Error handling follow:', error);
      Alert.alert('Помилка', 'Щось пішло не так');
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Навігація до списку фоловерів
  const navigateToFollowers = () => {
    if (!userProfile) return;
    navigation.navigate('UserFollowers', { 
      userId: userProfile.id, 
      username: userProfile.username,
      type: 'followers'
    });
  };

  // Навігація до списку підписок
  const navigateToFollowing = () => {
    if (!userProfile) return;
    navigation.navigate('UserFollowers', { 
      userId: userProfile.id, 
      username: userProfile.username,
      type: 'following'
    });
  };

  // Навігація до деталей поста
  const navigateToPostDetail = (postId: number) => {
    navigation.navigate('PostDetail', { postId });
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, updated_at, id')
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        Alert.alert('Помилка', 'Не вдалося завантажити профіль користувача');
        return;
      }

      let userCreatedAt = profile.updated_at;
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
        if (!authError && authUser?.user?.created_at) {
          userCreatedAt = authUser.user.created_at;
        }
      } catch (error) {
        console.log('Could not fetch auth user created_at, using updated_at');
      }

      const { data: userPostsForCount, error: postsCountError } = await supabase
        .from('posts')
        .select(`
          id,
          outfits!inner (
            profiles!inner (
              username
            )
          )
        `)
        .eq('outfits.profiles.username', username);

      if (postsCountError) {
        console.error('Error counting posts:', postsCountError);
      }

      const totalPosts = userPostsForCount?.length || 0;
      const postIds = userPostsForCount?.map(post => post.id) || [];

      let totalLikes = 0;
      let totalSaves = 0;
      let totalComments = 0;

      if (postIds.length > 0) {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);

        const { count: savesCount } = await supabase
          .from('saved_posts')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);

        totalLikes = likesCount || 0;
        totalSaves = savesCount || 0;
        totalComments = commentsCount || 0;
      }

      // Отримуємо кількість фоловерів та підписок
      const followCounts = await fetchFollowCounts(profile.id);

      let avatarUrl = profile.avatar_url;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const { data: avatarData } = await supabase.storage
          .from('avatars')
          .getPublicUrl(avatarUrl);
        
        if (avatarData) {
          avatarUrl = avatarData.publicUrl;
        }
      }

      setUserProfile({
        id: profile.id,
        username: profile.username,
        avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
        created_at: userCreatedAt || profile.updated_at,
        total_posts: totalPosts,
        total_likes: totalLikes,
        total_saves: totalSaves,
        total_comments: totalComments,
        followers_count: followCounts.followers_count,
        following_count: followCounts.following_count
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Помилка', 'Щось пішло не так при завантаженні профілю');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);

      const { data: posts, error } = await supabase
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
        .eq('outfits.profiles.username', username)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити пости користувача');
        return;
      }

      // Обробляємо пости з статистикою та перевіряємо взаємодію поточного користувача
      const postsWithStats = await Promise.all(
        (posts || []).map(async (post: any) => {
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

          // Перевіряємо чи лайкнув/зберіг поточний користувач
          let isLiked = false;
          let isSaved = false;

          if (session) {
            const { data: userLike } = await supabase
              .from('likes')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('post_id', post.id)
              .single();

            const { data: userSave } = await supabase
              .from('saved_posts')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('post_id', post.id)
              .single();

            isLiked = !!userLike;
            isSaved = !!userSave;
          }

          return {
            ...post,
            likes_count: likesCount || 0,
            saves_count: savesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: isLiked,
            is_saved: isSaved
          };
        })
      );

      // Трансформуємо дані
      const formattedPosts: Post[] = await Promise.all(
        postsWithStats.map(async (post: any) => {
          const outfitItemsWithImages = await Promise.all(
            (post.outfits.outfit_item || []).map(async (item: any) => {
              if (!item.wardrobe.photo_url) {
                return {
                  item_id: item.wardrobe.id,
                  photo_url: '',
                  category: item.wardrobe.category,
                  subcategory: item.wardrobe.subcategory
                };
              }

              const { data: imageData } = await supabase.storage
                .from('clothes')
                .getPublicUrl(item.wardrobe.photo_url);

              return {
                item_id: item.wardrobe.id,
                photo_url: imageData?.publicUrl || item.wardrobe.photo_url,
                category: item.wardrobe.category,
                subcategory: item.wardrobe.subcategory,
                image: imageData?.publicUrl
              };
            })
          );

          return {
            post_id: post.id,
            post_created_at: post.created_at,
            weather_type: post.outfits.weather.weather_type,
            min_tempurature: post.outfits.weather.min_tempurature,
            max_tempurature: post.outfits.weather.max_tempurature,
            weather_icon: post.outfits.weather.weather_icon,
            weather_date: post.outfits.weather.date,
            city: post.outfits.weather.city,
            outfit_items: outfitItemsWithImages,
            likes_count: post.likes_count,
            saves_count: post.saves_count,
            comments_count: post.comments_count,
            is_liked: post.is_liked,
            is_saved: post.is_saved
          };
        })
      );

      setUserPosts(formattedPosts);

    } catch (error) {
      console.error('Error fetching user posts:', error);
      Alert.alert('Помилка', 'Щось пішло не так при завантаженні постів');
    } finally {
      setPostsLoading(false);
    }
  };

  // Обробка лайків
  const handleLike = async (postId: number, event?: any) => {
    if (event) {
      event.stopPropagation(); // Зупиняємо поширення події
    }

    if (!session) {
      Alert.alert('Увага', 'Щоб поставити лайк, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    try {
      const post = userPosts.find(p => p.post_id === postId);
      if (!post) return;

      const isLiked = post.is_liked;

      setUserPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isLikeLoading: true }
            : p
        )
      );

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);

        if (error) {
          console.error('Error removing like:', error);
          Alert.alert('Помилка', 'Не вдалося видалити лайк');
          return;
        }
        
        setUserPosts(currentPosts => 
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
        const { error } = await supabase
          .from('likes')
          .insert([
            { user_id: session.user.id, post_id: postId }
          ]);

        if (error) {
          console.error('Error adding like:', error);
          Alert.alert('Помилка', 'Не вдалося додати лайк');
          return;
        }
        
        setUserPosts(currentPosts => 
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
    } finally {
      setUserPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isLikeLoading: false }
            : p
        )
      );
    }
  };

  // Обробка збережень
  const handleSave = async (postId: number, event?: any) => {
    if (event) {
      event.stopPropagation();
    }

    if (!session) {
      Alert.alert('Увага', 'Щоб зберегти пост, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    try {
      const post = userPosts.find(p => p.post_id === postId);
      if (!post) return;

      const isSaved = post.is_saved;

      setUserPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isSaveLoading: true }
            : p
        )
      );

      if (isSaved) {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);

        if (error) {
          console.error('Error removing from saved:', error);
          Alert.alert('Помилка', 'Не вдалося видалити пост зі збережених');
          return;
        }
        
        setUserPosts(currentPosts => 
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
        const { error } = await supabase
          .from('saved_posts')
          .insert([
            { user_id: session.user.id, post_id: postId }
          ]);

        if (error) {
          console.error('Error adding to saved:', error);
          Alert.alert('Помилка', 'Не вдалося додати пост до збережених');
          return;
        }
        
        setUserPosts(currentPosts => 
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
    } finally {
      setUserPosts(currentPosts => 
        currentPosts.map(p => 
          p.post_id === postId 
            ? { ...p, isSaveLoading: false }
            : p
        )
      );
    }
  };

  // Завантаження коментарів
  const fetchComments = async (postId: number) => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          created_at,
          comment,
          user_id,
          post_id,
          profiles!user_id (
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити коментарі');
        return;
      }

      const commentsWithAvatars = await Promise.all(
        (data || []).map(async (comment: any) => {
          let avatarUrl = comment.profiles.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: avatarData } = await supabase.storage
              .from('avatars')
              .getPublicUrl(avatarUrl);
            
            if (avatarData) {
              avatarUrl = avatarData.publicUrl;
            }
          }

          return {
            id: comment.id,
            created_at: comment.created_at,
            comment: comment.comment,
            user_id: comment.user_id,
            post_id: comment.post_id,
            user: {
              username: comment.profiles.username,
              avatar_url: avatarUrl || DEFAULT_AVATAR_URL
            }
          };
        })
      );

      setSelectedPostComments(commentsWithAvatars);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Помилка', 'Щось пішло не так при завантаженні коментарів');
    } finally {
      setLoadingComments(false);
    }
  };

  // Додавання коментаря
  const handleAddComment = async () => {
    if (!session) {
      Alert.alert('Увага', 'Щоб залишити коментар, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    if (!newComment.trim()) {
      Alert.alert('Увага', 'Коментар не може бути порожнім');
      return;
    }

    if (!selectedPost) return;

    try {
      setSubmittingComment(true);
      
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            user_id: session.user.id,
            post_id: selectedPost.post_id,
            comment: newComment.trim()
          }
        ])
        .select(`
          id,
          created_at,
          comment,
          user_id,
          post_id,
          profiles!user_id (
            username,
            avatar_url
          )
        `);

      if (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Помилка', 'Не вдалося додати коментар');
        return;
      }

      if (data && data[0]) {
        const newCommentData = data[0] as any;
        let avatarUrl = newCommentData.profiles.avatar_url;
        
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const { data: avatarData } = await supabase.storage
            .from('avatars')
            .getPublicUrl(avatarUrl);
          
          if (avatarData) {
            avatarUrl = avatarData.publicUrl;
          }
        }

        const formattedComment: Comment = {
          id: newCommentData.id,
          created_at: newCommentData.created_at,
          comment: newCommentData.comment,
          user_id: newCommentData.user_id,
          post_id: newCommentData.post_id,
          user: {
            username: newCommentData.profiles.username,
            avatar_url: avatarUrl || DEFAULT_AVATAR_URL
          }
        };

        setSelectedPostComments(prev => [...prev, formattedComment]);
        
        // Оновлюємо кількість коментарів у пості
        setUserPosts(currentPosts => 
          currentPosts.map(p => 
            p.post_id === selectedPost.post_id 
              ? { ...p, comments_count: p.comments_count + 1 }
              : p
          )
        );

        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Помилка', 'Щось пішло не так при додаванні коментаря');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Відкриття модального вікна коментарів
  const openCommentsModal = (post: Post, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedPost(post);
    setSelectedPostComments([]);
    setCommentsModalVisible(true);
    fetchComments(post.post_id);
  };

  // Закриття модального вікна коментарів
  const closeCommentsModal = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
    setSelectedPostComments([]);
    setNewComment('');
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: item.user.avatar_url || DEFAULT_AVATAR_URL }} 
        style={styles.commentAvatar}
        defaultSource={require('../../assets/icon.png')}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.user.username}</Text>
          <Text style={styles.commentDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.comment}</Text>
      </View>
    </View>
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
      {/* Інформація про погоду */}
      <View style={styles.weatherHeader}>
        <View style={styles.weatherInfo}>
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
        <Text style={styles.postDate}>
          {new Date(item.post_created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Образ */}
      <View style={styles.outfitSection}>
        <Text style={styles.outfitTitle}>Образ:</Text>
        <FlatList
          data={item.outfit_items}
          renderItem={renderOutfitItem}
          keyExtractor={(outfitItem) => outfitItem.item_id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.outfitList}
          scrollEnabled={false} // Вимикаємо скрол для кращого UX
        />
      </View>

      {/* Інтерактивна статистика */}
      <View style={styles.interactionButtons}>
        <TouchableOpacity 
          style={[
            styles.interactionButton, 
            item.is_liked && styles.activeButton,
            item.isLikeLoading && styles.loadingButton
          ]}
          onPress={(e) => handleLike(item.post_id, e)}
          disabled={item.isLikeLoading}
        >
          {item.isLikeLoading ? (
            <ActivityIndicator size="small" color="#1976d2" style={styles.buttonIcon} />
          ) : (
            <Image
              source={item.is_liked 
                ? require('../../assets/heart.png')
                : require('../../assets/heart_filled.png')
              }
              style={styles.buttonIconImage}
            />
          )}
          <Text style={[styles.buttonText, item.is_liked && styles.activeButtonText]}>
            {item.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={(e) => openCommentsModal(item, e)}
        >
          <Image
            source={require('../../assets/chat-bubble.png')}
            style={styles.buttonIconImage}
          />
          <Text style={styles.buttonText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.interactionButton, 
            item.is_saved && styles.activeButton,
            item.isSaveLoading && styles.loadingButton
          ]}
          onPress={(e) => handleSave(item.post_id, e)}
          disabled={item.isSaveLoading}
        >
          {item.isSaveLoading ? (
            <ActivityIndicator size="small" color="#1976d2" style={styles.buttonIcon} />
          ) : (
            <Image
              source={item.is_saved 
                ? require('../../assets/save_filled.png')
                : require('../../assets/save.png')
              }
              style={styles.buttonIconImage}
            />
          )}
          <Text style={[styles.buttonText, item.is_saved && styles.activeButtonText]}>
            {item.saves_count}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text>Завантаження профілю...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Користувача не знайдено</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок профілю */}
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: userProfile.avatar_url || DEFAULT_AVATAR_URL }} 
          style={styles.profileAvatar}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileUsername}>{userProfile.username}</Text>
          <Text style={styles.profileDate}>
            Приєднався: {new Date(userProfile.created_at).toLocaleDateString()}
          </Text>
          
          {/* Кнопка підписки */}
          {session && !isOwnProfile && (
            <TouchableOpacity 
              style={[
                styles.followButton, 
                isFollowing && styles.followingButton,
                isFollowLoading && styles.followButtonLoading
              ]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? 'Відписатися' : 'Підписатися'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Статистика профілю */}
      <View style={styles.profileStats}>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>{userProfile.total_posts}</Text>
          <Text style={styles.profileStatLabel}>Постів</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileStatItem}
          onPress={navigateToFollowers}
          activeOpacity={0.7}
        >
          <Text style={styles.profileStatNumber}>{userProfile.followers_count}</Text>
          <Text style={styles.profileStatLabel}>Фоловерів</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.profileStatItem}
          onPress={navigateToFollowing}
          activeOpacity={0.7}
        >
          <Text style={styles.profileStatNumber}>{userProfile.following_count}</Text>
          <Text style={styles.profileStatLabel}>Підписок</Text>
        </TouchableOpacity>
        
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>{userProfile.total_likes}</Text>
          <Text style={styles.profileStatLabel}>Лайків</Text>
        </View>
      </View>

      {/* Пости користувача */}
      <View style={styles.postsSection}>
        <Text style={styles.postsTitle}>Пости ({userProfile.total_posts})</Text>
        
        {postsLoading ? (
          <View style={styles.postsLoadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text>Завантаження постів...</Text>
          </View>
        ) : (
          <FlatList
            data={userPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.post_id.toString()}
            refreshing={postsLoading}
            onRefresh={fetchUserPosts}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={userPosts.length === 0 ? {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            } : undefined}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Цей користувач поки не опублікував жодного посту
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Модальне вікно коментарів */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCommentsModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Коментарі</Text>
            <TouchableOpacity onPress={closeCommentsModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
              <Text>Завантаження коментарів...</Text>
            </View>
          ) : (
            <FlatList
              data={selectedPostComments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id.toString()}
              style={styles.commentsList}
              contentContainerStyle={selectedPostComments.length === 0 ? {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center'
              } : undefined}
              ListEmptyComponent={() => (
                <View style={styles.emptyCommentsContainer}>
                  <Text style={styles.emptyCommentsText}>
                    Поки немає коментарів. Будьте першим!
                  </Text>
                </View>
              )}
            />
          )}

          {session && (
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Напишіть коментар..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || submittingComment) && styles.sendButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Відправити</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  followButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    minWidth: 100,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  followButtonLoading: {
    opacity: 0.7,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#666',
  },
  profileStats: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  profileStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  postsSection: {
    flex: 1,
    padding: 16,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  postsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
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
  },
  postContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  weatherInfo: {
    flex: 1,
  },
  cityText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  weatherType: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
    marginVertical: 2,
  },
  temperature: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  weatherIcon: {
    width: 50,
    height: 50,
    marginHorizontal: 12,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
  },
  outfitSection: {
    marginBottom: 16,
  },
  outfitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 6,
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
    marginTop: 2,
  },
  interactionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
    flex: 1,
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#e3f2fd',
  },
  loadingButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  buttonIconImage: {
    width: 16,
    height: 16,
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
  // Стилі модального вікна коментарів
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default UserProfileScreen;