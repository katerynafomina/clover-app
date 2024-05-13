import React from 'react';
import { Text } from 'react-native';

const GetDate = ({ day }: { day?: string }) => {
  // Get current date if day prop is not provided
  const currentDate = day ? new Date(day) : new Date();

  // Get day without leading zero
  const dayOfMonth = currentDate.getDate();

  // Array of month names in Ukrainian
  const monthNames = [
    'Січня',
    'Лютого',
    'Березня',
    'Квітня',
    'Травня',
    'Червня',
    'Липня',
    'Серпня',
    'Вересня',
    'Жовтня',
    'Листопада',
    'Грудня',
  ];

  // Get month name based on current month
  const monthIndex = currentDate.getMonth();
  const monthName = monthNames[monthIndex];

  // Get year
  const year = currentDate.getFullYear();

  // Concatenate day, month, and year
  const formattedDate = `${dayOfMonth} ${monthName} ${year}`;

  return <Text>{formattedDate}</Text>;
};

export default GetDate;
