import React, { useState, useEffect } from 'react';
import { Category, categories } from '../constants/Categoris';
import Button from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import removeBackground from '../components/removeBack';
import { Alert, Image, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';

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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const processImage = async (path: string) => {
    try {
      console.log('Processing image:', imageUrl);
      const { data: image } = await supabase.storage
        .from('clothes')
        .getPublicUrl(path);

      const processedImagePath = await removeBackground(image.publicUrl);
      if (!processedImagePath) {
        throw new Error('Failed to process image background.');
      }
      console.log('Processed image path:', processedImagePath);
      setImageShown(processedImagePath);
      const base64Image = await FileSystem.readAsStringAsync(processedImagePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Base64 image:', processImage);

      const arrayBuffer = await fetch(processedImagePath).then((res) => res.arrayBuffer());

      const { data: processedUploadData, error: processedUploadError } = await supabase.storage
        .from('clothes')
        .upload(`${Date.now()}_processed.jpeg`, arrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (processedUploadError) {
        throw processedUploadError;
      }

      const processedImageUrl = processedUploadData?.path ?? '';

      setImageUrl(processedImageUrl);
      Alert.alert('Image uploaded and processed successfully!');

    } catch (error) {
      console.error('Upload and process image error:', error);
      Alert.alert('Failed to upload and process image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadAndProcessImage = async () => {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) {
        console.log('User cancelled image picker.');
        return;
      }

      const { uri } = result.assets[0];
      const image = result.assets[0];
      console.log('Image URI:', uri);
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} - ${response.statusText}`);
      }
      const arrayBuffer = await fetch(image.uri).then((res) => res.arrayBuffer());

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(path, arrayBuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        });
      console.log('Image uploaded:', data?.path);

      if (uploadError) {
        throw uploadError;
      }
      setImageUrl(data?.path);
      console.log('Image URL:', imageUrl);
      processImage(data?.path);

    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Failed to upload image. Please try again.');
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
      Alert.alert('Please select a category, subcategory and upload an image.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wardrobe')
        .insert({
          user_id: session?.user?.id,
          category: selectedCategory.name,
          subcategory: selectedSubcategory,
          photo_url: imageUrl,
        });

      if (error) {
        throw error;
      }
      setImageShown('');
      setSelectedCategory(null);
      setImageUrl('');
      Alert.alert('Item added to wardrobe successfully!');
    } catch (error) {
      console.error('Add item error:', error);
      Alert.alert('Failed to add item. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectImage}>
        <Pressable onPress={uploadAndProcessImage}>
          <Image source={imageShown ? { uri: imageShown } : require('../assets/add-image.png')} style={imageShown ? styles.image : [styles.image, { height: 150, width: 100, marginTop: 100 }]} />
        </Pressable>
        <Pressable onPress={uploadAndProcessImage}>
          <Text style={styles.imageText}>Обрати фото</Text>
        </Pressable>
      </View>

      <Pressable style={styles.categoryButton} onPress={() => setShowPicker(!showPicker)}>
        <Text style={styles.selectText}>
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

      <View style={{ marginTop: 'auto' }}>
        <Button text="Додати" onPress={addItemToWardrobe} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    borderBottomWidth:0.5,
    
  },
  selectText: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
  },
  categoryButton: {
    width: '100%',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 50,
    marginVertical: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    width: '100%',
    maxHeight: 200,
    marginTop: 10,
    marginBottom: 20,
  },
  card: {
    width: '100%',
    padding: 15,
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
    color: 'trancparent',
    fontWeight: 'bold',
  },
  selectImage: {
    alignItems: 'center',
    marginVertical: 20,
  },
});

export default AddItemScreen;
