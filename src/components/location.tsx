import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Define the props for the component, if any
interface LocationToCityProps  {
  onLocationChange?: (city: string, latitude: number, longitude: number) => void;
}

export default function LocationToCity ({ onLocationChange }:LocationToCityProps) {
  const [city, setCity] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(0.0);
  const [longitude, setLongitude] = useState<number>(0.0);

  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        console.log(status); // Add this line to log the permission status
        if (status !== 'granted') {
          console.warn('Дозвіл на доступ до місцезнаходження був відхилений');
          return;
        }
    
        let location = await Location.getCurrentPositionAsync({});
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
        fetchCityName(location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.warn('Помилка при отриманні місцезнаходження:', error);
      }
    };
    

    getLocation();
  }, []);

  const fetchCityName = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=uk`, {
        headers: {
          'User-Agent': 'YourAppName/1.0 (your@email.com)'  // Add your app's name and contact email
        }      
      });
      const text = await response.text();  // Get the raw response as text first
      console.log("Raw response:", text);  // Log the raw response
  
      const data = JSON.parse(text);  // Parse the text only if it is valid JSON
      const cityName = data.address.city;
      setCity(cityName);
  
      if (onLocationChange) {
        onLocationChange(cityName, latitude, longitude);
      }
    } catch (error) {
      console.warn('Помилка при отриманні назви міста:', error);
    }
  };
  

  return { city: city, latitude: latitude, longitude: longitude };
};

