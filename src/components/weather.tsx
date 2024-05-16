import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';

interface WeatherInfoProps {
  latitude: number;
  longitude: number;
}

export type WeatherInfoData = {
  temp: number;
  icon: string;
  description: string;
  humidity: number;
  speed: number;
  forecast: any[]; // You can replace `any[]` with a more specific type if possible
}

export default function WeatherInfo({ latitude, longitude } : WeatherInfoProps) {
  const [weatherData1, setWeatherData1] = useState<any>(null);
  const [weatherData2, setWeatherData2] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        setWeatherData1(data1); // Встановлюємо отримані дані про погоду
        setWeatherData2(data2);
        setLoading(false);
      } catch (error) {
        console.warn('Помилка при отриманні погодових даних:', error);
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [latitude, longitude]);

  if (loading) {
    return <Text>Завантаження...</Text>;
  }

  if (!weatherData1 || !weatherData2) {
    return <Text>Дані про погоду відсутні або некоректні</Text>;
  }
  
  const currentWeather = weatherData1.weather;
  const mainWeather = weatherData1.main;

  return {temp: mainWeather.temp, icon: currentWeather[0].icon, description: currentWeather[0].description, humidity: mainWeather.humidity, speed: weatherData1.wind.speed, forecast: weatherData2.list.slice(0, 5)} as WeatherInfoData;
};

