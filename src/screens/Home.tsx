import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, FlatList } from 'react-native';
import GetDate from '../components/date';
import WeatherInfo from '../components/weather';
import LocationToCity from '../components/location';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { Category } from '../constants/Categoris';
import  Button  from '../components/Button';

export default function Home() {
    const [latitude, setLatitude] = useState(0.0);
    const [longitude, setLongitude] = useState(0.0);
    const [city, setCity] = useState('');
    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [selectedItems, setSelectedItems] = useState<any[]>([]); // Масив обраних елементів

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const { data: wardrobe, error } = await supabase
                    .from('wardrobe')
                    .select('id, photo_url, category, user_id')
                    .eq('user_id', session?.user.id);

                if (error) {
                    console.error('Error fetching wardrobe items:', error.message);
                } else {
                    // Отримання публічних URL для зображень
                    const itemsWithUrls = await Promise.all(
                        wardrobe.map(async (item) => {
                            const { data } = await supabase.storage
                                .from('clothes')
                                .getPublicUrl(item.photo_url);

                            return { ...item, image: data?.publicUrl };
                        })
                    );

                    setWardrobeItems(itemsWithUrls);
                }
            } catch (error) {
                console.error('Error fetching wardrobe items:', error);
            }
        };

        if (session) {
            fetchItems();
        }
    }, [session]);

    // Функція для фільтрації унікальних категорій
    const getUniqueCategories = () => {
        return Array.from(new Set(wardrobeItems.map(item => item.category)));
    };

    const toggleItemSelection = (item: any) => {
        // Перевіряємо, чи вже вибраний елемент
        const isSelected = selectedItems.some((selected) => selected.id === item.id);

        if (isSelected) {
            // Видалення елементу із списку обраних, якщо він вже був вибраний
            setSelectedItems((prevItems) => prevItems.filter((selected) => selected.id !== item.id));
        } else {
            // Додавання елементу до списку обраних, якщо він ще не був вибраний
            setSelectedItems((prevItems) => [...prevItems, item]);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                style={{ width: '100%' }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.title}><GetDate /></Text>
                    <LocationToCity onLocationChange={(city, latitude, longitude) => {
                        setLatitude(latitude);
                        setLongitude(longitude);
                        setCity(city);
                    }} />
                </View>
                <View style={{alignItems: 'center'}}>
                {city && <WeatherInfo latitude={latitude} longitude={longitude} />}
                </View>
                {/* Виведення елементів гардеробу */}
                
                <Text style={styles.sectionTitle}>Складіть образ на сьогодні</Text>
                {getUniqueCategories().map((category, index) => (
                    <View key={index}>
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <FlatList
                            data={wardrobeItems.filter(item => item.category === category)}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal
                            contentContainerStyle={{ paddingBottom: 5}}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[
                                        styles.item,
                                        selectedItems.some((selected) => selected.id === item.id) && styles.selectedItem,
                                    ]}
                                    onPress={() => toggleItemSelection(item)}
                                >
                                    <Image source={{ uri: item.image }} style={styles.image} />
                                    {/* <Text>{item.category}</Text> */}
                                </Pressable>
                            )}
                        />
                    </View>
                ))}
                <View style={{marginBottom: 20}}></View>
                <Button text="додати образ" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'center',
    },
    item: {
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 8,
        padding: 8,
    },
    selectedItem: {
        borderColor: 'blue',
    },
    image: {
        height: 100,
        width: 100,
        borderRadius: 10,
        resizeMode: 'contain',
    },
});
