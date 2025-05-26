import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { RootStackParamList } from '../../App';

// Інтерфейс для елементу гардеробу
interface WardrobeItem {
    id: number;
    photo_url: string;
    category: string;
    subcategory: string | null;
    isAvailable: boolean;
    user_id: string;
    image: string;
    isUpdating?: boolean; // Для відстеження стану оновлення
    isDeleting?: boolean; // Для відстеження стану видалення
}

// Define props for navigation
type CategoryDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CategoryDetailsScreen'>;
type CategoryDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryDetailsScreen'>;

type Props = {
    route: CategoryDetailsScreenRouteProp;
    navigation: CategoryDetailsScreenNavigationProp;
};

const CategoryDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { category } = route.params;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    useEffect(() => {
        fetchItems();
    }, [category, session]);

    const fetchItems = async () => {
        if (!session || !session.user || !category) return;

        const userId = session.user.id;
        try {
            setLoading(true);
            
            const { data: wardrobe, error } = await supabase
                .from('wardrobe')
                .select('id, photo_url, category, subcategory, "isAvailable", user_id')
                .eq('category', category)
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching wardrobe items:', error.message);
                Alert.alert('Помилка', 'Не вдалося завантажити елементи гардеробу');
            } else {
                console.log('Fetched wardrobe items:', wardrobe);
                
                const itemsWithUrls = await Promise.all(
                    wardrobe.map(async (item) => {
                        const { data } = await supabase.storage
                            .from('clothes')
                            .getPublicUrl(item.photo_url);
                        
                        return {
                            ...item,
                            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
                            image: data?.publicUrl || '',
                        } as WardrobeItem;
                    })
                );

                console.log('Wardrobe items with URLs:', itemsWithUrls);

                setWardrobeItems(itemsWithUrls);
            }
        } catch (error) {
            console.error('Error fetching wardrobe items:', error);
            Alert.alert('Помилка', 'Щось пішло не так при завантаженні гардеробу');
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (itemId: number) => {
        try {
            // Знаходимо елемент
            const item = wardrobeItems.find(item => item.id === itemId);
            if (!item) return;

            // Встановлюємо стан оновлення
            setWardrobeItems(currentItems => 
                currentItems.map(item => 
                    item.id === itemId 
                        ? { ...item, isUpdating: true }
                        : item
                )
            );

            // Визначаємо новий стан доступності (інвертуємо поточний стан)
            const newAvailability = !item.isAvailable;
            
            console.log(`Updating item ${itemId} availability to ${newAvailability ? 'available' : 'unavailable'}`);

            // Оновлюємо в базі даних
            const { error } = await supabase
                .from('wardrobe')
                .update({ "isAvailable": newAvailability })
                .eq('id', itemId);

            if (error) {
                console.error('Error updating item availability:', error);
                Alert.alert('Помилка', 'Не вдалося оновити стан доступності');
                
                // Знімаємо стан оновлення
                setWardrobeItems(currentItems => 
                    currentItems.map(item => 
                        item.id === itemId 
                            ? { ...item, isUpdating: false }
                            : item
                    )
                );
                return;
            }

            // Оновлюємо локальний стан після успішного оновлення в базі
            setWardrobeItems(currentItems => 
                currentItems.map(item => 
                    item.id === itemId 
                        ? { ...item, isAvailable: newAvailability, isUpdating: false }
                        : item
                )
            );

            // Повідомляємо користувача про успішне оновлення
            Alert.alert(
                'Успішно', 
                `Елемент позначено як ${newAvailability ? 'доступний' : 'недоступний'}`
            );
        } catch (error) {
            console.error('Error toggling availability:', error);
            Alert.alert('Помилка', 'Щось пішло не так при зміні доступності');
        }
    };

    const deleteItem = async (itemId: number) => {
        try {
            Alert.alert(
                'Підтвердження',
                'Ви впевнені, що хочете видалити цей елемент гардеробу?',
                [
                    { 
                        text: 'Скасувати', 
                        style: 'cancel' 
                    },
                    { 
                        text: 'Видалити', 
                        style: 'destructive',
                        onPress: async () => {
                            // Встановлюємо стан видалення
                            setWardrobeItems(currentItems => 
                                currentItems.map(item => 
                                    item.id === itemId 
                                        ? { ...item, isDeleting: true }
                                        : item
                                )
                            );

                            try {
                                // Отримуємо шлях до фото перед видаленням запису
                                const { data: itemData, error: fetchError } = await supabase
                                    .from('wardrobe')
                                    .select('photo_url')
                                    .eq('id', itemId)
                                    .single();
                                
                                if (fetchError) {
                                    console.error('Error fetching item data:', fetchError);
                                    throw fetchError;
                                }

                                // Видаляємо запис з таблиці
                                const { error: deleteError } = await supabase
                                    .from('wardrobe')
                                    .delete()
                                    .eq('id', itemId);
                                
                                if (deleteError) {
                                    console.error('Error deleting wardrobe item:', deleteError);
                                    throw deleteError;
                                }

                                // Видаляємо фото зі сховища
                                if (itemData && itemData.photo_url) {
                                    const { error: storageError } = await supabase.storage
                                        .from('clothes')
                                        .remove([itemData.photo_url]);
                                    
                                    if (storageError) {
                                        console.error('Error deleting photo from storage:', storageError);
                                        // Не викидаємо помилку, якщо не вдалося видалити фото, оскільки запис вже видалений
                                    }
                                }

                                // Оновлюємо локальний стан після успішного видалення
                                setWardrobeItems(currentItems => 
                                    currentItems.filter(item => item.id !== itemId)
                                );

                                Alert.alert('Успішно', 'Елемент гардеробу видалено');
                            } catch (error) {
                                console.error('Error in delete process:', error);
                                Alert.alert('Помилка', 'Не вдалося видалити елемент гардеробу');
                                
                                // Знімаємо стан видалення при помилці
                                setWardrobeItems(currentItems => 
                                    currentItems.map(item => 
                                        item.id === itemId 
                                            ? { ...item, isDeleting: false }
                                            : item
                                    )
                                );
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error showing delete confirmation:', error);
        }
    };

    const renderItem = ({ item }: { item: WardrobeItem }) => (
        <View style={styles.itemContainer}>
            <TouchableOpacity 
                style={[
                    styles.item,
                    !item.isAvailable && styles.unavailableItem
                ]}
                disabled={item.isUpdating || item.isDeleting}
            >
                <Image 
                    source={{ uri: item.image }} 
                    style={[
                        styles.image,
                        !item.isAvailable && styles.unavailableImage
                    ]} 
                />
                {item.subcategory && (
                    <Text style={styles.subcategory}>{item.subcategory}</Text>
                )}
            </TouchableOpacity>
            
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[
                        styles.actionButton,
                        item.isAvailable ? styles.availableButton : styles.unavailableButton,
                        item.isUpdating && styles.loadingButton
                    ]}
                    onPress={() => toggleAvailability(item.id)}
                    disabled={item.isUpdating || item.isDeleting}
                >
                    {item.isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>
                            {item.isAvailable ? '✓ Доступно' : '✗ Недоступно'}
                        </Text>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[
                        styles.actionButton,
                        styles.deleteButton,
                        item.isDeleting && styles.loadingButton
                    ]}
                    onPress={() => deleteItem(item.id)}
                    disabled={item.isUpdating || item.isDeleting}
                >
                    {item.isDeleting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.actionButtonText}>🗑️ Видалити</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category}</Text>
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text>Завантаження...</Text>
                </View>
            ) : wardrobeItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Немає одягу даної категорії: {category}</Text>
                </View>
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
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    loadingContainer: {
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
    listContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    itemContainer: {
        flex: 1,
        margin: 8,
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    item: {
        width: '100%',
        alignItems: 'center',
        padding: 8,
    },
    unavailableItem: {
        backgroundColor: '#f8f8f8',
    },
    image: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        resizeMode: 'contain',
    },
    unavailableImage: {
        opacity: 0.5,
        // Додаємо сірий фільтр для недоступних елементів
        tintColor: '#808080', 
    },
    subcategory: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'column',
        padding: 8,
        gap: 8,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    availableButton: {
        backgroundColor: '#4CAF50',
    },
    unavailableButton: {
        backgroundColor: '#9E9E9E',
    },
    deleteButton: {
        backgroundColor: '#F44336',
    },
    loadingButton: {
        opacity: 0.7,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default CategoryDetailsScreen;