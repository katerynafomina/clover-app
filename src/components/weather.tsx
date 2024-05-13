import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';

interface WeatherInfoProps {
  latitude: number;
  longitude: number;
}

const WeatherInfo: React.FC<WeatherInfoProps> = ({ latitude, longitude }) => {
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
  return (<View>
            <View style={{flexDirection: 'row',  justifyContent: 'space-between', marginBottom: 20, marginTop: 30 }}>
                <View style={{}}>
                    <Text style={{ fontSize: 15}}>зараз</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}} >
                      <Text style={{fontSize: 32}}>{mainWeather.temp > 0 ? '+' : ''}{Math.round(mainWeather.temp)}°</Text>
                     
                        <Image
                            source={{uri: `http://openweathermap.org/img/wn/${currentWeather[0].icon}.png`}}
                            style={{width: 60, height: 50}}
                        />
                    </View>
                    <Text>{currentWeather[0].description}</Text>
                </View>
                <View style={{justifyContent: "center"}}>
                    <Text style={{ fontSize: 15}}>Вологість: {mainWeather.humidity}%</Text>
                    <Text style={{ fontSize: 15}}>Вітер: {weatherData1.wind.speed} м/с</Text>
                </View>
            </View>
            <FlatList
        style={{maxHeight: 150, marginBottom: 20}}
        data={weatherData2.list.slice(0, 5)} 
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
  );
};

export default WeatherInfo;
