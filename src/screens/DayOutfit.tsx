import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import {ActivityIndicator} from 'react-native';
import GetDate from '../components/date';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Button from '../components/Button';

type WeatherData = {
  id: number;
  weather_type: string;
  min_tempurature: number;
  max_tempurature: number;
  precipitation: number;
  humidity: number;
  wind: number;
  weather_icon: string;
  city: string;
};

type OutfitItem = {
  id: number;
  category: string;
  photo_url: string;
};

const DayOutfit = ({ route }: { route: any }) => {
    const { day } = route.params; 
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [outfitId, setOutfitId] = useState<number | any>(null);
    const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
    const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation() as NavigationProp<any>;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, [])

  const deleteOutfit = async () => {
    try {

    const { error:outfit_error } = await supabase
      .from('outfit_item')
      .delete()
        .eq('outfit_id', outfitId);
      
      if (outfit_error) {
        console.error('Error deleting outfit items:', outfit_error.message);
        return;
      }    
          

      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId); 
      navigation.goBack();
      if (error) {
        console.error('Error deleting outfit:', error.message);
        return;
      }

    }catch (error) {
      console.error('Error deleting outfit:', error);
    }
  }

  const fetchOutfitItems = async () => {
    if (!session) {
      return;
    }

    try {
      const { data: outfits, error: outfitsError } = await supabase
        .from('outfits')
        .select('id, weather_id')
        .eq('user_id', session.user.id)
        .eq('date', day);

      if (outfitsError) {
        console.error('Error fetching outfit ids:', outfitsError.message);
        return;
      }
      
      if (outfits.length === 0) {
        console.warn('No outfits found for the specified criteria.');
        return;
      }
      const weatherId = outfits[0].weather_id;
      const { data: weatherData, error, count } = await supabase
        .from('weather')
        .select('*')
          .eq('id', weatherId)

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
      
      const outfitId = outfits[0].id;
      setOutfitId(outfitId);
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
        .select('id, photo_url, category, user_id')
        .in('id', itemIds);
      if (wardrobeItems) {
        const itemsWithUrls = await Promise.all(
          wardrobeItems.map(async (item) => {
            const { data } = await supabase.storage
              .from('clothes')
              .getPublicUrl(item.photo_url);

            return { ...item, image: data?.publicUrl };
          })
        );
          setOutfitItems(itemsWithUrls);
      }

      if (wardrobeError) {
        console.error('Error fetching wardrobe items:', wardrobeError.message);
        return;
      }

      
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching outfit items:', error);
      setIsLoading(false)
    }
  };

  useEffect(() => {
    if (session ) {
      fetchOutfitItems();
    }
  }, [day, session, weatherData]);

  const renderItem = ({ item }: { item: any }) => (
        // <View style={styles.item}>
            <TouchableOpacity  style={styles.item}>
                <Image source={{ uri: item.image }} style={styles.image} />
            </TouchableOpacity>
        // </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{GetDate(day)}</Text>
      {weatherData && (
          <Text style={[styles.title, {fontSize: 18}]}>{weatherData.city}</Text>
      )}
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
          
        <FlatList
                        style={{ width: '100%' }}
                        data={outfitItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.listContainer}
                    />
         
      )}
       <Button text="Видалити образ" onPress={deleteOutfit} />
      
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

export default DayOutfit;
