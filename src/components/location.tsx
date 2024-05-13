import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import * as Location from 'expo-location';

interface LocationToCityProps {
  onLocationChange: (city: string, latitude: number, longitude: number) => void;
}

const LocationToCity: React.FC<LocationToCityProps> = ({ onLocationChange }) => {
  const [city, setCity] = useState<string>('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Дозвіл на доступ до місцезнаходження був відхилений');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
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
      onLocationChange(cityName, latitude, longitude);
    } catch (error) {
      console.warn('Помилка при отриманні назви міста:', error);
    }
  };

  return (
    <>
      {city ? (
        <Text style={{fontSize: 15}}>{city}</Text>
      ) : (
        <Text>Очікуємо...</Text>
      )}
    </>
  );
};

export default LocationToCity;
