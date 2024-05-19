import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import {ActivityIndicator} from 'react-native';

type WeatherData = {
  id: number;
  weather_type: string;
  min_tempurature: number;
  max_tempurature: number;
  precipitation: number;
  humidity: number;
  wind: number;
  weather_icon: string;
};

type OutfitItem = {
  id: number;
  category: string;
  photo_url: string;
};

const DayOutfit = ({ route }: { route: any }) => {
    const { day } = route.params; 
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, [])

  const fetchWeatherData = async () => {
    try {
      const { data: weatherData, error, count } = await supabase
        .from('weather')
        .select('*')
          .eq('date', day)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching weather data:', error.message);
        return;
      }

      if (count === 0) {
        console.warn('No weather data found for the specified date.');
        return;
      }
      // console.log(weatherData);
      if (weatherData && weatherData.length > 0) {
        const latestWeather = weatherData[0]; // Get the latest weather data
        setWeatherData(latestWeather);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const fetchOutfitItems = async () => {
    if (!session || !weatherData) {
      return;
    }

    try {
      const { data: outfits, error: outfitsError } = await supabase
        .from('outfits')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('weather_id', weatherData.id);

      if (outfitsError) {
        console.error('Error fetching outfit ids:', outfitsError.message);
        return;
      }
      
      if (outfits.length === 0) {
        console.warn('No outfits found for the specified criteria.');
        return;
      }
      
      const outfitId = outfits[0].id;
      const { data: outfitItemsData, error: outfitItemsError } = await supabase
        .from('outfit_item')
        .select('item_id')
        .eq('outfit_id', outfitId);

      if (outfitItemsError) {
        console.error('Error fetching outfit items:', outfitItemsError.message);
        return;
      }

      if (outfitItemsData.length === 0) {
        console.warn('No outfit items found for the specified outfit id.');
        return;
      }

      const itemIds = outfitItemsData.map(item => item.item_id);
      const { data: wardrobeItems, error: wardrobeError } = await supabase
        .from('wardrobe')
        .select('*')
        .in('id', itemIds);

      if (wardrobeError) {
        console.error('Error fetching wardrobe items:', wardrobeError.message);
        return;
      }

      setOutfitItems(wardrobeItems);
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching outfit items:', error);
      setIsLoading(false)
    }
  };

  useEffect(() => {
    fetchWeatherData();
    if (session && weatherData) {
      fetchOutfitItems();
    }
  }, [day, session, weatherData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Погода на {day}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
        <View style={{}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} >
                {weatherData && (
                    <Text style={{ fontSize: 32 }}>{weatherData.max_tempurature > 0 ? '+' : ''}{Math.round(weatherData.max_tempurature)}°</Text>
                )}
                {weatherData && (
                    <Image
                        source={{ uri: `http://openweathermap.org/img/wn/${weatherData.weather_icon}.png` }}
                        style={{ width: 60, height: 50 }}
                    />
                )}
            </View>
            {weatherData && (
                <Text>{weatherData.weather_type}</Text>
            )}
        </View>
        <View style={{ justifyContent: "center" }}>
            <Text style={{ fontSize: 15 }}>Вологість: {weatherData?.humidity}%</Text>
            <Text style={{ fontSize: 15 }}>Вітер: {weatherData?.wind} м/с</Text>
        </View>
      </View>

      <Text style={styles.title}>Образ</Text>
      {isLoading? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        outfitItems.map((item) => (
          <View key={item.id}>
            {/* Display outfit item details */}
            <Image source={{ uri: item.photo_url }} style={styles.image} />
            <Text>Outfit Item ID: {item.id}</Text>
            <Text>Category: {item.category}</Text>
            {/* Add more outfit item details here */}
          </View>
        ))

      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  image: {
    height: 100,
    width: 100,
    borderRadius: 10,
    resizeMode: 'contain',
},
});

export default DayOutfit;
