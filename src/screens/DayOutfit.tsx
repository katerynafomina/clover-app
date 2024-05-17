import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

type WeatherData = {
  weather_type: string;
  min_temperature: number;
  max_temperature: number;
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
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);

  const getOutfitIdsForDay = async (selectedDay: string) => {
    try {
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select('id')
        .eq('created_at', selectedDay);

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
      const { data: outfitItems, error } = await supabase
        .from('outfit_item')
        .select()
        .in('outfit_id', outfitIds.map((outfit) => outfit.id));

      if (error) {
        console.error('Error fetching outfit items:', error.message);
        return;
      }

      if (outfitItems) {
        setOutfitItems(outfitItems);
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
          <Text>Temperature: {weatherData.min_temperature}°C - {weatherData.max_temperature}°C</Text>
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
