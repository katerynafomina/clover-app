import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import GetDate from "../components/date";
import LocationToCity from "../components/location";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { categories, Category } from "../constants/Categoris";
import Button from "../components/Button";
import getCategoriesByTemperature from "../components/GetSubCategoryForTemperature";
import filterAndRandomizeCategories from "../components/GetCategoryForOutfut";

import { saveFeedback, loadFeedback } from "../components/feedback";

// Інтерфейс для елемента гардеробу
interface WardrobeItem {
  id: number;
  photo_url: string;
  category: string;
  subcategory: string | null;
  user_id: string;
  isAvailable: boolean;
  image?: string;
}

// Інтерфейс для адаптивної комірки
interface FlexibleCell {
  id: string;
  subcategories: string[];
  column: 1 | 2;
  flexSize: number; // розмір у частках (наприклад 2, 1, 0.5)
  currentItemIndex: number;
  isRecommended: boolean;
}

type Feedback = {
  [key: string]: number;
};

export default function Home() {
  const [latitude, setLatitude] = useState(0.0);
  const [longitude, setLongitude] = useState(0.0);
  const [city, setCity] = useState("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [outfitCells, setOutfitCells] = useState<FlexibleCell[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [lastUsedTemperature, setLastUsedTemperature] = useState<number | null>(
    null
  );

  const handleLocationChange = (
    city: string,
    latitude: number,
    longitude: number
  ) => {
    setCity(city);
    setLatitude(latitude);
    setLongitude(longitude);
  };

  LocationToCity({ onLocationChange: handleLocationChange });

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        if (latitude === undefined || longitude === undefined) {
          console.warn("Некоректні значення пропів latitude або longitude");
          return;
        }

        const apiKey = "44c35ae749a723b6da10c40ea25b18b6";
        const apiUrl1 = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=ua&units=metric`;
        const apiUrl2 = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&lang=ua&units=metric`;

        const response1 = await fetch(apiUrl1);
        const response2 = await fetch(apiUrl2);
        const data1 = await response1.json();
        const data2 = await response2.json();

        setWeatherData({
          temp: data1.main.temp,
          icon: data1.weather[0].icon,
          description: data1.weather[0].description,
          humidity: data1.main.humidity,
          speed: data1.wind.speed,
          forecast: data2.list.slice(0, 5),
        });
      } catch (error) {
        console.warn("Помилка при отриманні погодових даних:", error);
      }
    };

    if (latitude !== 0.0 && longitude !== 0.0) {
      fetchWeatherData();
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (weatherData) {
      const nowTemp = weatherData?.temp;
      const futureTemp = weatherData?.forecast?.[1]?.main?.temp;
      const temperature = Math.round((nowTemp + futureTemp) / 2);

      setLastUsedTemperature(temperature);
    }
  }, [weatherData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchItems = async () => {
        try {
          const { data: wardrobe, error } = await supabase
            .from("wardrobe")
            .select(
              'id, photo_url, category, user_id, subcategory, "isAvailable"'
            )
            .eq("user_id", session?.user.id)
            .eq('"isAvailable"', true);

          if (error) {
            console.error("Error fetching wardrobe items:", error.message);
          } else {
            const itemsWithUrls = await Promise.all(
              wardrobe.map(async (item) => {
                const { data } = await supabase.storage
                  .from("clothes")
                  .getPublicUrl(item.photo_url);

                return {
                  ...item,
                  image: data?.publicUrl,
                  isAvailable:
                    item.isAvailable !== undefined ? item.isAvailable : true,
                } as WardrobeItem;
              })
            );

            setWardrobeItems(itemsWithUrls);
          }
        } catch (error) {
          console.error("Error fetching wardrobe items:", error);
        }
      };

      if (session) {
        fetchItems();
      }
    }, [session])
  );

  const submitFeedback = async (subcategories: string[], feedback: boolean) => {
    if (!weatherData) return;
    await saveFeedback({
      subcategories,
      weather: weatherData.description,
      temperature: Math.round(weatherData.temp),
      feedback,
    });
  };

  // Генерація рекомендованих комірок на основі погоди
  useEffect(() => {
    if (weatherData && wardrobeItems.length > 0) {
      const temperature = lastUsedTemperature || Math.round(weatherData.temp);

      // Отримуємо рекомендовані категорії за температурою
      const recommendedCategories = getCategoriesByTemperature(temperature);

      // Отримуємо доступні підкатегорії з гардеробу
      const availableSubcategories = getUniqueSubCategories();

      // Фільтруємо та рандомізуємо категорії
      loadFeedback().then((feedback) => {
        const filteredCategories = filterAndRandomizeCategories(
          recommendedCategories.categories,
          availableSubcategories,
          feedback
        );

        // Будуємо комірки на основі отриманих категорій
        const recommendedCells: FlexibleCell[] = [];

        // Колонка 1: Головний убір (якщо є)
        if (filteredCategories.hat) {
          recommendedCells.push({
            id: "hat",
            subcategories: [filteredCategories.hat],
            column: 1,
            flexSize: 0.8,
            currentItemIndex: 0,
            isRecommended: true,
          });
        }

        // Колонка 1: Верхній одяг (coat)
        if (filteredCategories.coat) {
          recommendedCells.push({
            id: "outerwear",
            subcategories: [filteredCategories.coat],
            column: 1,
            flexSize: filteredCategories.hat ? 1.7 : 2.5,
            currentItemIndex: 0,
            isRecommended: true,
          });
        }

        // Колонка 1: Взуття
        if (filteredCategories.shoes) {
          recommendedCells.push({
            id: "shoes",
            subcategories: [filteredCategories.shoes],
            column: 1,
            flexSize: 1.5,
            currentItemIndex: 0,
            isRecommended: true,
          });
        }

        // Колонка 2: Середній шар (middle)
        if (filteredCategories.middle) {
          const isDress =
            filteredCategories.middle.includes("плаття") ||
            filteredCategories.middle.includes("Плаття") ||
            filteredCategories.middle.includes("Літні плаття") ||
            filteredCategories.middle.includes("Демісезонні плаття");

          recommendedCells.push({
            id: "middle",
            subcategories: [filteredCategories.middle],
            column: 2,
            flexSize: isDress ? 4 : 2, // Якщо плаття - займає всю колонку
            currentItemIndex: 0,
            isRecommended: true,
          });

          // Якщо не плаття - додаємо низ
          if (!isDress && filteredCategories.buttom) {
            recommendedCells.push({
              id: "bottom",
              subcategories: [filteredCategories.buttom],
              column: 2,
              flexSize: 2,
              currentItemIndex: 0,
              isRecommended: true,
            });
          }
        } else if (filteredCategories.buttom) {
          // Якщо немає middle, але є bottom
          recommendedCells.push({
            id: "bottom",
            subcategories: [filteredCategories.buttom],
            column: 2,
            flexSize: 4,
            currentItemIndex: 0,
            isRecommended: true,
          });
        }

        // Fallback - якщо немає рекомендованих категорій, показуємо основні
        if (recommendedCells.length === 0) {
          // Додаємо базові категорії з наявного одягу
          const availableCategories = Array.from(
            new Set(wardrobeItems.map((item) => item.category))
          );

          availableCategories.forEach((category, index) => {
            const subcategoriesForCategory = wardrobeItems
              .filter((item) => item.category === category)
              .map((item) => item.subcategory)
              .filter((sub): sub is string => sub !== null);

            if (subcategoriesForCategory.length > 0) {
              recommendedCells.push({
                id: `fallback-${index}`,
                subcategories: Array.from(new Set(subcategoriesForCategory)),
                column: index % 2 === 0 ? 1 : 2,
                flexSize: 1.5,
                currentItemIndex: 0,
                isRecommended: false,
              });
            }
          });
        }

        setOutfitCells(recommendedCells);
        setShowRatingPrompt(true);
      });
    } else {
    }
  }, [lastUsedTemperature]);

  const getUniqueSubCategories = () => {
    const subcategories = Array.from(
      new Set(wardrobeItems.map((item) => item.subcategory))
    ).filter((subcategory): subcategory is string => subcategory !== null);
    return subcategories;
  };

  // Отримання елементів для конкретної комірки
  const getItemsForCell = (cell: FlexibleCell): WardrobeItem[] => {
    const items = wardrobeItems.filter(
      (item) =>
        cell.subcategories.includes(item.subcategory || "") && item.isAvailable
    );

    return items;
  };

  // Отримання поточного елемента для комірки
  const getCurrentItemForCell = (cell: FlexibleCell): WardrobeItem | null => {
    const items = getItemsForCell(cell);
    if (items.length === 0) return null;

    const validIndex = Math.min(cell.currentItemIndex, items.length - 1);
    return items[validIndex] || null;
  };

  // Навігація між елементами в комірці
  const nextItemInCell = (cellId: string) => {
    setOutfitCells((prevCells) =>
      prevCells.map((cell) => {
        if (cell.id === cellId) {
          const items = getItemsForCell(cell);
          if (items.length === 0) return cell;

          const nextIndex = (cell.currentItemIndex + 1) % items.length;
          return { ...cell, currentItemIndex: nextIndex };
        }
        return cell;
      })
    );
  };

  const prevItemInCell = (cellId: string) => {
    setOutfitCells((prevCells) =>
      prevCells.map((cell) => {
        if (cell.id === cellId) {
          const items = getItemsForCell(cell);
          if (items.length === 0) return cell;

          const prevIndex =
            cell.currentItemIndex === 0
              ? items.length - 1
              : cell.currentItemIndex - 1;
          return { ...cell, currentItemIndex: prevIndex };
        }
        return cell;
      })
    );
  };

  // Переміщення комірки між колонками
  const switchCellColumn = (cellId: string) => {
    setOutfitCells((prevCells) =>
      prevCells.map((cell) =>
        cell.id === cellId
          ? { ...cell, column: cell.column === 1 ? 2 : (1 as 1 | 2) }
          : cell
      )
    );
  };

  // Видалення категорії
  const deleteCategory = (cellId: string) => {
    Alert.alert(
      "Видалити категорію",
      "Ви впевнені, що хочете видалити цю категорію?",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: () => {
            setOutfitCells((prevCells) => {
              const updatedCells = prevCells.filter(
                (cell) => cell.id !== cellId
              );
              return updatedCells;
            });
            setShowEditModal(false);
            setSelectedCellId(null);
          },
        },
      ]
    );
  };

  // Збільшення розміру комірки
  const increaseCellSize = (cellId: string) => {
    setOutfitCells((prevCells) =>
      prevCells.map((cell) =>
        cell.id === cellId
          ? { ...cell, flexSize: Math.min(cell.flexSize + 0.5, 4) }
          : cell
      )
    );
  };

  // Зменшення розміру комірки
  const decreaseCellSize = (cellId: string) => {
    setOutfitCells((prevCells) =>
      prevCells.map((cell) =>
        cell.id === cellId
          ? { ...cell, flexSize: Math.max(cell.flexSize - 0.5, 0.5) }
          : cell
      )
    );
  };

  // Заміна категорії в комірці
  const replaceCategoryInCell = (cellId: string, newCategoryId: number) => {
    const selectedCategory = categories.find((cat) => cat.id === newCategoryId);
    if (!selectedCategory) {
      return;
    }

    // Якщо це плаття - перебудовуємо структуру
    if (selectedCategory.name === "Плаття") {
      setOutfitCells((prevCells) => {
        // Видаляємо всі комірки з колонки 2
        const filteredCells = prevCells.filter((c) => c.column !== 2);

        // Додаємо комірку з платтям на всю колонку 2
        filteredCells.push({
          id:
            cellId.startsWith("middle") || cellId.startsWith("bottom")
              ? cellId
              : "dress",
          subcategories: selectedCategory.subcategories,
          column: 2,
          flexSize: 4,
          currentItemIndex: 0,
          isRecommended: true,
        });

        return filteredCells;
      });
    } else {
      // Звичайна заміна категорії
      setOutfitCells((prevCells) =>
        prevCells.map((cell) => {
          if (cell.id === cellId) {
            return {
              ...cell,
              subcategories: selectedCategory.subcategories,
              currentItemIndex: 0,
            };
          }
          return cell;
        })
      );
    }

    setShowCategoryModal(false);
    setSelectedCellId(null);
  };

  // Додавання нової категорії (аксесуари, сумки)
  const addNewCategory = (categoryId: number) => {
    const selectedCategory = categories.find((cat) => cat.id === categoryId);
    if (!selectedCategory) {
      return;
    }

    const newCellId = `added-${Date.now()}`;

    // Зменшуємо розмір інших комірок і додаємо нову
    setOutfitCells((prevCells) => {
      const updatedCells = prevCells.map((cell) => {
        if (cell.id === "outerwear") {
          return { ...cell, flexSize: Math.max(1, cell.flexSize - 0.5) };
        }
        return cell;
      });

      // Додаємо нову комірку
      updatedCells.push({
        id: newCellId,
        subcategories: selectedCategory.subcategories,
        column: 1,
        flexSize: 0.5,
        currentItemIndex: 0,
        isRecommended: false,
      });

      return updatedCells;
    });

    setShowCategoryModal(false);
    setSelectedCellId(null);
  };

  // Отримання іконки категорії
  const getCategoryIcon = (subcategories: string[]) => {
    if (subcategories.length === 0) return null;

    // Знаходимо категорію за підкатегорією
    const category = categories.find((cat) =>
      cat.subcategories.some((sub) => subcategories.includes(sub))
    );
    return category?.image;
  };

  // Отримання назви категорії
  const getCategoryName = (subcategories: string[]): string => {
    if (subcategories.length === 0) return "Додати";

    // Якщо тільки одна підкатегорія - показуємо її
    if (subcategories.length === 1) {
      return subcategories[0];
    }

    // Знаходимо основну категорію за підкатегорією
    const category = categories.find((cat) =>
      cat.subcategories.some((sub) => subcategories.includes(sub))
    );
    return category?.name || "Категорія";
  };

  // Рендер комірки
  const renderCell = (cell: FlexibleCell) => {
    const currentItem = getCurrentItemForCell(cell);
    const items = getItemsForCell(cell);
    const hasItems = items.length > 0;
    const hasMultipleItems = items.length > 1;

    const cellHeight = cell.flexSize * 120; // Збільшена базова висота 120px на одиницю

    return (
      <View
        key={cell.id}
        style={[styles.cell, { height: cellHeight, minHeight: 120 }]}
      >
        {/* Заголовок категорії */}
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => {
            setSelectedCellId(cell.id);
            setShowEditModal(true);
          }}
          onLongPress={() => {
            setSelectedCellId(cell.id);
            setShowCategoryModal(true);
          }}
        >
          <View style={styles.headerButtons}>
            {!editMode && (
              <Image
                style={styles.iconStyle}
                source={require("../assets/settings.png")}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Контент комірки */}
        <TouchableOpacity
          style={styles.cellContent}
          onLongPress={() => {
            setSelectedCellId(cell.id);
            setShowCategoryModal(true);
          }}
        >
          {hasItems && currentItem ? (
            <Image
              source={{ uri: currentItem.image }}
              style={styles.cellImage}
            />
          ) : (
            <View style={styles.emptyCellContent}>
              {getCategoryIcon(cell.subcategories) ? (
                <Image
                  source={getCategoryIcon(cell.subcategories)}
                  style={styles.categoryIcon}
                />
              ) : (
                <Text style={styles.emptyCellText}>+</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Навігаційні кнопки */}
        {hasMultipleItems && (
          <>
            {!editMode && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={() => {
                  prevItemInCell(cell.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
            )}
            {!editMode && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => {
                  nextItemInCell(cell.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Індикатор кількості елементів */}
        {hasMultipleItems && !editMode && (
          <View style={styles.itemCounter}>
            <Text style={styles.itemCounterText}>
              {cell.currentItemIndex + 1}/{items.length}
            </Text>
          </View>
        )}

        {/* Швидкі кнопки зміни розміру та переміщення - показуємо тільки в режимі редагування */}
        {editMode && (
          <>
            <View style={styles.quickSizeControls}>
              <TouchableOpacity
                style={[styles.quickSizeButton, styles.quickResizeButton]}
                onPress={() => increaseCellSize(cell.id)}
              >
                <Image
                  style={styles.quickResizeIcon}
                  source={require("../assets/icons8-plus-48.png")}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickSizeButton, styles.quickResizeButton]}
                onPress={() => decreaseCellSize(cell.id)}
              >
                <Image
                  style={styles.quickResizeIcon}
                  source={require("../assets/icons8-minus-48.png")}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.quickColumnSwitch}
              onPress={() => switchCellColumn(cell.id)}
            >
              <Image
                style={styles.quickResizeIcon}
                source={require("../assets/icons8-left-right-arrow-66.png")}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // Збереження образу
  // Оновлена функція збереження образу в Home компоненті
  const saveOutfit = async () => {
    try {
      const currentDate = new Date().toISOString();

      // Збираємо всі вибрані елементи з комірок
      const outfitItems: WardrobeItem[] = [];
      const cellsData: any[] = [];

      outfitCells.forEach((cell, index) => {
        const currentItem = getCurrentItemForCell(cell);
        if (currentItem) {
          outfitItems.push(currentItem);
        }

        // Зберігаємо інформацію про комірку
        cellsData.push({
          cell_id: cell.id,
          column_number: cell.column,
          flex_size: cell.flexSize,
          position_index: index,
          subcategories: cell.subcategories,
          current_item_index: cell.currentItemIndex,
          is_recommended: cell.isRecommended,
        });
      });

      if (outfitItems.length === 0) {
        Alert.alert("Увага", "Оберіть хоча б один елемент одягу для образу.");
        return;
      }

      // Перевіряємо чи існує образ на цю дату
      const { data: existingOutfits, error: existingOutfitsError } =
        await supabase
          .from("outfits")
          .select("id")
          .eq("user_id", session?.user.id)
          .eq("date", currentDate.split("T")[0]);

      if (existingOutfitsError) {
        throw existingOutfitsError;
      }

      if (existingOutfits && existingOutfits.length > 0) {
        Alert.alert("Увага", "Образ для цієї дати вже існує.");
        return;
      }

      if (!weatherData) {
        Alert.alert("Помилка", "Немає погодних даних для збереження.");
        return;
      }

      // Зберігаємо погодні дані
      const { data: weather, error: WeatherError } = await supabase
        .from("weather")
        .insert([
          {
            date: currentDate,
            min_tempurature: Math.round(weatherData.temp),
            max_tempurature: Math.round(weatherData.temp),
            humidity: weatherData.humidity,
            precipitation: weatherData.humidity,
            wind: weatherData.speed,
            weather_type: weatherData.description,
            city: city,
            weather_icon: weatherData.icon,
          },
        ])
        .select();

      if (WeatherError) {
        throw WeatherError;
      }

      if (weather && weather.length > 0) {
        const weatherId = weather[0].id;

        // Зберігаємо образ
        const { data: outfit, error: OutfitError } = await supabase
          .from("outfits")
          .insert([
            {
              user_id: session?.user.id,
              weather_id: weatherId,
              date: currentDate,
            },
          ])
          .select("id");

        if (OutfitError) {
          throw OutfitError;
        }

        if (outfit && outfit.length > 0) {
          const outfitId = outfit[0].id;

          // Зберігаємо інформацію про комірки
          const { error: CellsError } = await supabase
            .from("outfit_cells")
            .insert(
              cellsData.map((cell) => ({
                ...cell,
                outfit_id: outfitId,
              }))
            );

          if (CellsError) {
            throw CellsError;
          }

          // Зберігаємо елементи образу з прив'язкою до комірок
          const itemsToInsert = outfitItems.map((item) => {
            // Знаходимо відповідну комірку для цього елемента
            const correspondingCell = outfitCells.find((cell) => {
              const cellItems = getItemsForCell(cell);
              return cellItems.some((cellItem) => cellItem.id === item.id);
            });

            return {
              outfit_id: outfitId,
              item_id: item.id,
              cell_id: correspondingCell?.id || null,
            };
          });

          const { error: InsertError } = await supabase
            .from("outfit_item")
            .insert(itemsToInsert);

          if (InsertError) {
            throw InsertError;
          }

          Alert.alert("Успішно", "Образ успішно збережено!");
        }
      }
    } catch (error) {
      console.error("Error saving outfit:", error);
      Alert.alert("Помилка", "Не вдалося зберегти образ. Спробуйте ще раз.");
    }
  };

  // Розділення комірок по колонках
  const column1Cells = outfitCells.filter((cell) => cell.column === 1);
  const column2Cells = outfitCells.filter((cell) => cell.column === 2);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        bounces={true}
      >
        {/* Заголовок та погода */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            <GetDate />
          </Text>
          {city ? (
            <Text style={{ fontSize: 15 }}>{city}</Text>
          ) : (
            <Text>Очікуємо...</Text>
          )}
        </View>

        {/* Поточна погода */}
        <View style={styles.weatherContainer}>
          <View style={styles.weatherContent}>
            <View style={styles.weatherRow}>
              <View>
                <Text style={{ fontSize: 15 }}>зараз</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  {weatherData && (
                    <Text style={{ fontSize: 32 }}>
                      {weatherData.temp > 0 ? "+" : ""}
                      {Math.round(weatherData.temp)}°
                    </Text>
                  )}
                  {weatherData && (
                    <Image
                      source={{
                        uri: `http://openweathermap.org/img/wn/${weatherData.icon}.png`,
                      }}
                      style={{ width: 60, height: 50 }}
                    />
                  )}
                </View>
                {weatherData && <Text>{weatherData.description}</Text>}
              </View>
              <View style={{ justifyContent: "center" }}>
                <Text style={{ fontSize: 15 }}>
                  Вологість: {weatherData?.humidity}%
                </Text>
                <Text style={{ fontSize: 15 }}>
                  Вітер: {weatherData?.speed} м/с
                </Text>
              </View>
            </View>
            <FlatList
              style={{ maxHeight: 150, marginBottom: 20 , alignSelf: "center"}}
              data={weatherData?.forecast}
              keyExtractor={(item) => item.dt.toString()}
              renderItem={({ item }) => {
                const date = new Date(item.dt * 1000);
                return (
                  <View style={{ alignItems: "center" }}>
                    <Image
                      source={{
                        uri: `http://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
                      }}
                      style={{ width: 60, height: 50 }}
                    />
                    <Text style={{ fontSize: 20, marginBottom: 12 }}>
                      {item.main.temp > 0 ? "+" : ""}
                      {Math.round(item.main.temp)}°
                    </Text>
                    <Text style={{ fontSize: 15 }}>
                      {date.toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                );
              }}
              numColumns={8}
              contentContainerStyle={{}}
              columnWrapperStyle={{ gap: 10 }}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* Конструктор образу */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Створіть свій образ</Text>
          <TouchableOpacity
            style={[
              styles.editModeButton,
              editMode && styles.editModeButtonActive,
            ]}
            onPress={() => {
              setEditMode(!editMode);
            }}
          >
            {editMode ? (
              <View>
                <Text
                  style={[
                    styles.editModeButtonText,
                    editMode && styles.editModeButtonTextActive,
                  ]}
                >
                  Готово{" "}
                </Text>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Image
                  style={styles.iconStyle}
                  source={require("../assets/settings.png")}
                />
                <Text
                  style={[
                    styles.editModeButtonText,
                    editMode && styles.editModeButtonTextActive,
                  ]}
                >
                  Редагувати
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {editMode && (
          <View style={styles.editInstructions}>
            <Text style={styles.instructionsText}>
              Зажміть комірку для редагування • Використовуйте кнопки +/− для
              зміни розміру • ↔ для переміщення між колонками
            </Text>
          </View>
        )}

        {outfitCells.length > 0 ? (
          <View style={styles.outfitBuilder}>
            <View style={styles.columnsContainer}>
              {/* Колонка 1 */}
              <View style={styles.column}>{column1Cells.map(renderCell)}</View>

              {/* Колонка 2 */}
              <View style={styles.column}>{column2Cells.map(renderCell)}</View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Завантаження рекомендацій...</Text>
          </View>
        )}

        {showRatingPrompt && (
          <View style={styles.ratingBanner}>
            <Text style={styles.ratingText}>Вам подобається цей образ?</Text>
            <View style={styles.ratingButtons}>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={async () => {
                  await submitFeedback(
                    outfitCells.flatMap((cell) => cell.subcategories),
                    true
                  );
                  setShowRatingPrompt(false);
                }}
              >
                <Text style={styles.likeText}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dislikeButton}
                onPress={async () => {
                  await submitFeedback(
                    outfitCells.flatMap((cell) => cell.subcategories),
                    false
                  );
                  setShowRatingPrompt(false);
                }}
              >
                <Text style={styles.dislikeText}>👎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRatingPrompt(false)}>
                <Text style={{ fontSize: 16, marginLeft: 10, color: "#666" }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Кнопка додавання аксесуарів */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.addAccessoryButton}
            onPress={() => {
              setSelectedCellId("new");
              setShowCategoryModal(true);
            }}
          >
            <Text style={styles.addAccessoryText}>+ Додати категорію</Text>
          </TouchableOpacity>

          <Button text="Зберегти образ" onPress={saveOutfit} />
        </View>

        <View style={{ height: 50 }}></View>
      </ScrollView>

      {/* Модал вибору категорії */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCategoryModal(false);
          setSelectedCellId(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowCategoryModal(false);
            setSelectedCellId(null);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {selectedCellId === "new"
                ? "Додати категорію"
                : "Замінити категорію"}
            </Text>

            <ScrollView
              style={styles.categoriesList}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => {
                    if (selectedCellId === "new") {
                      addNewCategory(category.id);
                    } else if (selectedCellId) {
                      replaceCategoryInCell(selectedCellId, category.id);
                    }
                  }}
                >
                  <Image
                    source={category.image}
                    style={styles.categoryItemIcon}
                  />
                  <Text style={styles.categoryItemText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowCategoryModal(false);
                setSelectedCellId(null);
              }}
            >
              <Text style={styles.closeModalText}>Закрити</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Модал редагування категорії */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedCellId(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowEditModal(false);
            setSelectedCellId(null);
          }}
        >
          <Pressable
            style={styles.editModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Редагувати категорію</Text>

            {selectedCellId && (
              <View style={styles.editOptions}>
                {/* Зміна колонки */}
                <View style={styles.columnControls}>
                  <Text style={styles.sizeLabel}>Переміщення:</Text>
                  <TouchableOpacity
                    style={styles.columnSwitchButton}
                    onPress={() => switchCellColumn(selectedCellId)}
                  >
                    <Image
                      style={styles.quickResizeIcon}
                      source={require("../assets/icons8-left-right-arrow-66.png")}
                    />
                    <Text style={styles.columnSwitchText}>
                      Перемістити в{" "}
                      {outfitCells.find((cell) => cell.id === selectedCellId)
                        ?.column === 1
                        ? "2-у"
                        : "1-у"}{" "}
                      колонку
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Зміна розміру */}
                <View style={styles.sizeControls}>
                  <Text style={styles.sizeLabel}>Розмір комірки:</Text>
                  <View style={styles.sizeButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.sizeButton, styles.decreaseButton]}
                      onPress={() => decreaseCellSize(selectedCellId)}
                    >
                      <Text style={styles.sizeButtonText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.currentSize}>
                      {outfitCells.find((cell) => cell.id === selectedCellId)
                        ?.flexSize || 1}
                    </Text>

                    <TouchableOpacity
                      style={[styles.sizeButton, styles.increaseButton]}
                      onPress={() => increaseCellSize(selectedCellId)}
                    >
                      <Text style={styles.sizeButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Кнопки дій */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.replaceButton]}
                    onPress={() => {
                      setShowEditModal(false);
                      setShowCategoryModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Замінити</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteCategory(selectedCellId)}
                  >
                    <Text style={styles.actionButtonText}>Видалити</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowEditModal(false);
                setSelectedCellId(null);
              }}
            >
              <Text style={styles.closeModalText}>Закрити</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  headerContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  weatherContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  weatherContent: {
    width: "100%",
  },
  weatherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  outfitBuilder: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  columnsContainer: {
    flexDirection: "row",
    gap: 15,
    minHeight: 400,
  },
  column: {
    flex: 1,
    gap: 15,
  },
  cell: {
    backgroundColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  categoryHeader: {
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryHeaderEditMode: {
    backgroundColor: "#d1ecf1",
    borderBottomWidth: 2,
    borderBottomColor: "#007bff",
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
  },
  editIcon: {
    fontSize: 12,
  },
  cellContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  cellImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    resizeMode: "contain",
  },
  emptyCellContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryIcon: {
    width: 60,
    height: 60,
    opacity: 0.6,
  },
  emptyCellText: {
    fontSize: 32,
    color: "#bbb",
    fontWeight: "bold",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  navButtonText: {
    color: "black",
    fontSize: 20,
    fontWeight: "bold",
  },
  itemCounter: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCounterText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  addAccessoryButton: {
    backgroundColor: "transparent",
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#000",
  },
  addAccessoryText: {
    textAlign: "center",
    fontSize: 16,
    color: "#000",
    fontWeight: "600",
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    gap: 15,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  categoriesList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryItemIcon: {
    width: 30,
    height: 30,
    marginRight: 15,
  },
  categoryItemText: {
    fontSize: 16,
    flex: 1,
  },
  closeModalButton: {
    backgroundColor: "transparent",
    borderRadius: 40,
    paddingVertical: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sizeText: {
    fontSize: 10,
    fontWeight: "400",
    color: "#495057",
    backgroundColor: "#000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  editModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    shadowColor: "##dbdbdb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  columnControls: {
    alignItems: "center",
  },
  columnSwitchButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  columnSwitchText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  editOptions: {
    gap: 20,
    marginBottom: 20,
  },
  sizeControls: {
    alignItems: "center",
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 15,
    textAlign: "center",
  },
  sizeButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  sizeButton: {
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  decreaseButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#000",
  },
  increaseButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#000",
  },
  sizeButtonText: {
    color: "#000",
    fontSize: 24,
    fontWeight: "light",
    textAlign: "center",
  },
  currentSize: {
    fontSize: 24,
    fontWeight: "light",
    color: "#000",
    minWidth: 40,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  replaceButton: {
    backgroundColor: "transparent",
  },
  deleteButton: {
    backgroundColor: "transparent",
  },
  actionButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "400",
  },
  editInstructions: {
    backgroundColor: "#f7f7f7",
    borderBottomRightRadius: 10,
    borderTopRightRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderLeftWidth: 2,
    borderLeftColor: "#00ffdl",
  },
  instructionsText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "left",
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  editModeButton: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
  },
  editModeButtonActive: {
    backgroundColor: "transparent",
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  editModeButtonText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#000",
  },
  editModeButtonTextActive: {
    color: "#000",
  },
  quickSizeControls: {
    position: "absolute",
    top: 5,
    left: 5,
    flexDirection: "column",
    gap: 2,
  },
  quickSizeButton: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  quickResizeButton: {
    backgroundColor: "transparent",
  },
  quickResizeIcon: {
    height: 20,
    width: 20,
  },
  quickColumnSwitch: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "transparent",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
  },
  closeModalText: {
    color: "black",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  iconStyle: {
    width: 16,
    height: 16,
  },
  ratingBanner: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: "column",
    alignItems: "center",
  },

  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  likeButton: {
    backgroundColor: "transparent",
    padding: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#000",
  },
  dislikeButton: {
    backgroundColor: "transparent",
    padding: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#000",
  },
  likeText: { fontSize: 18 },
  dislikeText: { fontSize: 18 },
});
