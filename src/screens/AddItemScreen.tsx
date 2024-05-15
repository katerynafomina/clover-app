import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { categories } from '../constants/Categoris';
import Button from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Alert } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native';

const AddItemScreen = () => {
    const [imageUrl, setImageUrl] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<number>();
  const [session, setSession] = useState<Session | null>(null)
  const [uploading, setUploading] = useState(false)
  const navigation = useNavigation() as NavigationProp<any>;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])


    async function uploadAvatar() {
    try {
      setUploading(true)

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restrict to only images
        allowsMultipleSelection: false, // Can only select one image
        allowsEditing: true, // Allows the user to crop / rotate their photo before uploading it
        quality: 1,
        exif: false, // We don't want nor need that data.
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picker.')
        return
      }

      const image = result.assets[0]
      console.log('Got image', image)

      if (!image.uri) {
        throw new Error('No image uri!') // Realistically, this should never happen, but just in case...
      }

      const arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer())

      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
      const path = `${Date.now()}.${fileExt}`
      const { data, error: uploadError } = await supabase.storage
        .from('clothes')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        })

      if (uploadError) {
        throw uploadError
      }
      setImageUrl(data.path)
      // onUpload(data.path)
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      } else {
        throw error
      }
    } finally {
      setUploading(false)
    }
  }
    

    const defaultImage = require('../assets/add-image.png');

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUrl(result.assets[0].uri);
        }
    };

    const handleCategoryChange = (itemValue: number) => {
        setSelectedCategory(itemValue);
        setShowPicker(false); // Close the picker after selection
    };

      const addItemToWardrobe = async() => {
        if (selectedCategory === undefined) {
          return; // Return early if selectedCategory is undefined
        }
         
        const { data, error } = await supabase
          .from('wardrobe')
          .insert([
            {
              user_id: `${session?.user.id}`,
              category: `${categories.find(category => category.id === selectedCategory)?.name}`,
              photo_url: `${imageUrl}`,
            },
          ])
          .select()
        if (error) {
          Alert.alert(error.message)
        } else {
          Alert.alert('Успішно додано!')
          navigation.goBack()
        }
    };
  

    return (
        <View style={styles.container}>
            <View style={styles.selectImage}>
                <Pressable onPress={pickImage}>
                    <Image source={imageUrl ? { uri: imageUrl } : defaultImage} style={styles.image} />
                </Pressable>
                <Pressable onPress={uploadAvatar}>
                    <Text style={styles.imageText}>Обрати фото</Text>
                </Pressable>
            </View>

            <Pressable onPress={() => setShowPicker(!showPicker)}>
                <Text style={styles.selectText}>
                    {selectedCategory ? categories.find(category => category.id === selectedCategory)?.name : 'Обрати категорію'}
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