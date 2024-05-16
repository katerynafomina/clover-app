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
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=uk`);
      const data = await response.json();
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

