import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text} from 'react-native';
import { CalendarList } from 'react-native-calendars';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';

type MonthNames = {
  [key: string]: string;
};

const monthNames: MonthNames = {
  'January': 'Січень',
  'February': 'Лютий',
  'March': 'Березень',
  'April': 'Квітень',
  'May': 'Травень',
  'June': 'Червень',
  'July': 'Липень',
  'August': 'Серпень',
  'September': 'Вересень',
  'October': 'Жовтень',
  'November': 'Листопад',
  'December': 'Грудень',
};

export default function Calendar() {
  const [markedDates, setMarkedDates] = useState<{ [date: string]: { marked: boolean } }>({});
  const navigation = useNavigation() as NavigationProp<any>;
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
    const fetchOutfits = async () => {
      if (!session || !session.user) {
        return; // Return early if session or user is not available
      }

      try {
        const { data, error } = await supabase
          .from('outfits')
          .select('created_at')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error fetching outfits:', error.message);
          return;
        }

        const newMarkedDates: { [date: string]: { marked: boolean } } = {};

        data.forEach((outfit: { created_at: string }) => {
          const date = outfit.created_at.split('T')[0]; // Get date in YYYY-MM-DD format
          newMarkedDates[date] = { marked: true };
        });

        setMarkedDates(newMarkedDates);
      } catch (error) {
        console.error('Error fetching outfits:', error);
      }
    };

    if (session && session.user) {
      fetchOutfits();
    }
  }, [session])
); // Fetch outfits when session or user changes

  const handleDayPress = async (day: any) => {
      if (day.dateString in markedDates) {
      navigation.navigate('DayOutfit', { day: day.dateString});
      }
  };

  return (
    <View style={{ flex: 1 }}>
      <CalendarList
        // Calendar parameters
        horizontal={false}
        pagingEnabled={false}
        pastScrollRange={24}
        futureScrollRange={24}
        scrollEnabled={true}
        showScrollIndicator={true}

        // Event handler for date press
        onDayPress={handleDayPress}

        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#00adf5',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#ffffff',
          todayBackgroundColor: '#D9D9D9',
          dayTextColor: '#000000',
          textDisabledColor: '#d9'
        }}

        markedDates={markedDates}

        renderHeader={(date) => {
          const monthYear = `${monthNames[date.toString('MMMM')]} ${date.toString('yyyy')}`;

          return (
            <View style={styles.monthHeader}>
              <View style={styles.separator} />
              <Text style={styles.monthHeaderText}>{monthYear}</Text>
              <View style={styles.separator} />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    width: '32%',
    backgroundColor: '#000000',
    marginHorizontal: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});
