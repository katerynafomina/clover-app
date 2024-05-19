import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Alert, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { FileObject } from '@supabase/storage-js'

type CategoryDetailsScreenParams = {
    CategoryName: {
        category: string;
    };
};
type CategoryDetailsRouteProp = RouteProp<CategoryDetailsScreenParams, 'CategoryName'>;

const CategoryDetailsScreen = ({ route }: { route: CategoryDetailsRouteProp }) => {
    const [session, setSession] = useState<Session | null>(null);
    const { category } = route.params;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])


    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            if (!session || !session.user || !category) {
                return; // Exit early if session or category is not available
            }

            const userId = session.user.id;
            try {
                const { data: wardrobe, error } = await supabase
                    .from('wardrobe')
                    .select('id, photo_url, category, user_id')
                    .eq('category', category)
                    .eq('user_id', userId);

                if (error) {
                    console.error('Error fetching wardrobe items:', error.message);
                } else {
                    // Update wardrobe items with public URLs for images
                    const itemsWithUrls = await Promise.all(
                        wardrobe.map(async (item) => {
                            const { data } = await supabase.storage
                                .from('clothes')
                                .getPublicUrl(item.photo_url);

                            return { ...item, image: data?.publicUrl };
                        })
                    );

                    setWardrobeItems(itemsWithUrls);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching wardrobe items:', error);
            }
        };

        fetchItems();
    }, [category, session]);


    const renderItem = ({ item }: { item: any }) => (
        // <View style={styles.item}>
            <TouchableOpacity onLongPress={() => handleLongPress(item)} style={styles.item}>
                <Image source={{ uri: item.image }} style={styles.image} />
            </TouchableOpacity>
        // </View>
    );
    const handleLongPress = (item: any) => {
        Alert.alert(
            'Підтвердіть видалення',
            'Ви впевнені, що хочете видалити цей елемент одягу?',
            [
                {
                    text: 'Скасувати',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: () => deleteItem(item.id),
                },
            ],
            { cancelable: false }
        );
    };

    const deleteItem = async (itemId: number) => {
        try {
            const { error } = await supabase
                .from('wardrobe')
                .delete()
                .eq('id', itemId);

            if (error) {
                console.error('Error deleting item:', error.message);
            } else {
                // Remove the item from the local state
                setWardrobeItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };
    
    return (
        <View style={styles.container}>
            {/* <Text style={styles.title}>{category ? category : 'Назва категорії не знайдена'}</Text> */}
                {loading ? (
                    <Text>Loading...</Text>
                ) : wardrobeItems.length === 0 ? (
                    <Text>Немає одягу даної категорії: {category}</Text>
                ) : (
                    <FlatList
                        style={{ width: '100%' }}
                        data={wardrobeItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.listContainer}
                    />
                )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    listContainer: {
        paddingHorizontal: 10,
    },
    item: {
        flex: 1,
        margin: 5,
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 300, // Висота зображення
        borderRadius: 10,
        resizeMode: 'contain', // Адаптація зображення
    },
});

export default CategoryDetailsScreen;
