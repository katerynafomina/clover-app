import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, FlatList, Alert } from 'react-native';
import GetDate from '../components/date';
import LocationToCity from '../components/location';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Category } from '../constants/Categoris';
import Button from '../components/Button';
import getCategoriesByTemperature from '../components/GetSubCategoryForTemperature';
import filterAndRandomizeCategories from '../components/GetCategoryForOutfut';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

// Інтерфейс для елемента гардеробу
interface WardrobeItem {
    id: number;
    photo_url: string;
    category: string;
    subcategory: string | null;
    user_id: string;
    isAvailable: boolean;
    image?: string;
}

export default function Home() {
    const [latitude, setLatitude] = useState(0.0);
    const [longitude, setLongitude] = useState(0.0);
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);

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
                console.log('Погода:', data1);
                console.log('Прогноз:', data2.list.slice(0, 5));
                console.log("Weather data:", weatherData?.temp);
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

    useFocusEffect(
        useCallback(() => {
            const fetchItems = async () => {
                try {
                    // Отримуємо тільки доступні речі (isAvailable = true)
                    const { data: wardrobe, error } = await supabase
                        .from('wardrobe')
                        .select('id, photo_url, category, user_id, subcategory, "isAvailable"')
                        .eq('user_id', session?.user.id)
                        .eq('"isAvailable"', true); // Фільтруємо тільки доступні речі

                    if (error) {
                        console.error('Error fetching wardrobe items:', error.message);
                    } else {
                        console.log('Fetched available wardrobe items:', wardrobe.length);
                        
                        const itemsWithUrls = await Promise.all(
                            wardrobe.map(async (item) => {
                                const { data } = await supabase.storage
                                    .from('clothes')
                                    .getPublicUrl(item.photo_url);

                                return { 
                                    ...item, 
                                    image: data?.publicUrl,
                                    isAvailable: item.isAvailable !== undefined ? item.isAvailable : true
                                } as WardrobeItem;
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
        }, [session])
    );
    
    useEffect(() => {
        // Очищаємо вибрані елементи при оновленні списку речей
        setSelectedItems([]);
        
        if (weatherData && wardrobeItems.length > 0) {
            console.log('Generating outfit for temperature:', weatherData.temp);
            const categories = getCategoriesByTemperature(weatherData.temp);
            console.log('Recommended categories:', categories);
            
            const uniqueSubCategories = getUniqueSubCategories();
            console.log('Available subcategories:', uniqueSubCategories);
            
            const filteredCategories = filterAndRandomizeCategories(categories, uniqueSubCategories);
            console.log('Filtered categories:', filteredCategories);

            if (filteredCategories && typeof filteredCategories === 'object') {
                const validFilteredCategories = Object.values(filteredCategories).filter((category) => category !== null);
                console.log('Valid filtered categories:', validFilteredCategories);
    
                const itemsForCategories = wardrobeItems.filter((item) => 
                    validFilteredCategories.some((category) => item.subcategory === category)
                );
                console.log('Items matching filtered categories:', itemsForCategories.length);
    
                // Вибираємо по одному випадковому елементу для кожної категорії
                const randomItems: WardrobeItem[] = [];
                
                validFilteredCategories.forEach((category: string | null) => {
                    const itemsInCategory = wardrobeItems.filter(item => 
                        item.subcategory === category && item.isAvailable
                    );
                    
                    if (itemsInCategory.length > 0) {
                        const randomItem = itemsInCategory[Math.floor(Math.random() * itemsInCategory.length)];
                        if (randomItem && !randomItems.some(item => item.id === randomItem.id)) {
                            randomItems.push(randomItem);
                        }
                    }
                });
    
                console.log('Selected random items:', randomItems.length);
                if (randomItems.length > 0) {
                    setSelectedItems(randomItems);
                }
            }
        }
    }, [weatherData, wardrobeItems]);
    
    const getUniqueCategories = () => {
        // Отримуємо унікальні категорії тільки для доступних речей
        return Array.from(new Set(wardrobeItems.map(item => item.category)));
    };
    
    const getUniqueSubCategories = () => {
        // Отримуємо унікальні підкатегорії тільки для доступних речей і видаляємо null значення
        return Array.from(new Set(wardrobeItems.map(item => item.subcategory))).filter(
            (subcategory): subcategory is string => subcategory !== null
        );
    };
    
    const toggleItemSelection = (item: WardrobeItem) => {
        const isSelected = selectedItems.some((selected) => selected.id === item.id);

        if (isSelected) {
            setSelectedItems((prevItems) => prevItems.filter((selected) => selected.id !== item.id));
        } else {
            setSelectedItems((prevItems) => [...prevItems, item]);
        }
    };

    const insertWeather = async () => {
        try {
            // Get the current date in ISO format
            const currentDate = new Date().toISOString();
            
            console.log('Current date:', currentDate.split('T')[0]); // Log the date part only

            // Check if an outfit for the current date already exists for the user
            const { data: existingOutfits, error: existingOutfitsError } = await supabase
                .from('outfits')
                .select('id, weather:weather_id(*)')
                .eq('user_id', session?.user.id)
                .eq('date', currentDate.split('T')[0]); // Compare date part only

            if (existingOutfitsError) {
                throw existingOutfitsError;
            }

            if (existingOutfits && existingOutfits.length > 0) {
                console.warn('Outfit for this date already exists:', existingOutfits);
                Alert.alert('Увага', 'Обрання для цієї дати вже існує.');
                return;
            }

            // Перевіряємо, чи вибрано хоча б один елемент
            if (selectedItems.length === 0) {
                Alert.alert('Увага', 'Будь ласка, оберіть хоча б один елемент одягу для образу.');
                return;
            }

            // Insert new weather data with date
            const { data: weather, error: WeatherError } = await supabase
                .from('weather')
                .insert([
                    {
                        date: currentDate, // Add this line
                        min_tempurature: Math.round(weatherData.temp),
                        max_tempurature: Math.round(weatherData.temp),
                        humidity: weatherData.humidity,
                        precipitation: weatherData.humidity,
                        wind: weatherData.speed,
                        weather_type: weatherData.description,
                        city: city,
                        weather_icon: weatherData.icon,
                    },
                ])
                .select();
    
            if (WeatherError) {
                throw WeatherError;
            }
    
            if (weather && weather.length > 0) {
                const weatherId = weather[0].id;
    
                // Insert new outfit data
                const { data: outfit, error: OutfitError } = await supabase
                    .from('outfits')
                    .insert([
                        {
                            user_id: session?.user.id,
                            weather_id: weatherId,
                            date: currentDate,
                        },
                    ])
                    .select('id');
    
                if (OutfitError) {
                    throw OutfitError;
                }
    
                if (outfit && outfit.length > 0) {
                    const outfitId = outfit[0].id;
    
                    // Prepare items to insert
                    const itemsToInsert = selectedItems.map((item) => ({
                        outfit_id: outfitId,
                        item_id: item.id,
                    }));
    
                    // Insert outfit items
                    const { data: insertedItems, error: InsertError } = await supabase
                        .from('outfit_item')
                        .insert(itemsToInsert);
    
                    if (InsertError) {
                        throw InsertError;
                    }
    
                    Alert.alert('Успішно', 'Образ успішно додано!');
                    // Очищаємо вибрані елементи після успішного додавання
                    setSelectedItems([]);
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
                
                {wardrobeItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>У вашому гардеробі немає доступних речей</Text>
                    </View>
                ) : (
                    getUniqueCategories().map((category, index) => {
                        // Фільтруємо доступні речі для кожної категорії
                        const itemsInCategory = wardrobeItems.filter(
                            item => item.category === category
                        );
                        
                        // Якщо в категорії немає доступних речей, не показуємо її
                        if (itemsInCategory.length === 0) return null;
                        
                        return (
                            <View key={index}>
                                <Text style={styles.categoryTitle}>{category}</Text>
                                <FlatList
                                    data={itemsInCategory}
                                    keyExtractor={(item) => item.id.toString()}
                                    horizontal
                                    contentContainerStyle={{ padding: 5, gap: 10}}
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
                        );
                    })
                )}
                
                <View style={{ marginVertical: 20 }}></View>
                <Button 
                    text={selectedItems.length > 0 ? "додати образ" : "оберіть речі для образу"} 
                    onPress={insertWeather} 
                    disabled={selectedItems.length === 0}
                />
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
        fontWeight: '500',
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        marginVertical: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});