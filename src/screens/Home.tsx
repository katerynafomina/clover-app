import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, FlatList, Alert } from 'react-native';
import GetDate from '../components/date';
import LocationToCity from '../components/location';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Category } from '../constants/Categoris';
import Button from '../components/Button';

export default function Home() {
    const [latitude, setLatitude] = useState(0.0);
    const [longitude, setLongitude] = useState(0.0);
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    const handleLocationChange = (city: string, latitude: number, longitude: number) => {
        setCity(city);
        setLatitude(latitude);
        setLongitude(longitude);
    };

    LocationToCity({ onLocationChange: handleLocationChange });

    useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                if (latitude === undefined || longitude === undefined) {
                    console.warn('Некоректні значення пропів latitude або longitude');
                    return;
                }

                const apiKey = '44c35ae749a723b6da10c40ea25b18b6';
                const apiUrl1 = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=ua&units=metric`;
                const apiUrl2 = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=ua&units=metric`;

                const response1 = await fetch(apiUrl1);
                const response2 = await fetch(apiUrl2);
                const data1 = await response1.json();
                const data2 = await response2.json();

                setWeatherData({
                    temp: data1.main.temp,
                    icon: data1.weather[0].icon,
                    description: data1.weather[0].description,
                    humidity: data1.main.humidity,
                    speed: data1.wind.speed,
                    forecast: data2.list.slice(0, 5)
                });
            } catch (error) {
                console.warn('Помилка при отриманні погодових даних:', error);
            }
        };

        if (latitude !== 0.0 && longitude !== 0.0) {
            fetchWeatherData();
        }
    }, [latitude, longitude]);

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

    const getUniqueCategories = () => {
        return Array.from(new Set(wardrobeItems.map(item => item.category)));
    };

    const toggleItemSelection = (item: any) => {
        const isSelected = selectedItems.some((selected) => selected.id === item.id);

        if (isSelected) {
            setSelectedItems((prevItems) => prevItems.filter((selected) => selected.id !== item.id));
        } else {
            setSelectedItems((prevItems) => [...prevItems, item]);
        }
    };

    const insertWeather = async () => {
        try {
            const { data: weather, error: WeatherError } = await supabase
                .from('weather')
                .insert([
                    {
                        min_tempurature: weatherData.temp,
                        max_tempurature: weatherData.temp,
                        humidity: weatherData.humidity,
                        precipitation: weatherData.humidity,
                        wind: weatherData.speed,
                        weather_type: weatherData.description,
                        city: city,
                    },
                ]).select();
            if (WeatherError) {
                throw WeatherError;
            }

            if (weather) {
                const weatherId = weather[0].id;

                const { data: outfit, error: OutfitError } = await supabase
                    .from('outfits')
                    .insert([
                        {
                            user_id: session?.user.id,
                            weather_id: weatherId,
                        },
                    ]).select('id');

                if (OutfitError) {
                    throw OutfitError;
                }

                if (outfit && outfit.length > 0) {
                    const outfitId = outfit[0].id;

                    const itemsToInsert = selectedItems.map((item) => ({
                        outfit_id: outfitId,
                        item_id: item.id,
                    }));

                    const { data: insertedItems, error: InsertError } = await supabase
                        .from('outfit_item')
                        .insert(itemsToInsert);

                    if (InsertError) {
                        throw InsertError;
                    }

                    Alert.alert('Образ успішно додано!');
                }
            }
        } catch (error) {
            console.error('Error inserting weather and outfit:', error);
            Alert.alert('Помилка під час додавання образу. Будь ласка, спробуйте ще раз.');
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ width: '100%' }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.title}><GetDate /></Text>
                    {city ? (
                        <Text style={{ fontSize: 15 }}>{city}</Text>
                    ) : (
                        <Text>Очікуємо...</Text>
                    )}
                </View>
                <View style={{ alignItems: 'center' }}>
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 30 }}>
                            <View style={{}}>
                                <Text style={{ fontSize: 15 }}>зараз</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} >
                                    {weatherData && (
                                        <Text style={{ fontSize: 32 }}>{weatherData.temp > 0 ? '+' : ''}{Math.round(weatherData.temp)}°</Text>
                                    )}
                                    {weatherData && (
                                        <Image
                                            source={{ uri: `http://openweathermap.org/img/wn/${weatherData.icon}.png` }}
                                            style={{ width: 60, height: 50 }}
                                        />
                                    )}
                                </View>
                                {weatherData && (
                                    <Text>{weatherData.description}</Text>
                                )}
                            </View>
                            <View style={{ justifyContent: "center" }}>
                                <Text style={{ fontSize: 15 }}>Вологість: {weatherData?.humidity}%</Text>
                                <Text style={{ fontSize: 15 }}>Вітер: {weatherData?.speed} м/с</Text>
                            </View>
                        </View>
                        <FlatList
                            style={{ maxHeight: 150, marginBottom: 20 }}
                            data={weatherData?.forecast}
                            keyExtractor={(item) => item.dt.toString()}
                            renderItem={({ item }) => {
                                const date = new Date(item.dt * 1000);
                                return (
                                    <View style={{ alignItems: "center" }}>
                                        <Image
                                            source={{ uri: `http://openweathermap.org/img/wn/${item.weather[0].icon}.png` }}
                                            style={{ width: 60, height: 50 }}
                                        />
                                        <Text style={{ fontSize: 20, marginBottom: 12 }}>{item.main.temp > 0 ? '+' : ''}{Math.round(item.main.temp)}°</Text>
                                        <Text style={{ fontSize: 15 }}>{date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                );
                            }}
                            numColumns={8}
                            contentContainerStyle={{}}
                            columnWrapperStyle={{ gap: 10 }}
                            scrollEnabled={false}
                        />
                    </View>
                </View>
                <Text style={styles.sectionTitle}>Складіть образ на сьогодні</Text>
                {getUniqueCategories().map((category, index) => (
                    <View key={index}>
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <FlatList
                            data={wardrobeItems.filter(item => item.category === category)}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal
                            contentContainerStyle={{ paddingBottom: 5 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[
                                        styles.item,
                                        selectedItems.some((selected) => selected.id === item.id) && styles.selectedItem,
                                    ]}
                                    onPress={() => toggleItemSelection(item)}
                                >
                                    <Image source={{ uri: item.image }} style={styles.image} />
                                </Pressable>
                            )}
                        />
                    </View>
                ))}
                <View style={{ marginBottom: 20 }}></View>
                <Button text="додати образ" onPress={insertWeather} />
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
