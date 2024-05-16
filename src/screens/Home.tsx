import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, FlatList } from 'react-native';
import GetDate from '../components/date';
import WeatherInfo, {WeatherInfoData} from '../components/weather';
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
    const [weatherData, setWeatherData] = useState<WeatherInfoData | null>(null);
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
        const weatherData = WeatherInfo({ latitude, longitude });
        setWeatherData(weatherData as WeatherInfoData);
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

   const insertWeather = async () => {
    try {
        const { data: weather, error: WeatherError } = await supabase
            .from('weather')
            .insert([
                {
                    min_tempurature: 15,
                    max_tempurature: 15,
                    humidity: 10,
                    precipitation: 10,
                    wind: 0,
                    weather_type: 'rain',
                    city: city, // Використовуємо змінну city для міста
                },
            ]).select();
        if (WeatherError) {
            throw WeatherError;
        }

        if (weather ) {
            const weatherId = weather[0].id;

            // Додаємо новий образ у таблицю outfits з посиланням на погоду
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

                // Додаємо обрані елементи у таблицю outfit_item з посиланням на образ
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
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.title}><GetDate /></Text>
                    {city ? (
                        <Text style={{fontSize: 15}}>{city}</Text>
                    ) : (
                        <Text>Очікуємо...</Text>
                    )}
                </View>
                <View style={{alignItems: 'center'}}>
                <View>
                    <View style={{flexDirection: 'row',  justifyContent: 'space-between', marginBottom: 20, marginTop: 30 }}>
                        <View style={{}}>
                            <Text style={{ fontSize: 15}}>зараз</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}} >
                                {weatherData && (
                                    <Text style={{fontSize: 32}}>{weatherData.temp > 0 ? '+' : ''}{Math.round(weatherData.temp)}°</Text>
                                )}
                                {weatherData && (
                                    <Image
                                        source={{uri: `http://openweathermap.org/img/wn/${weatherData.icon}.png`}}
                                        style={{width: 60, height: 50}}
                                    />
                                )}
                            </View>
                            {weatherData && (
                                <Text>{weatherData.description}</Text>
                            )}
                        </View>
                        <View style={{justifyContent: "center"}}>
                            <Text style={{ fontSize: 15}}>Вологість: {weatherData?.humidity}%</Text>
                            <Text style={{ fontSize: 15}}>Вітер: {weatherData?.speed} м/с</Text>
                        </View>
                    </View>
                    <FlatList
                        style={{maxHeight: 150, marginBottom: 20}}
                        data={weatherData?.forecast} 
                        keyExtractor={(item) => item.dt.toString()}
                        renderItem={({ item }) => {
                            const date = new Date(item.dt * 1000);
                            return (
                                <View style={{alignItems: "center"}}>
                                    <Image
                                        source={{uri: `http://openweathermap.org/img/wn/${item.weather[0].icon}.png`}}
                                        style={{width: 60, height: 50}}
                                    />
                                    <Text style={{ fontSize: 20, marginBottom: 12}}>{item.main.temp > 0 ? '+' : ''}{Math.round(item.main.temp)}°</Text>
                                    <Text style={{ fontSize: 15}}>{date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                            );
                        }}
                        numColumns={8}
                        contentContainerStyle={{}}
                        columnWrapperStyle={{gap: 10}}
                        scrollEnabled={false}
                    />
                </View>
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
                <Button text="додати образ" onPress={ insertWeather} />
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
