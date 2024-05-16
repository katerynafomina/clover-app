import React, { useState, useEffect } from 'react';
import { Category, categories } from '../constants/Categoris';
import Button from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import removeBackground from '../components/removeBack';
import { Alert } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';

const AddItemScreen = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageShown, setImageShown] = useState<string>('');
    const [showPicker, setShowPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<number>();
    const [session, setSession] = useState<Session | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileExt, setFileExt] = useState('');

   useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled ) {
                setImageUrl(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
        }
  };
  
  const prossesImage = async (path:string) => {
    try {
      console.log('Processing image:', imageUrl);
        const { data: image} = await supabase.storage
        .from('clothes')
        .getPublicUrl(path);
        // Process image to remove background
        const processedImagePath = await removeBackground(image.publicUrl);
        if (!processedImagePath) {
          throw new Error('Failed to process image background.');
        }
        console.log('Processed image path:', processedImagePath);
        // Read processed image as Base64
        const base64Image = await FileSystem.readAsStringAsync(processedImagePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('Base64 image:', base64Image);
        // Upload processed image (Base64) to storage
        const { data: processedUploadData, error: processedUploadError } = await supabase.storage
          .from('clothes')
          .upload(`${Date.now()}_processed.${'png'}`, base64Image, {
            contentType: 'image/png',
          });

        if (processedUploadError) {
          throw processedUploadError;
        }

        const processedImageUrl = processedUploadData?.path ?? '';

        // Set the processed image URL
        setImageUrl(processedImageUrl);
      Alert.alert('Image uploaded and processed successfully!');
      console.log()
      setImageShown(processedImageUrl);

      } catch (error) {
        console.error('Upload and process image error:', error);
        Alert.alert('Failed to upload and process image. Please try again.');
      } finally {
        setUploading(false);
      }
    }

  const uploadAndProcessImage = async () => {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
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
      const arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer())

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
      const path = `${Date.now()}.${fileExt}`
      const { data, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        })
      console.log('Image uploaded:', data?.path);
      
      if (uploadError) {
        throw uploadError
      }
      setImageUrl(data?.path);
      console.log('Image URL:', imageUrl);
      prossesImage(data?.path);
      
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Failed to upload image. Please try again.');
    };
    
  }

    const handleCategoryChange = (itemValue: number) => {
        setSelectedCategory(itemValue);
        setShowPicker(false); // Close the picker after selection
    };

    const addItemToWardrobe = async () => {
        if (selectedCategory === undefined || !imageUrl) {
            Alert.alert('Please select a category and upload an image.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('wardrobe')
                .insert({
                    user_id: session?.user?.id,
                    category: categories.find((category) => category.id === selectedCategory)?.name,
                    photo_url: imageUrl,
                });

            if (error) {
                throw error;
            }

            Alert.alert('Item added to wardrobe successfully!');
        } catch (error) {
            console.error('Add item error:', error);
            Alert.alert('Failed to add item. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.selectImage}>
                <Pressable onPress={pickImage}>
                    <Image source={imageShown ? { uri: imageShown } : require('../assets/add-image.png')} style={styles.image} />
                </Pressable>
                <Pressable onPress={uploadAndProcessImage}>
                    <Text style={styles.imageText}>Обрати фото</Text>
                </Pressable>
            </View>

            <Pressable onPress={() => setShowPicker(!showPicker)}>
                <Text style={styles.selectText}>
                    {selectedCategory ? categories.find((category) => category.id === selectedCategory)?.name : 'Обрати категорію'}
                </Text>
            </Pressable>

            {showPicker && (
                <ScrollView>
                    {categories.map((category) => (
                        <Pressable key={category.id} onPress={() => handleCategoryChange(category.id)}>
                            <Text style={category.id === selectedCategory ? styles.selectedCategory : styles.categories}>
                                {category.name}
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
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    image: {
        width: 300,
        height: 400,
        resizeMode: 'contain',
    },
    imageText: {
        textAlign: 'center',
        textTransform: 'uppercase',
        fontSize: 18,
        fontWeight: '500',
        borderWidth: 1,
        borderColor: 'black',
        borderRadius: 25,
        padding: 13,
    },
    selectText: {
        width: 250,
        marginTop: 20,
        paddingBottom: 10,
        fontSize: 20,
        color: 'black',
        borderBottomWidth: 1,
        borderBottomColor: 'black',
        textAlign: 'center',
    },
    categories: {
        width: 250,
        paddingBottom: 10,
        marginTop: 10,
        fontSize: 18,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'black',
    },
    selectedCategory: {
        width: 250,
        paddingBottom: 10,
        marginTop: 10,
        fontSize: 18,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'black',
        fontWeight: 'bold',
    },
    selectImage: {
        alignItems: 'center',
    },
});

export default AddItemScreen;
