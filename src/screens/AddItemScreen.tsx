import React, { useState, useEffect } from 'react';
import { Category, categories } from '../constants/Categoris';
import Button from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Alert, Image, Pressable, StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';

const AddItemScreen = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageShown, setImageShown] = useState<string>('');
  const [showPicker, setShowPicker] = useState(false);
  const [showSubPicker, setSubShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const uploadImage = async () => {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) {
        console.log('User cancelled image picker.');
        setUploading(false);
        return;
      }

      const { uri } = result.assets[0];
      console.log('Image URI:', uri);
      
      // Показуємо вибране зображення відразу
      setImageShown(uri);
      
      // Завантажуємо файл у Supabase Storage
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const filePath = `images/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(filePath, arrayBuffer, { contentType: `image/${fileExt}` });

      if (uploadError) {
        throw uploadError;
      }

      console.log('Image uploaded:', data?.path);
      
      // Отримуємо публічний URL для завантаженого зображення
      const { data: publicUrlData } = await supabase.storage
        .from('clothes')
        .getPublicUrl(data?.path || '');
        
      console.log('Public URL:', publicUrlData.publicUrl);
      
      // Зберігаємо шлях до файлу для подальшого використання
      setImageUrl(data?.path || '');
      
      Alert.alert('Успішно', 'Зображення завантажено');

    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Помилка', 'Не вдалося завантажити зображення. Спробуйте ще раз.');
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setShowPicker(false);
    setSubShowPicker(true);
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSubShowPicker(false);
  };

  const addItemToWardrobe = async () => {
    if (!selectedCategory || !selectedSubcategory || !imageUrl) {
      Alert.alert('Помилка', 'Будь ласка, виберіть категорію, підкатегорію та завантажте зображення.');
      return;
    }

    if (!session?.user?.id) {
      Alert.alert('Помилка', 'Вам потрібно увійти в систему, щоб додати річ до гардеробу.');
      return;
    }

    try {
      setUploading(true);

      const { data, error } = await supabase
        .from('wardrobe')
        .insert({
          user_id: session.user.id,
          category: selectedCategory.name,
          subcategory: selectedSubcategory,
          photo_url: imageUrl,
          "isAvailable": true // Додаємо поле isAvailable із значенням true за замовчуванням
        });

      if (error) {
        throw error;
      }

      // Очищаємо форму після успішного додавання
      setImageShown('');
      setImageUrl('');
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      
      Alert.alert('Успішно', 'Річ додано до вашого гардеробу!');
    } catch (error) {
      console.error('Add item error:', error);
      Alert.alert('Помилка', 'Не вдалося додати річ. Спробуйте ще раз.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectImage}>
        {uploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>Завантаження...</Text>
          </View>
        ) : (
          <>
            <Pressable onPress={uploadImage}>
              <Image 
                source={imageShown ? { uri: imageShown } : require('../assets/add-image.png')} 
                style={imageShown ? styles.image : [styles.image, { height: 150, width: 100, marginTop: 100 }]} 
              />
            </Pressable>
            <Pressable onPress={uploadImage}>
              <Text style={styles.imageText}>Обрати фото</Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable 
        style={[styles.categoryButton, !imageShown && styles.disabledButton]} 
        onPress={() => imageShown ? setShowPicker(!showPicker) : null}
        disabled={!imageShown}
      >
        <Text style={[styles.selectText, !imageShown && styles.disabledText]}>
          {selectedCategory ? selectedCategory.name : 'Обрати категорію'}
        </Text>
      </Pressable>

      {showPicker && (
        <ScrollView style={styles.scrollView}>
          {categories.map((category) => (
            <Pressable key={category.id} style={styles.card} onPress={() => handleCategoryChange(category)}>
              <Text style={category.id === selectedCategory?.id ? styles.selectedCategory : styles.categories}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {selectedCategory && (
        <Pressable style={styles.categoryButton} onPress={() => setSubShowPicker(!showSubPicker)}>
          <Text style={styles.selectText}>
            {selectedSubcategory ? selectedSubcategory : 'Обрати підкатегорію'}
          </Text>
        </Pressable>
      )}

      {showSubPicker && selectedCategory && (
        <ScrollView style={styles.scrollView}>
          {selectedCategory.subcategories.map((subcategory) => (
            <Pressable key={subcategory} style={styles.card} onPress={() => handleSubcategoryChange(subcategory)}>
              <Text style={subcategory === selectedSubcategory ? styles.selectedCategory : styles.categories}>
                {subcategory}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttonContainer}>
        <Button 
          text={uploading ? "Завантаження..." : "Додати"} 
          onPress={addItemToWardrobe} 
          disabled={uploading || !imageUrl || !selectedCategory || !selectedSubcategory}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    gap: 16,
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  imageText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'black',
    marginVertical: 10,
    textTransform: 'lowercase',
    borderBottomWidth: 0.5,
  },
  selectText: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
  },
  disabledText: {
    color: '#999',
  },
  categoryButton: {
    width: '100%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 50,
    marginVertical: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    borderColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    width: '100%',
    maxHeight: 200,
    marginTop: 10,
    marginBottom: 20,
  },
  card: {
    width: '100%',
    padding: 12,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categories: {
    fontSize: 16,
    color: 'black',
  },
  selectedCategory: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  selectImage: {
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    width: '100%',
    marginBottom: 20,
  },
});

export default AddItemScreen;