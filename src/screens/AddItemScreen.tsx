import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { categories } from '../constants/Categoris';
import Button from '../components/Button';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

const AddItemScreen = () => {
    const [image, setImage] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<number>();
    

    const defaultImage = require('../assets/add-image.png');

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCategoryChange = (itemValue: number) => {
        setSelectedCategory(itemValue);
        setShowPicker(false); // Close the picker after selection
    };

    const addItemToWardrobe = () => {
       
    };

    return (
        <View style={styles.container}>
            <View style={styles.selectImage}>
                <Pressable onPress={pickImage}>
                    <Image source={image ? { uri: image } : defaultImage} style={styles.image} />
                </Pressable>
                <Pressable onPress={pickImage}>
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
