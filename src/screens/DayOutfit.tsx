import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

type WeatherData = {
  weather_type: string;
  min_tempurature: number;
  max_tempurature: number;
  precipitation: number;
  humidity: number;
  wind: number;
};

type OutfitItem = {
  id: number;
  item_id: number;
  created_at: string;
  // Add other necessary fields
};

const DayOutfit = ({ route }: { route: any }) => {
    const { day } = route.params;
    const {outfitId} = route.params;
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, [])

  const getOutfitIdsForDay = async (selectedDay: string) => {
    try {
         const { data: outfits, error } = await supabase
        .from('outfits')
        .select('id, weather_id')
        .eq('user_id', session?.user?.id)
         .filter('created_at::date', 'eq', selectedDay);
        console.log(outfits);
        console.log(outfitId);
      if (error) {
        console.error('Error fetching outfit ids:', error.message);
        return [];
        }
        
      return outfits || [];
    } catch (error) {
      console.error('Error fetching outfit ids:', error);
      return [];
    }
  };

  const fetchWeatherData = async () => {
    try {
      const { data: weatherData, error, count } = await supabase
        .from('weather')
        .select('*')
          .eq('date', day)
        .order('created_at', { ascending: false })
        .range(0, 1); // Fetch only the latest weather data for the specified date

      if (error) {
        console.error('Error fetching weather data:', error.message);
        return;
      }

      if (count === 0) {
        console.warn('No weather data found for the specified date.');
        return;
      }
    //   console.log(weatherData);
      if (weatherData && weatherData.length > 0) {
        const latestWeather = weatherData[0]; // Get the latest weather data
        setWeatherData(latestWeather);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  const fetchOutfitItems = async () => {
    try {
        const outfitIds = await getOutfitIdsForDay(day);
        // console.log(outfitIds);
      const { data: outfitItems, error } = await supabase
        .from('outfit_item')
        .select('item_id')
        .eq('outfit_id', outfitIds[0]);

      if (error) {
        console.error('Error fetching outfit items:', error.message);
        return;
      }
      console.log(outfitItems);
      if (outfitItems) {
        
      }
    } catch (error) {
      console.error('Error fetching outfit items:', error);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    fetchOutfitItems();
  }, [day]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather for {day}</Text>
      {weatherData ? (
        <View>
          <Text>Weather Type: {weatherData.weather_type}</Text>
          <Text>Temperature: {weatherData.min_tempurature}°C - {weatherData.min_tempurature}°C</Text>
          {/* Display other weather details */}
        </View>
      ) : (
        <Text>Loading weather...</Text>
      )}

      <Text style={styles.title}>Outfit for {day}</Text>
      {outfitItems.length > 0 ? (
        outfitItems.map((item) => (
          <View key={item.id}>
            {/* Display outfit item details */}
            <Text>Outfit Item ID: {item.item_id}</Text>
            {/* Add more outfit item details here */}
          </View>
        ))
      ) : (
        <Text>Loading outfit...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default DayOutfit;
