import { StyleSheet } from 'react-native';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import GetDate from '../components/date';
import { useEffect } from 'react';
import React from 'react';
import { RouteProp } from '@react-navigation/native';

type DayOutfitParams = {
    Date :{
        day: string;
    };
}
type DayOutfitRouteProp = RouteProp<DayOutfitParams, 'Date'>;


export default function DayOutfit({ route, }: {route:DayOutfitRouteProp}) {
  const { day } = route.params;

  return (
      <View style={styles.container}>
          <Text style={styles.title}>day: </Text>
          <GetDate day={Array.isArray(day) ? day[0] : day} />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
  },
  title: {
      fontSize: 20,
      fontWeight: 'bold',
  },
  separator: {
      marginVertical: 30,
      height: 1,
      width: '80%',
  },
});