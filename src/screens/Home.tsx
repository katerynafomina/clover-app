
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import GetDate from '../components/date';
import WeatherInfo from '../components/weather';
import LocationToCity from '../components/location';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';

export default function Home() {

    const [latitude, setLatitude] = useState(0.0);
    const [longitude, setLongitude] = useState(0.0);
    const [city, setCity] = useState('');
    const [wardrobeItems, setWardrobeItems] = useState<{ photo_url: string; category: string }[]>([]); // Оновлено тип данних
    const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])
   
    
  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }
 
  const handleLocationChange = (city: string, latitude: number, longitude: number) => {
    setLatitude(latitude);
    setLongitude(longitude);
    setCity(city);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}><GetDate /></Text>

      <LocationToCity onLocationChange={handleLocationChange} />

      {city && (
        <WeatherInfo latitude={latitude} longitude={longitude} />
      )}

      <Text>основний аутфіт</Text>
      <Text>верхній одяг та аксесуари</Text>
      
      <Text>Ідентифікатор користувача: { session?.user.email }</Text>

      {/* Виведення елементів гардеробу */}
      <Text style={styles.sectionTitle}>Елементи гардеробу:</Text>
      {wardrobeItems.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.photoUrl}>{item.photo_url}</Text>
        </View>
      ))}
    </View>
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
  },
  category: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  photoUrl: {
    fontSize: 14,
  },
});
