import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { CalendarList } from 'react-native-calendars';
import { router } from 'expo-router';

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
  const [markedDates, setMarkedDates] = useState<{[date: string]: {marked: boolean}}>({});
  
  return (
    <View style={{ flex: 1 }}>
      <CalendarList
        // Параметри календаря
        horizontal={false} // Робить календар горизонтальним
        pagingEnabled={false} // Дозволяє прокручувати по сторінках (місяцях)
        pastScrollRange={24} // Кількість місяців, які залишаються позаду
        futureScrollRange={24} // Кількість місяців, які залишаються вперед
        scrollEnabled={true} // Дозволяє прокрутку
        showScrollIndicator={true} // Показує індикатор прокрутки

        // Обробник подій при виборі дати
        onDayPress={(day) => {
          console.log('Ви вибрали дату:', day.dateString);
          // Тут можеш додати навігацію на нову сторінку з відкриттям інформації про обрану дату
          router.push(`./outfits/${day.dateString}`);
        }}

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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
