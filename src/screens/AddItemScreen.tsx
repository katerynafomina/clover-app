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

        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`Failed to fetch image first: ${response.status} - ${response.statusText}`);
        }
        console.log('response: ',response)
        const blob = await response.blob();

        const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `${Date.now()}.${fileExt}`;
        console.log('path: ',path)
        // Upload original image to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('clothes_temp')
            .upload(path, blob, {
                contentType: 'image/png',
            });

        if (uploadError) {
            throw uploadError;
        }

        // Process image to remove background
        const processedImagePath = await removeBackground(uploadData?.path ?? '');
        if (!processedImagePath) {
            throw new Error('Failed to process image background.');
        }
        console.log('processedImagePath: ',processedImagePath)
        // Upload processed image to storage
        const processedImageBlob = await FileSystem.readAsStringAsync(processedImagePath, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const processedImageExt = processedImagePath.split('.').pop()?.toLowerCase() ?? 'jpg';
        const processedImagePathInStorage = `processed_${Date.now()}.${processedImageExt}`;
        console.log('processedImagePathInStorage: ',processedImagePathInStorage)
        const { data: processedUploadData, error: processedUploadError } = await supabase.storage
            .from('clothes_temp')
            .upload(processedImagePathInStorage, processedImageBlob, {
                contentType: 'image/jpeg',
            });

        if (processedUploadError) {
            throw processedUploadError;
        }

        const processedImageUrl = processedUploadData?.path ?? '';

        // Set the processed image URL
        setImageUrl(processedImageUrl);
        Alert.alert('Image uploaded and processed successfully!');

    } catch (error) {
        console.error('Upload and process image error:', error);
        Alert.alert('Failed to upload and process image. Please try again.');
    } finally {
        setUploading(false);
    }
};



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
                    <Image source={imageUrl ? { uri: imageUrl } : require('../assets/add-image.png')} style={styles.image} />
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
