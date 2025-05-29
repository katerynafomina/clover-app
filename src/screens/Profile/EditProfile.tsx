import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../components/Button';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  description: string | null;
  website: string | null;
}

const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile: initialProfile } = route.params as { profile: UserProfile };

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Form state
  const [username, setUsername] = useState(initialProfile.username || '');
  const [fullName, setFullName] = useState(initialProfile.full_name || '');
  const [description, setDescription] = useState(initialProfile.description || '');
  const [website, setWebsite] = useState(initialProfile.website || '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || DEFAULT_AVATAR_URL);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadAvatar(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Помилка', 'Не вдалося вибрати зображення');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!session?.user?.id) return;
  
    try {
      setAvatarUploading(true);
      
      const fileName = `${session.user.id}_${Date.now()}.jpg`;
      
      // Альтернативний спосіб з FormData
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
  
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false,
        });
  
      if (error) throw error;
  
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
  
      if (urlData) {
        setAvatarUrl(urlData.publicUrl);
        Alert.alert('Успішно', 'Фото профілю оновлено');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Помилка', 'Не вдалося завантажити фото');
    } finally {
      setAvatarUploading(false);
    }
  };

  const validateForm = () => {
    if (!username.trim()) {
      Alert.alert('Помилка', 'Нікнейм є обов\'язковим');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Помилка', 'Нікнейм повинен містити мінімум 3 символи');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Помилка', 'Нікнейм може містити тільки букви, цифри та підкреслення');
      return false;
    }

    if (website && !website.match(/^https?:\/\/.+/)) {
      Alert.alert('Помилка', 'Веб-сайт повинен починатися з http:// або https://');
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!session?.user?.id || !validateForm()) return;

    try {
      setLoading(true);

      // Перевіряємо чи нікнейм не зайнятий іншим користувачем
      if (username !== initialProfile.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', session.user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingUser) {
          Alert.alert('Помилка', 'Цей нікнейм вже зайнятий');
          return;
        }
      }

      // Визначаємо шлях до аватара
      let avatarPath = null;
      if (avatarUrl && avatarUrl !== DEFAULT_AVATAR_URL && avatarUrl.includes('supabase')) {
        // Витягуємо шлях з URL
        const urlParts = avatarUrl.split('/');
        avatarPath = urlParts[urlParts.length - 1];
      }

      // Оновлюємо профіль
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          description: description.trim() || null,
          website: website.trim() || null,
          avatar_url: avatarPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      Alert.alert('Успішно', 'Профіль оновлено', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Помилка', 'Не вдалося оновити профіль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Аватар */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.avatarOverlay}>
              {avatarUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.avatarOverlayText}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Натисніть, щоб змінити фото</Text>
        </View>

        {/* Форма */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Нікнейм *</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Введіть нікнейм"
              maxLength={20}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Мінімум 3 символи, тільки букви, цифри та _</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Повне ім'я</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Введіть повне ім'я"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Опис</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Розкажіть про себе..."
              maxLength={200}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{description.length}/200</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Веб-сайт</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com"
              maxLength={100}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Кнопки */}
        <View style={styles.buttonsSection}>
          <Button 
            text={loading ? "Збереження..." : "Зберегти зміни"} 
            onPress={saveProfile}
            disabled={loading || avatarUploading}
          />
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
            disabled={loading || avatarUploading}
          >
            <Text style={styles.cancelButtonText}>Скасувати</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    fontSize: 20,
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonsSection: {
    gap: 15,
    marginBottom: 40,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;