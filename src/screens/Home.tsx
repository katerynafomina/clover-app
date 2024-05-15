import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable } from 'react-native';
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
//   const addWeather = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('weather')
//         .insert([
//           {  city: city, max_temperature: temperature, weather: weather }
//         ])
//       if (error) {
//         Alert.alert('Error adding weather:', error.message)
//       } else {
//         Alert.alert('Weather added successfully!')
//       }
//     } catch (error) {
//       Alert.alert('Error adding weather:', error.message)
//     }
//   }
  
//   const AddOutfit = async() => {
//     try {
//       const { data, error } = await supabase
//         .from('weather')
//         .insert([
//           { user_id: session?.user.id, items: selectedItems }
//         ])
//       if (error) {
//         Alert.alert('Error adding outfit:', error.message)
//       } else {
//         Alert.alert('Outfit added successfully!')
//       }
//     } catch (error) {
//       Alert.alert('Error adding outfit:', error.message)
//     }
//   }

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
        <ScrollView>
            <View style={styles.container}>
                <Text style={styles.title}><GetDate /></Text>
                <LocationToCity onLocationChange={(city, latitude, longitude) => {
                    setLatitude(latitude);
                    setLongitude(longitude);
                    setCity(city);
                }} />

                {city && <WeatherInfo latitude={latitude} longitude={longitude} />}

                <Text>основний аутфіт</Text>
                <Text>верхній одяг та аксесуари</Text>

                <Text>Ідентифікатор користувача: {session?.user.email}</Text>

                {/* Виведення елементів гардеробу */}
                <Text style={styles.sectionTitle}>Елементи гардеробу:</Text>
                {wardrobeItems.map((item) => (
                    <Pressable
                        key={item.id}
                        style={[
                            styles.item,
                            selectedItems.some((selected) => selected.id === item.id) && styles.selectedItem,
                        ]}
                        onPress={() => toggleItemSelection(item)}
                    >
                        <Image source={{ uri: item.image }} style={styles.image} />
                        <Text>{item.category}</Text>
                    </Pressable>
                ))}
                <Button text="додати образ" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
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
        width: 300,
        height: 300,
        borderRadius: 10,
        resizeMode: 'contain',
    },
});
