import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { RouteProp } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

// Інтерфейси
interface OutfitItem {
  item_id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
  image?: string;
  cell_id?: string;
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
  likes_count: number;
  is_liked: boolean;
  isLikeLoading?: boolean;
}

interface PostDetail {
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
  isLikeLoading?: boolean;
  isSaveLoading?: boolean;
}

// Інтерфейс для збереженої комірки
interface SavedOutfitCell {
  id: number;
  cell_id: string;
  column_number: 1 | 2;
  flex_size: number;
  position_index: number;
  subcategories: string[];
  current_item_index: number;
  is_recommended: boolean;
  items: OutfitItem[];
}

interface PostDetailScreenProps {
  route: RouteProp<{ params: { postId: number } }, 'params'>;
  navigation: any;
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ route, navigation }) => {
  const { postId } = route.params;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [outfitCells, setOutfitCells] = useState<SavedOutfitCell[]>([]);

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

    fetchPostDetail();
    fetchComments();

    return () => subscription.unsubscribe();
  }, [postId]);

  const fetchPostDetail = async () => {
    try {
      setLoading(true);

      const { data: postData, error } = await supabase
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
              cell_id,
              wardrobe (
                id,
                photo_url,
                category,
                subcategory
              )
            )
          )
        `)
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error fetching post:', error);
        Alert.alert('Помилка', 'Не вдалося завантажити пост');
        navigation.goBack();
        return;
      }

      if (!postData) {
        Alert.alert('Помилка', 'Пост не знайдено');
        navigation.goBack();
        return;
      }

      // Отримуємо статистику поста
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      const { count: savesCount } = await supabase
        .from('saved_posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      // Перевіряємо взаємодію поточного користувача
      let isLiked = false;
      let isSaved = false;

      if (session) {
        const { data: userLike } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('post_id', postId)
          .single();

        const { data: userSave } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('post_id', postId)
          .single();

        isLiked = !!userLike;
        isSaved = !!userSave;
      }

      // Обробляємо аватар
      let avatarUrl = postData.outfits.profiles.avatar_url;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const { data: avatarData } = await supabase.storage
          .from('avatars')
          .getPublicUrl(avatarUrl);
        
        if (avatarData) {
          avatarUrl = avatarData.publicUrl;
        }
      }

      // Обробляємо зображення одягу
      const outfitItemsWithImages = await Promise.all(
        (postData.outfits.outfit_item || []).map(async (item: any) => {
          if (!item.wardrobe.photo_url) {
            return {
              item_id: item.wardrobe.id,
              photo_url: '',
              category: item.wardrobe.category,
              subcategory: item.wardrobe.subcategory,
              cell_id: item.cell_id
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
            image: imageData?.publicUrl,
            cell_id: item.cell_id
          };
        })
      );

      const formattedPost: PostDetail = {
        post_id: postData.id,
        post_created_at: postData.created_at,
        username: postData.outfits.profiles.username,
        avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
        weather_type: postData.outfits.weather.weather_type,
        min_tempurature: postData.outfits.weather.min_tempurature,
        max_tempurature: postData.outfits.weather.max_tempurature,
        weather_icon: postData.outfits.weather.weather_icon,
        weather_date: postData.outfits.weather.date,
        city: postData.outfits.weather.city,
        outfit_items: outfitItemsWithImages,
        likes_count: likesCount || 0,
        saves_count: savesCount || 0,
        comments_count: commentsCount || 0,
        is_liked: isLiked,
        is_saved: isSaved
      };

      setPost(formattedPost);

      // Завантажуємо збережений layout комірок
      await fetchOutfitCells(postData.outfits.id, outfitItemsWithImages);

    } catch (error) {
      console.error('Error fetching post detail:', error);
      Alert.alert('Помилка', 'Щось пішло не так при завантаженні поста');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchOutfitCells = async (outfitId: number, outfitItems: OutfitItem[]) => {
    try {
      const { data: cellsData, error } = await supabase
        .from('outfit_cells')
        .select('*')
        .eq('outfit_id', outfitId)
        .order('position_index', { ascending: true });

      if (error) {
        console.error('Error fetching outfit cells:', error);
        // Якщо немає збережених комірок, використовуємо fallback відображення
        setOutfitCells([]);
        return;
      }

      if (cellsData && cellsData.length > 0) {
        // Відтворюємо збережений layout
        const reconstructedCells: SavedOutfitCell[] = cellsData.map(cellData => {
          // Знаходимо елементи для цієї комірки
          const cellItems = outfitItems.filter(item => item.cell_id === cellData.cell_id);
          
          return {
            id: cellData.id,
            cell_id: cellData.cell_id,
            column_number: cellData.column_number as 1 | 2,
            flex_size: cellData.flex_size,
            position_index: cellData.position_index,
            subcategories: cellData.subcategories || [],
            current_item_index: cellData.current_item_index,
            is_recommended: cellData.is_recommended,
            items: cellItems
          };
        });

        setOutfitCells(reconstructedCells);
      } else {
        // Fallback до простого відображення
        setOutfitCells([]);
      }
    } catch (error) {
      console.error('Error fetching outfit cells:', error);
      setOutfitCells([]);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
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
        return;
      }

      // Отримуємо інформацію про лайки коментарів
      const commentsWithLikes = await Promise.all(
        (data || []).map(async (comment: any) => {
          // Рахуємо лайки для коментаря
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

          // Перевіряємо чи поточний користувач лайкнув коментар
          let isLiked = false;
          if (session) {
            const { data: userLike } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('comment_id', comment.id)
              .single();
            
            isLiked = !!userLike;
          }

          // Обробляємо аватар
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
            },
            likes_count: likesCount || 0,
            is_liked: isLiked
          };
        })
      );

      setComments(commentsWithLikes);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Навігація до профілю користувача
  const navigateToUserProfile = (username: string) => {
    navigation.navigate('UserProfile', { username });
  };

  // Обробка лайків постів
  const handleLike = async () => {
    if (!session) {
      Alert.alert('Увага', 'Щоб поставити лайк, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    if (!post) return;

    try {
      const isLiked = post.is_liked;

      setPost(currentPost => 
        currentPost ? { ...currentPost, isLikeLoading: true } : null
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
        
        setPost(currentPost => 
          currentPost ? { 
            ...currentPost, 
            is_liked: false, 
            likes_count: currentPost.likes_count > 0 ? currentPost.likes_count - 1 : 0,
            isLikeLoading: false
          } : null
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
        
        setPost(currentPost => 
          currentPost ? { 
            ...currentPost, 
            is_liked: true, 
            likes_count: currentPost.likes_count + 1,
            isLikeLoading: false
          } : null
        );
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці лайка');
    } finally {
      setPost(currentPost => 
        currentPost ? { ...currentPost, isLikeLoading: false } : null
      );
    }
  };

  // Обробка лайків коментарів
  const handleCommentLike = async (commentId: number) => {
    if (!session) {
      Alert.alert('Увага', 'Щоб поставити лайк, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      // Оновлюємо стан завантаження
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === commentId 
            ? { ...c, isLikeLoading: true }
            : c
        )
      );

      const isLiked = comment.is_liked;

      if (isLiked) {
        // Видаляємо лайк
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('comment_id', commentId);

        if (error) {
          console.error('Error removing comment like:', error);
          Alert.alert('Помилка', 'Не вдалося видалити лайк з коментаря');
          return;
        }

        // Оновлюємо стан
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId 
              ? { 
                  ...c, 
                  is_liked: false, 
                  likes_count: c.likes_count > 0 ? c.likes_count - 1 : 0,
                  isLikeLoading: false
                }
              : c
          )
        );
      } else {
        // Додаємо лайк
        const { error } = await supabase
          .from('comment_likes')
          .insert([
            { user_id: session.user.id, comment_id: commentId }
          ]);

        if (error) {
          console.error('Error adding comment like:', error);
          Alert.alert('Помилка', 'Не вдалося додати лайк до коментаря');
          return;
        }

        // Оновлюємо стан
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId 
              ? { 
                  ...c, 
                  is_liked: true, 
                  likes_count: c.likes_count + 1,
                  isLikeLoading: false
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error handling comment like:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці лайка коментаря');
    } finally {
      // Видаляємо стан завантаження у випадку помилки
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === commentId 
            ? { ...c, isLikeLoading: false }
            : c
        )
      );
    }
  };

  // Обробка збережень
  const handleSave = async () => {
    if (!session) {
      Alert.alert('Увага', 'Щоб зберегти пост, необхідно увійти в систему');
      navigation.navigate('Auth');
      return;
    }

    if (!post) return;

    try {
      const isSaved = post.is_saved;

      setPost(currentPost => 
        currentPost ? { ...currentPost, isSaveLoading: true } : null
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
        
        setPost(currentPost => 
          currentPost ? { 
            ...currentPost, 
            is_saved: false, 
            saves_count: currentPost.saves_count > 0 ? currentPost.saves_count - 1 : 0,
            isSaveLoading: false
          } : null
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
        
        setPost(currentPost => 
          currentPost ? { 
            ...currentPost, 
            is_saved: true, 
            saves_count: currentPost.saves_count + 1,
            isSaveLoading: false
          } : null
        );
      }
    } catch (error) {
      console.error('Error handling save:', error);
      Alert.alert('Помилка', 'Щось пішло не так при обробці збереження');
    } finally {
      setPost(currentPost => 
        currentPost ? { ...currentPost, isSaveLoading: false } : null
      );
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

    try {
      setSubmittingComment(true);
      
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            user_id: session.user.id,
            post_id: postId,
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
          },
          likes_count: 0,
          is_liked: false
        };

        setComments(prev => [...prev, formattedComment]);
        
        // Оновлюємо кількість коментарів у пості
        setPost(currentPost => 
          currentPost ? { 
            ...currentPost, 
            comments_count: currentPost.comments_count + 1 
          } : null
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

  // Рендер збереженої комірки (відтворюємо оригінальний дизайн)
  const renderSavedCell = (cell: SavedOutfitCell) => {
    const cellHeight = cell.flex_size * 120;
    const currentItem = cell.items[cell.current_item_index] || cell.items[0];

    return (
      <View 
        key={cell.cell_id}
        style={[
          styles.cell,
          { height: cellHeight, minHeight: 120 }
        ]}
      >
        {/* Заголовок категорії */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryHeaderText}>
            {cell.subcategories[0] || 'Категорія'}
          </Text>
        </View>

        {/* Контент комірки */}
        <View style={styles.cellContent}>
          {currentItem && currentItem.image ? (
            <Image 
              source={{ uri: currentItem.image }} 
              style={styles.cellImage}
              defaultSource={require('../../assets/icon.png')}
            />
          ) : (
            <View style={styles.emptyCellContent}>
              <Text style={styles.emptyCellText}>?</Text>
            </View>
          )}
        </View>

        {/* Індикатор множинних елементів */}
        {cell.items.length > 1 && (
          <View style={styles.multipleItemsIndicator}>
            <Text style={styles.multipleItemsText}>+{cell.items.length - 1}</Text>
          </View>
        )}
      </View>
    );
  };

  // Fallback рендер категорії (якщо немає збережених комірок)
  const renderCategory = (category: string, items: OutfitItem[]) => {
    return (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <View style={styles.categoryItems}>
          {items.map((item, index) => (
            <View key={`${item.item_id}-${index}`} style={styles.outfitItem}>
              <Image 
                source={{ uri: item.image || item.photo_url }} 
                style={styles.outfitItemImage}
                defaultSource={require('../../assets/icon.png')}
              />
              {item.subcategory && (
                <Text style={styles.subcategoryText}>{item.subcategory}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderComment = (comment: Comment) => (
    <View key={comment.id} style={styles.commentItem}>
      <TouchableOpacity onPress={() => navigateToUserProfile(comment.user.username)}>
        <Image 
          source={{ uri: comment.user.avatar_url || " "}} 
          style={styles.commentAvatar}
          defaultSource={require('../../assets/icon.png')}
        />
      </TouchableOpacity>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <TouchableOpacity onPress={() => navigateToUserProfile(comment.user.username)}>
            <Text style={styles.commentUsername}>{comment.user.username}</Text>
          </TouchableOpacity>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.comment}</Text>
        
        {/* Кнопка лайка коментаря */}
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={[
              styles.commentLikeButton,
              comment.is_liked && styles.commentLikeButtonActive
            ]}
            onPress={() => handleCommentLike(comment.id)}
            disabled={comment.isLikeLoading}
          >
            {comment.isLikeLoading ? (
              <ActivityIndicator size="small" color="#1976d2" style={styles.commentLikeIcon} />
            ) : (
              <Image
                source={comment.is_liked 
                  ? require('../../assets/heart.png')
                  : require('../../assets/heart_filled.png')
                }
                style={styles.commentLikeIcon}
              />
            )}
            <Text style={[
              styles.commentLikeText,
              comment.is_liked && styles.commentLikeTextActive
            ]}>
              {comment.likes_count > 0 ? comment.likes_count : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text>Завантаження поста...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Пост не знайдено</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Якщо є збережені комірки - використовуємо їх, інакше fallback
  const hasStoredLayout = outfitCells.length > 0;
  const column1Cells = outfitCells.filter(cell => cell.column_number === 1);
  const column2Cells = outfitCells.filter(cell => cell.column_number === 2);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Заголовок з користувачем */}
      <View style={styles.userHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => navigateToUserProfile(post.username)}
        >
          <Image 
            source={{ uri: post.avatar_url || "" }} 
            style={styles.userAvatar}
            defaultSource={require('../../assets/icon.png')}
          />
          <View>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.postDate}>
              {new Date(post.post_created_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Погодна інформація */}
      <View style={styles.weatherSection}>
        <View style={styles.weatherHeader}>
          <Text style={styles.weatherTitle}>Погода в {post.city}</Text>
          <Text style={styles.weatherDate}>
            {new Date(post.weather_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.weatherContent}>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherType}>{post.weather_type}</Text>
            <Text style={styles.temperature}>
              {Math.round(post.min_tempurature)}° - {Math.round(post.max_tempurature)}°C
            </Text>
          </View>
          {post.weather_icon && (
            <Image 
              source={{ uri: `http://openweathermap.org/img/wn/${post.weather_icon}@2x.png` }} 
              style={styles.weatherIcon} 
            />
          )}
        </View>
      </View>

      {/* Секція з образом */}
      <View style={styles.outfitSection}>
        <Text style={styles.outfitTitle}>
          Образ ({post.outfit_items.length} елементів)
          {hasStoredLayout && <Text style={styles.layoutIndicator}> • Збережений layout</Text>}
        </Text>
        
        {post.outfit_items.length > 0 ? (
          hasStoredLayout ? (
            // Відтворюємо збережений layout з Home
            <View style={styles.outfitBuilder}>
              <View style={styles.columnsContainer}>
                {/* Колонка 1 */}
                <View style={styles.column}>
                  {column1Cells.map(renderSavedCell)}
                </View>
                
                {/* Колонка 2 */}
                <View style={styles.column}>
                  {column2Cells.map(renderSavedCell)}
                </View>
              </View>
            </View>
          ) : (
            // Fallback відображення
            <View style={styles.outfitDisplay}>
              {Object.entries(
                post.outfit_items.reduce((acc, item) => {
                  const category = item.category;
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(item);
                  return acc;
                }, {} as Record<string, OutfitItem[]>)
              ).map(([category, items]) => renderCategory(category, items))}
            </View>
          )
        ) : (
          <View style={styles.emptyOutfitContainer}>
            <Text style={styles.emptyOutfitText}>Образ порожній</Text>
          </View>
        )}
      </View>

      {/* Кнопки взаємодії */}
      <View style={styles.interactionSection}>
        <TouchableOpacity 
          style={[
            styles.interactionButton, 
            styles.likeButton,
            post.is_liked && styles.activeButton
          ]}
          onPress={handleLike}
          disabled={post.isLikeLoading}
        >
          {post.isLikeLoading ? (
            <ActivityIndicator size="small" color="#1976d2" style={styles.buttonIcon} />
          ) : (
            <Image
              source={post.is_liked 
                ? require('../../assets/heart.png')
                : require('../../assets/heart_filled.png')
              }
              style={styles.buttonIconImage}
            />
          )}
          <Text style={[styles.buttonText, post.is_liked && styles.activeButtonText]}>
            {post.likes_count} лайків
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.interactionButton,
            styles.saveButton,
            post.is_saved && styles.activeButton
          ]}
          onPress={handleSave}
          disabled={post.isSaveLoading}
        >
          {post.isSaveLoading ? (
            <ActivityIndicator size="small" color="#1976d2" style={styles.buttonIcon} />
          ) : (
            <Image
              source={post.is_saved 
                ? require('../../assets/save_filled.png')
                : require('../../assets/save.png')
              }
              style={styles.buttonIconImage}
            />
          )}
          <Text style={[styles.buttonText, post.is_saved && styles.activeButtonText]}>
            {post.saves_count} збережень
          </Text>
        </TouchableOpacity>
      </View>

      {/* Секція коментарів */}
      <View style={styles.commentsSection}>
        <View style={styles.commentsSectionHeader}>
          <Image
            source={require('../../assets/chat-bubble.png')}
            style={styles.commentsSectionIcon}
          />
          <Text style={styles.commentsTitle}>
            Коментарі ({post.comments_count})
          </Text>
        </View>

        {/* Поле для додавання коментаря */}
        {session && (
          <View style={styles.addCommentSection}>
            <Image 
              source={{ uri: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR_URL }} 
              style={styles.currentUserAvatar}
              defaultSource={require('../../assets/icon.png')}
            />
            <View style={styles.commentInputContainer}>
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
          </View>
        )}

        {/* Список коментарів */}
        <View style={styles.commentsList}>
          {commentsLoading ? (
            <View style={styles.commentsLoadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
              <Text>Завантаження коментарів...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyCommentsContainer}>
              <Text style={styles.emptyCommentsText}>
                Поки немає коментарів. Будьте першим!
              </Text>
            </View>
          ) : (
            comments.map(renderComment)
          )}
        </View>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
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
  userHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  postDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  weatherSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  weatherDate: {
    fontSize: 12,
    color: '#666',
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherType: {
    fontSize: 18,
    color: '#333',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  temperature: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  weatherIcon: {
    width: 80,
    height: 80,
  },
  outfitSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  layoutIndicator: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'normal',
  },
  // Стилі для збереженого layout (як в Home)
  outfitBuilder: {
    paddingHorizontal: 4,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 15,
    minHeight: 400,
  },
  column: {
    flex: 1,
    gap: 15,
  },
  cell: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  categoryHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  cellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  cellImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'contain',
  },
  emptyCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCellText: {
    fontSize: 32,
    color: '#bbb',
    fontWeight: 'bold',
  },
  multipleItemsIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  multipleItemsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Стилі для fallback відображення
  outfitDisplay: {
    gap: 20,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryItems: {
    alignItems: 'center',
    gap: 12,
  },
  outfitItem: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    width: 200,
  },
  outfitItemImage: {
    width: 160,
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyOutfitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyOutfitText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  interactionSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    flex: 0.45,
    justifyContent: 'center',
  },
  likeButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
  activeButton: {
    backgroundColor: '#e3f2fd',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonIconImage: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeButtonText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  commentsSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentsSectionIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentInputContainer: {
    flex: 1,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
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
  commentsList: {
    minHeight: 100,
  },
  commentsLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyCommentsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
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
    color: '#1976d2',
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  // Нові стилі для лайків коментарів
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  commentLikeButtonActive: {
    backgroundColor: '#fff3e0',
  },
  commentLikeIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  commentLikeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  commentLikeTextActive: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
});

export default PostDetailScreen;