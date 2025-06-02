import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator } from 'react-native';
import GetDate from '../components/date';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Button from '../components/Button';

type WeatherData = {
  id: number;
  weather_type: string;
  weather_date: string;
  min_tempurature: number;
  max_tempurature: number;
  precipitation: number;
  humidity: number;
  wind: number;
  weather_icon: string;
  city: string;
};

type OutfitItem = {
  id: number;
  category: string;
  photo_url: string;
  subcategory?: string | null;
  image?: string;
  cell_id?: string;
};

// Інтерфейс для збереженої комірки
interface SavedOutfitCell {
  id: number;
  cell_id: string;
  column_number: 1 | 2;
  flex_size: number;
  position_index: number;
  subcategories: string[];
  current_item_index: number;
  is_recommended: boolean;
  items: OutfitItem[];
}

const DayOutfit = ({ route }: { route: any }) => {
  const { day } = route.params; 
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [outfitId, setOutfitId] = useState<number | any>(null);
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
  const [outfitCells, setOutfitCells] = useState<SavedOutfitCell[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const navigation = useNavigation() as NavigationProp<any>;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Перевірка, чи вже опубліковано цей образ
  const checkIfPosted = async (outfitId: number) => {
    try {
      const { data, error, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('outfit_id', outfitId);
      
      if (error) {
        console.error('Error checking post status:', error.message);
        return false;
      }
      
      setIsPosted(count !== null && count > 0);
      return count !== null && count > 0;
    } catch (error) {
      console.error('Error checking if outfit is posted:', error);
      return false;
    }
  };

  const deleteOutfit = async () => {
    try {
      Alert.alert(
        'Підтвердження',
        'Ви впевнені, що хочете видалити цей образ?',
        [
          { text: 'Скасувати', style: 'cancel' },
          { 
            text: 'Видалити', 
            style: 'destructive',
            onPress: async () => {
              // Видаляємо комірки образу
              const { error: cellsError } = await supabase
                .from('outfit_cells')
                .delete()
                .eq('outfit_id', outfitId);
              
              if (cellsError) {
                console.error('Error deleting outfit cells:', cellsError.message);
              }

              // Видаляємо елементи образу
              const { error: outfitError } = await supabase
                .from('outfit_item')
                .delete()
                .eq('outfit_id', outfitId);
              
              if (outfitError) {
                console.error('Error deleting outfit items:', outfitError.message);
                return;
              }

              // Видаляємо сам образ
              const { error } = await supabase
                .from('outfits')
                .delete()
                .eq('id', outfitId); 
              
              if (error) {
                console.error('Error deleting outfit:', error.message);
                return;
              }

              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting outfit:', error);
    }
  };

  const shareOutfit = async () => {
    if (!outfitId || !session) {
      Alert.alert('Помилка', 'Не вдалося отримати дані образу');
      return;
    }

    try {
      setIsPosting(true);

      // Перевірка, чи вже опубліковано
      const alreadyPosted = await checkIfPosted(outfitId);
      
      if (alreadyPosted) {
        Alert.alert('Інформація', 'Цей образ вже опубліковано в спільноті');
        setIsPosting(false);
        return;
      }

      // Створення нового поста
      const { data, error } = await supabase
        .from('posts')
        .insert([
          { outfit_id: outfitId }
        ])
        .select();

      if (error) {
        console.error('Error creating post:', error.message);
        Alert.alert('Помилка', 'Не вдалося опублікувати образ');
      } else {
        Alert.alert('Успішно', 'Ваш образ опубліковано в спільноті');
        setIsPosted(true);
      }
    } catch (error) {
      console.error('Error sharing outfit:', error);
      Alert.alert('Помилка', 'Щось пішло не так при публікації образу');
    } finally {
      setIsPosting(false);
    }
  };

  const fetchOutfitCells = async (outfitId: number, outfitItems: OutfitItem[]) => {
    try {
      const { data: cellsData, error } = await supabase
        .from('outfit_cells')
        .select('*')
        .eq('outfit_id', outfitId)
        .order('position_index', { ascending: true });

      if (error) {
        console.error('Error fetching outfit cells:', error);
        setOutfitCells([]);
        return;
      }

      if (cellsData && cellsData.length > 0) {
        // Відтворюємо збережений layout
        const reconstructedCells: SavedOutfitCell[] = cellsData.map(cellData => {
          // Знаходимо елементи для цієї комірки
          const cellItems = outfitItems.filter(item => item.cell_id === cellData.cell_id);
          
          return {
            id: cellData.id,
            cell_id: cellData.cell_id,
            column_number: cellData.column_number as 1 | 2,
            flex_size: cellData.flex_size,
            position_index: cellData.position_index,
            subcategories: cellData.subcategories || [],
            current_item_index: cellData.current_item_index,
            is_recommended: cellData.is_recommended,
            items: cellItems
          };
        });

        setOutfitCells(reconstructedCells);
      } else {
        setOutfitCells([]);
      }
    } catch (error) {
      console.error('Error fetching outfit cells:', error);
      setOutfitCells([]);
    }
  };

  const fetchOutfitItems = async () => {
    if (!session) {
      return;
    }

    try {
      const { data: outfits, error: outfitsError } = await supabase
        .from('outfits')
        .select('id, weather_id')
        .eq('user_id', session.user.id)
        .eq('date', day);

      if (outfitsError) {
        console.error('Error fetching outfit ids:', outfitsError.message);
        return;
      }
      
      if (outfits.length === 0) {
        console.warn('No outfits found for the specified criteria.');
        setIsLoading(false);
        return;
      }

      const weatherId = outfits[0].weather_id;
      const { data: weatherData, error, count } = await supabase
        .from('weather')
        .select('*')
        .eq('id', weatherId);

      if (error) {
        console.error('Error fetching weather data:', error.message);
        return;
      }

      if (count === 0) {
        console.warn('No weather data found for the specified date.');
        return;
      }

      if (weatherData && weatherData.length > 0) {
        const latestWeather = weatherData[0];
        setWeatherData(latestWeather);
      }
      
      const outfitId = outfits[0].id;
      setOutfitId(outfitId);

      // Перевірка, чи опубліковано цей образ
      await checkIfPosted(outfitId);
      
      // Отримуємо елементи образу з cell_id
      const { data: outfitItemsData, error: outfitItemsError } = await supabase
        .from('outfit_item')
        .select('item_id, cell_id')
        .eq('outfit_id', outfitId);

      if (outfitItemsError) {
        console.error('Error fetching outfit items:', outfitItemsError.message);
        return;
      }

      if (outfitItemsData.length === 0) {
        console.warn('No outfit items found for the specified outfit id.');
        setIsLoading(false);
        return;
      }

      const itemIds = outfitItemsData.map(item => item.item_id);
      const { data: wardrobeItems, error: wardrobeError } = await supabase
        .from('wardrobe')
        .select('id, photo_url, category, subcategory, user_id')
        .in('id', itemIds);

      if (wardrobeError) {
        console.error('Error fetching wardrobe items:', wardrobeError.message);
        setIsLoading(false);
        return;
      }

      if (wardrobeItems) {
        const itemsWithUrls = await Promise.all(
          wardrobeItems.map(async (item) => {
            const { data } = await supabase.storage
              .from('clothes')
              .getPublicUrl(item.photo_url);

            // Знаходимо відповідний cell_id для цього елемента
            const outfitItemData = outfitItemsData.find(oi => oi.item_id === item.id);

            return { 
              ...item, 
              image: data?.publicUrl,
              cell_id: outfitItemData?.cell_id
            };
          })
        );

        setOutfitItems(itemsWithUrls);
        
        // Завантажуємо збережений layout комірок
        await fetchOutfitCells(outfitId, itemsWithUrls);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching outfit items:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOutfitItems();
    }
  }, [day, session]);

  // Рендер збереженої комірки (як в PostDetailScreen)
  const renderSavedCell = (cell: SavedOutfitCell) => {
    const cellHeight = cell.flex_size * 120;
    const currentItem = cell.items[cell.current_item_index] || cell.items[0];

    return (
      <View 
        key={cell.cell_id}
        style={[
          styles.cell,
          { height: cellHeight, minHeight: 120 }
        ]}
      >
        {/* Заголовок категорії */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryHeaderText}>
            {cell.subcategories[0] || 'Категорія'}
          </Text>
        </View>

        {/* Контент комірки */}
        <View style={styles.cellContent}>
          {currentItem && currentItem.image ? (
            <Image 
              source={{ uri: currentItem.image }} 
              style={styles.cellImage}
            />
          ) : (
            <View style={styles.emptyCellContent}>
              <Text style={styles.emptyCellText}>?</Text>
            </View>
          )}
        </View>

        {/* Індикатор множинних елементів */}
        {cell.items.length > 1 && (
          <View style={styles.multipleItemsIndicator}>
            <Text style={styles.multipleItemsText}>+{cell.items.length - 1}</Text>
          </View>
        )}
      </View>
    );
  };

  // Fallback рендер категорії (якщо немає збережених комірок)
  const renderCategory = (category: string, items: OutfitItem[]) => {
    return (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <View style={styles.categoryItems}>
          {items.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.outfitItem}>
              <Image 
                source={{ uri: item.image || item.photo_url }} 
                style={styles.outfitItemImage}
              />
              {item.subcategory && (
                <Text style={styles.subcategoryText}>{item.subcategory}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Fallback рендер для старого FlatList формату
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item}>
      <Image source={{ uri: item.image }} style={styles.image} />
    </TouchableOpacity>
  );

  // Перевіряємо чи є збережений layout
  const hasStoredLayout = outfitCells.length > 0;
  const column1Cells = outfitCells.filter(cell => cell.column_number === 1);
  const column2Cells = outfitCells.filter(cell => cell.column_number === 2);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Використовуємо GetDate як React компонент з правильним пропсом */}
        <View style={styles.titleContainer}>
          <GetDate day={weatherData?.weather_date || day} />
        </View>
        
        {weatherData && (
          <Text style={[styles.title, {fontSize: 18}]}>{weatherData.city}</Text>
        )}

        {/* Погодна інформація */}
        <View style={styles.weatherContainer}>
          <View style={styles.weatherLeft}>
            <View style={styles.temperatureRow}>
              {weatherData && (
                <Text style={styles.temperatureText}>
                  {weatherData.max_tempurature > 0 ? '+' : ''}{Math.round(weatherData.max_tempurature)}°
                </Text>
              )}
              {weatherData && (
                <Image
                  source={{ uri: `http://openweathermap.org/img/wn/${weatherData.weather_icon}.png` }}
                  style={styles.weatherIcon}
                />
              )}
            </View>
            {weatherData && (
              <Text style={styles.weatherType}>{weatherData.weather_type}</Text>
            )}
          </View>
          <View style={styles.weatherRight}>
            <Text style={styles.weatherDetail}>Вологість: {weatherData?.humidity}%</Text>
            <Text style={styles.weatherDetail}>Вітер: {weatherData?.wind} м/с</Text>
          </View>
        </View>

        {/* Секція з образом */}
        <View style={styles.outfitSection}>
          <Text style={styles.outfitTitle}>
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
              <Text>Завантаження образу...</Text>
            </View>
          ) : outfitItems.length > 0 ? (
            hasStoredLayout ? (
              // Відтворюємо збережений layout з Home
              <View style={styles.outfitBuilder}>
                <View style={styles.columnsContainer}>
                  {/* Колонка 1 */}
                  <View style={styles.column}>
                    {column1Cells.map(renderSavedCell)}
                  </View>
                  
                  {/* Колонка 2 */}
                  <View style={styles.column}>
                    {column2Cells.map(renderSavedCell)}
                  </View>
                </View>
              </View>
            ) : (
              // Fallback відображення по категоріях
              <View style={styles.outfitDisplay}>
                {Object.entries(
                  outfitItems.reduce((acc, item) => {
                    const category = item.category;
                    if (!acc[category]) {
                      acc[category] = [];
                    }
                    acc[category].push(item);
                    return acc;
                  }, {} as Record<string, OutfitItem[]>)
                ).map(([category, items]) => renderCategory(category, items))}
              </View>
            )
          ) : (
            <View style={styles.emptyOutfitContainer}>
              <Text style={styles.emptyOutfitText}>Образ порожній</Text>
            </View>
          )}
        </View>

        {/* Кнопки внизу контенту (не абсолютні) */}
        <View style={styles.buttonsSection}>
          <Button text="Видалити образ" onPress={deleteOutfit} />
          
          {isPosted ? (
            <Button 
              text="Опубліковано ✓" 
              onPress={() => {}} 
              disabled={true}
            />
          ) : (
            <Button 
              text={isPosting ? "Публікація..." : "Опублікувати в спільноті"} 
              onPress={shareOutfit} 
              disabled={isPosting}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  weatherContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20, 
    marginTop: 10,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  weatherLeft: {
    flex: 1,
  },
  temperatureRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5,
  },
  temperatureText: {
    fontSize: 32,
  },
  weatherIcon: {
    width: 60, 
    height: 50,
  },
  weatherType: {
    fontSize: 16,
    marginTop: 4,
  },
  weatherRight: {
    justifyContent: "center",
  },
  weatherDetail: {
    fontSize: 15,
  },
  outfitSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  layoutIndicator: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'normal',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyOutfitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyOutfitText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Стилі для збереженого layout (як в Home/PostDetailScreen)
  outfitBuilder: {
    paddingHorizontal: 4,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 15,
    minHeight: 300,
  },
  column: {
    flex: 1,
    gap: 15,
  },
  cell: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  categoryHeader: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  cellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  cellImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'contain',
  },
  emptyCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCellText: {
    fontSize: 32,
    color: '#bbb',
    fontWeight: 'bold',
  },
  multipleItemsIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  multipleItemsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Стилі для fallback відображення
  outfitDisplay: {
    gap: 20,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryItems: {
    alignItems: 'center',
    gap: 12,
  },
  outfitItem: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    width: 200,
  },
  outfitItemImage: {
    width: 160,
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Нова секція для кнопок всередині ScrollView
  buttonsSection: {
    paddingHorizontal: 0,
    paddingTop: 20,
    gap: 10,
  },
  // Старі стилі для fallback FlatList (на всякий випадок)
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  item: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    resizeMode: 'contain',
  },
});

export default DayOutfit;