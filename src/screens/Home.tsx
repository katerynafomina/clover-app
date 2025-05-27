import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, Image, ScrollView, Pressable, TouchableOpacity, Alert, Modal } from 'react-native';
import GetDate from '../components/date';
import LocationToCity from '../components/location';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { categories, Category } from '../constants/Categoris';
import Button from '../components/Button';
import getCategoriesByTemperature from '../components/GetSubCategoryForTemperature';
import filterAndRandomizeCategories from '../components/GetCategoryForOutfut';

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

export default function Home() {
    const [latitude, setLatitude] = useState(0.0);
    const [longitude, setLongitude] = useState(0.0);
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState<any>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [outfitCells, setOutfitCells] = useState<FlexibleCell[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    const handleLocationChange = (city: string, latitude: number, longitude: number) => {
        setCity(city);
        setLatitude(latitude);
        setLongitude(longitude);
    };

    LocationToCity({ onLocationChange: handleLocationChange });

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

                setWeatherData({
                    temp: data1.main.temp,
                    icon: data1.weather[0].icon,
                    description: data1.weather[0].description,
                    humidity: data1.main.humidity,
                    speed: data1.wind.speed,
                    forecast: data2.list.slice(0, 5)
                });
            } catch (error) {
                console.warn('Помилка при отриманні погодових даних:', error);
            }
        };

        if (latitude !== 0.0 && longitude !== 0.0) {
            fetchWeatherData();
        }
    }, [latitude, longitude]);

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
                        .from('wardrobe')
                        .select('id, photo_url, category, user_id, subcategory, "isAvailable"')
                        .eq('user_id', session?.user.id)
                        .eq('"isAvailable"', true);

                    if (error) {
                        console.error('Error fetching wardrobe items:', error.message);
                    } else {
                        const itemsWithUrls = await Promise.all(
                            wardrobe.map(async (item) => {
                                const { data } = await supabase.storage
                                    .from('clothes')
                                    .getPublicUrl(item.photo_url);

                                return { 
                                    ...item, 
                                    image: data?.publicUrl,
                                    isAvailable: item.isAvailable !== undefined ? item.isAvailable : true
                                } as WardrobeItem;
                            })
                        );

                        setWardrobeItems(itemsWithUrls);
                    }
                } catch (error) {
                    console.error('Error fetching wardrobe items:', error);
                }
            };

            if (session) {
                fetchItems();
            }
        }, [session])
    );

    // Генерація рекомендованих комірок на основі погоди
    useEffect(() => {
        if (weatherData && wardrobeItems.length > 0) {
            console.log('Generating outfit cells...');
            const temperature = weatherData.temp;
            
            // Отримуємо рекомендовані категорії за температурою
            const recommendedCategories = getCategoriesByTemperature(temperature);
            
            // Отримуємо доступні підкатегорії з гардеробу
            const availableSubcategories = getUniqueSubCategories();
            
            // Фільтруємо та рандомізуємо категорії
            const filteredCategories = filterAndRandomizeCategories(recommendedCategories, availableSubcategories);
            
            console.log('Temperature:', temperature);
            console.log('Recommended categories:', recommendedCategories);
            console.log('Available subcategories:', availableSubcategories);
            console.log('Filtered categories:', filteredCategories);
            
            // Будуємо комірки на основі отриманих категорій
            const recommendedCells: FlexibleCell[] = [];
            
            // Колонка 1: Головний убір (якщо є)
            if (filteredCategories.hat) {
                recommendedCells.push({
                    id: 'hat',
                    subcategories: [filteredCategories.hat],
                    column: 1,
                    flexSize: 0.8,
                    currentItemIndex: 0,
                    isRecommended: true
                });
            }
            
            // Колонка 1: Верхній одяг (coat)
            if (filteredCategories.coat) {
                recommendedCells.push({
                    id: 'outerwear',
                    subcategories: [filteredCategories.coat],
                    column: 1,
                    flexSize: filteredCategories.hat ? 1.7 : 2.5,
                    currentItemIndex: 0,
                    isRecommended: true
                });
            }
            
            // Колонка 1: Взуття
            if (filteredCategories.shoes) {
                recommendedCells.push({
                    id: 'shoes',
                    subcategories: [filteredCategories.shoes],
                    column: 1,
                    flexSize: 1.5,
                    currentItemIndex: 0,
                    isRecommended: true
                });
            }
            
            // Колонка 2: Середній шар (middle) 
            if (filteredCategories.middle) {
                const isDress = filteredCategories.middle.includes('плаття') || 
                               filteredCategories.middle.includes('Плаття') ||
                               filteredCategories.middle.includes('Літні плаття') ||
                               filteredCategories.middle.includes('Демісезонні плаття');
                               
                recommendedCells.push({
                    id: 'middle',
                    subcategories: [filteredCategories.middle],
                    column: 2,
                    flexSize: isDress ? 4 : 2, // Якщо плаття - займає всю колонку
                    currentItemIndex: 0,
                    isRecommended: true
                });
                
                // Якщо не плаття - додаємо низ
                if (!isDress && filteredCategories.buttom) {
                    recommendedCells.push({
                        id: 'bottom',
                        subcategories: [filteredCategories.buttom],
                        column: 2,
                        flexSize: 2,
                        currentItemIndex: 0,
                        isRecommended: true
                    });
                }
            } else if (filteredCategories.buttom) {
                // Якщо немає middle, але є bottom
                recommendedCells.push({
                    id: 'bottom',
                    subcategories: [filteredCategories.buttom],
                    column: 2,
                    flexSize: 4,
                    currentItemIndex: 0,
                    isRecommended: true
                });
            }

            // Fallback - якщо немає рекомендованих категорій, показуємо основні
            if (recommendedCells.length === 0) {
                console.log('No recommended categories found, using fallback');
                // Додаємо базові категорії з наявного одягу
                const availableCategories = Array.from(new Set(wardrobeItems.map(item => item.category)));
                
                availableCategories.forEach((category, index) => {
                    const subcategoriesForCategory = wardrobeItems
                        .filter(item => item.category === category)
                        .map(item => item.subcategory)
                        .filter((sub): sub is string => sub !== null);
                    
                    if (subcategoriesForCategory.length > 0) {
                        recommendedCells.push({
                            id: `fallback-${index}`,
                            subcategories: Array.from(new Set(subcategoriesForCategory)),
                            column: index % 2 === 0 ? 1 : 2,
                            flexSize: 1.5,
                            currentItemIndex: 0,
                            isRecommended: false
                        });
                    }
                });
            }

            setOutfitCells(recommendedCells);
            console.log('Created outfit cells:', recommendedCells.length, recommendedCells);
        } else {
            console.log('Waiting for weather data or wardrobe items...', {
                hasWeatherData: !!weatherData,
                wardrobeItemsCount: wardrobeItems.length
            });
        }
    }, [weatherData, wardrobeItems]);

    const getUniqueSubCategories = () => {
        const subcategories = Array.from(new Set(wardrobeItems.map(item => item.subcategory))).filter(
            (subcategory): subcategory is string => subcategory !== null
        );
        console.log('All unique subcategories in wardrobe:', subcategories);
        return subcategories;
    };

    // Додаткове логування змін стану комірок
    useEffect(() => {
        console.log('Outfit cells updated:', outfitCells.map(cell => ({
            id: cell.id,
            subcategories: cell.subcategories,
            column: cell.column,
            flexSize: cell.flexSize,
            itemsCount: getItemsForCell(cell).length
        })));
    }, [outfitCells]);

    // Отримання елементів для конкретної комірки
    const getItemsForCell = (cell: FlexibleCell): WardrobeItem[] => {
        const items = wardrobeItems.filter(item => 
            cell.subcategories.includes(item.subcategory || '') && item.isAvailable
        );
        
        console.log(`Items for cell ${cell.id}:`, {
            subcategories: cell.subcategories,
            foundItems: items.length,
            itemSubcategories: items.map(item => item.subcategory)
        });
        
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
        console.log('Next item in cell:', cellId);
        setOutfitCells(prevCells => 
            prevCells.map(cell => {
                if (cell.id === cellId) {
                    const items = getItemsForCell(cell);
                    console.log('Items in cell:', items.length);
                    if (items.length === 0) return cell;
                    
                    const nextIndex = (cell.currentItemIndex + 1) % items.length;
                    console.log('Next index:', nextIndex);
                    return { ...cell, currentItemIndex: nextIndex };
                }
                return cell;
            })
        );
    };

    const prevItemInCell = (cellId: string) => {
        console.log('Previous item in cell:', cellId);
        setOutfitCells(prevCells => 
            prevCells.map(cell => {
                if (cell.id === cellId) {
                    const items = getItemsForCell(cell);
                    console.log('Items in cell:', items.length);
                    if (items.length === 0) return cell;
                    
                    const prevIndex = cell.currentItemIndex === 0 
                        ? items.length - 1 
                        : cell.currentItemIndex - 1;
                    console.log('Previous index:', prevIndex);
                    return { ...cell, currentItemIndex: prevIndex };
                }
                return cell;
            })
        );
    };

    // Переміщення комірки між колонками
    const switchCellColumn = (cellId: string) => {
        console.log('Switching column for cell:', cellId);
        setOutfitCells(prevCells => 
            prevCells.map(cell => 
                cell.id === cellId 
                    ? { ...cell, column: cell.column === 1 ? 2 : 1 as (1 | 2) }
                    : cell
            )
        );
    };

    // Видалення категорії
    const deleteCategory = (cellId: string) => {
        console.log('Deleting category from cell:', cellId);
        
        Alert.alert(
            'Видалити категорію',
            'Ви впевнені, що хочете видалити цю категорію?',
            [
                { text: 'Скасувати', style: 'cancel' },
                { 
                    text: 'Видалити', 
                    style: 'destructive',
                    onPress: () => {
                        setOutfitCells(prevCells => {
                            const updatedCells = prevCells.filter(cell => cell.id !== cellId);
                            console.log('Cells after deletion:', updatedCells.length);
                            return updatedCells;
                        });
                        setShowEditModal(false);
                        setSelectedCellId(null);
                    }
                }
            ]
        );
    };

    // Збільшення розміру комірки
    const increaseCellSize = (cellId: string) => {
        console.log('Increasing size for cell:', cellId);
        setOutfitCells(prevCells => 
            prevCells.map(cell => 
                cell.id === cellId 
                    ? { ...cell, flexSize: Math.min(cell.flexSize + 0.5, 4) }
                    : cell
            )
        );
    };

    // Зменшення розміру комірки
    const decreaseCellSize = (cellId: string) => {
        console.log('Decreasing size for cell:', cellId);
        setOutfitCells(prevCells => 
            prevCells.map(cell => 
                cell.id === cellId 
                    ? { ...cell, flexSize: Math.max(cell.flexSize - 0.5, 0.5) }
                    : cell
            )
        );
    };

    // Заміна категорії в комірці
    const replaceCategoryInCell = (cellId: string, newCategoryId: number) => {
        console.log('Replacing category in cell:', cellId, 'with category:', newCategoryId);
        const selectedCategory = categories.find(cat => cat.id === newCategoryId);
        if (!selectedCategory) {
            console.log('Category not found:', newCategoryId);
            return;
        }

        console.log('Selected category:', selectedCategory.name, 'subcategories:', selectedCategory.subcategories);

        // Якщо це плаття - перебудовуємо структуру
        if (selectedCategory.name === 'Плаття') {
            console.log('Dress selected, rebuilding layout');
            setOutfitCells(prevCells => {
                // Видаляємо всі комірки з колонки 2
                const filteredCells = prevCells.filter(c => c.column !== 2);
                
                // Додаємо комірку з платтям на всю колонку 2
                filteredCells.push({
                    id: cellId.startsWith('middle') || cellId.startsWith('bottom') ? cellId : 'dress',
                    subcategories: selectedCategory.subcategories,
                    column: 2,
                    flexSize: 4,
                    currentItemIndex: 0,
                    isRecommended: true
                });
                
                return filteredCells;
            });
        } else {
            // Звичайна заміна категорії
            setOutfitCells(prevCells => 
                prevCells.map(cell => {
                    if (cell.id === cellId) {
                        return { 
                            ...cell, 
                            subcategories: selectedCategory.subcategories, 
                            currentItemIndex: 0 
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
        console.log('Adding new category:', categoryId);
        const selectedCategory = categories.find(cat => cat.id === categoryId);
        if (!selectedCategory) {
            console.log('Category not found for adding:', categoryId);
            return;
        }

        console.log('Adding category:', selectedCategory.name);

        const newCellId = `added-${Date.now()}`;
        
        // Зменшуємо розмір інших комірок і додаємо нову
        setOutfitCells(prevCells => {
            const updatedCells = prevCells.map(cell => {
                if (cell.id === 'outerwear') {
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
                isRecommended: false
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
        const category = categories.find(cat => 
            cat.subcategories.some(sub => subcategories.includes(sub))
        );
        return category?.image;
    };

    // Отримання назви категорії
    const getCategoryName = (subcategories: string[]): string => {
        if (subcategories.length === 0) return 'Додати';
        
        // Якщо тільки одна підкатегорія - показуємо її
        if (subcategories.length === 1) {
            return subcategories[0];
        }
        
        // Знаходимо основну категорію за підкатегорією
        const category = categories.find(cat => 
            cat.subcategories.some(sub => subcategories.includes(sub))
        );
        return category?.name || 'Категорія';
    };

    // Рендер комірки
    const renderCell = (cell: FlexibleCell) => {
        const currentItem = getCurrentItemForCell(cell);
        const items = getItemsForCell(cell);
        const hasItems = items.length > 0;
        const hasMultipleItems = items.length > 1;

        console.log(`Rendering cell ${cell.id}:`, {
            subcategories: cell.subcategories,
            hasItems,
            itemsCount: items.length,
            currentIndex: cell.currentItemIndex,
            currentItem: currentItem?.subcategory
        });

        const cellHeight = cell.flexSize * 120; // Збільшена базова висота 120px на одиницю

        return (
            <View key={cell.id} style={[
                styles.cell,
                { height: cellHeight, minHeight: 120 }
            ]}>
                {/* Заголовок категорії */}
                <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => {
                        console.log('Category header pressed:', cell.id);
                        setSelectedCellId(cell.id);
                        setShowEditModal(true);
                    }}
                    onLongPress={() => {
                        console.log('Category header long pressed:', cell.id);
                        setSelectedCellId(cell.id);
                        setShowCategoryModal(true);
                    }}
                >
                    <Text style={styles.categoryHeaderText}>
                        {getCategoryName(cell.subcategories)}
                    </Text>
                    <View style={styles.headerButtons}>
                    <Image style={styles.iconStyle} source={require('../assets/settings.png')} />
                        <Text style={styles.sizeText}>{cell.flexSize}</Text>
                        {/* Модал редагування категорії */}
            <Modal
                visible={showEditModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    console.log('Edit modal closing');
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
                    <Pressable style={styles.editModalContent} onPress={(e) => e.stopPropagation()}>
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
                                        <Text style={styles.columnSwitchText}>
                                            ↔️ Перемістити в {outfitCells.find(cell => cell.id === selectedCellId)?.column === 1 ? '2-у' : '1-у'} колонку
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
                                            {outfitCells.find(cell => cell.id === selectedCellId)?.flexSize || 1}
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
                                        <Text style={styles.actionButtonText}>🔄 Замінити</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() => deleteCategory(selectedCellId)}
                                    >
                                        <Text style={styles.actionButtonText}>🗑️ Видалити</Text>
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
                </TouchableOpacity>

                {/* Контент комірки */}
                <View style={styles.cellContent}>
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
                </View>

                {/* Навігаційні кнопки */}
                {hasMultipleItems && (
                    <>
                        <TouchableOpacity 
                            style={[styles.navButton, styles.navButtonLeft]}
                            onPress={() => {
                                console.log('Previous button pressed for cell:', cell.id);
                                prevItemInCell(cell.id);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.navButtonText}>‹</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.navButton, styles.navButtonRight]}
                            onPress={() => {
                                console.log('Next button pressed for cell:', cell.id);
                                nextItemInCell(cell.id);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.navButtonText}>›</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Індикатор кількості елементів */}
                {hasMultipleItems && (
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
                                style={[styles.quickSizeButton, styles.quickDecreaseButton]}
                                onPress={() => decreaseCellSize(cell.id)}
                            >
                                <Text style={styles.quickSizeButtonText}>−</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.quickSizeButton, styles.quickIncreaseButton]}
                                onPress={() => increaseCellSize(cell.id)}
                            >
                                <Text style={styles.quickSizeButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.quickColumnSwitch}
                            onPress={() => switchCellColumn(cell.id)}
                        >
                            <Text style={styles.quickColumnSwitchText}>↔️</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    };

    // Збереження образу
    const saveOutfit = async () => {
        try {
            console.log('Saving outfit...');
            const currentDate = new Date().toISOString();
            
            // Збираємо всі вибрані елементи з комірок
            const outfitItems: WardrobeItem[] = [];
            outfitCells.forEach(cell => {
                const currentItem = getCurrentItemForCell(cell);
                if (currentItem) {
                    outfitItems.push(currentItem);
                    console.log(`Added item from cell ${cell.id}:`, currentItem.subcategory);
                }
            });

            console.log('Total outfit items:', outfitItems.length);

            if (outfitItems.length === 0) {
                Alert.alert('Увага', 'Оберіть хоча б один елемент одягу для образу.');
                return;
            }

            // Перевіряємо чи існує образ на цю дату
            const { data: existingOutfits, error: existingOutfitsError } = await supabase
                .from('outfits')
                .select('id')
                .eq('user_id', session?.user.id)
                .eq('date', currentDate.split('T')[0]);

            if (existingOutfitsError) {
                throw existingOutfitsError;
            }

            if (existingOutfits && existingOutfits.length > 0) {
                Alert.alert('Увага', 'Образ для цієї дати вже існує.');
                return;
            }

            if (!weatherData) {
                Alert.alert('Помилка', 'Немає погодних даних для збереження.');
                return;
            }

            // Зберігаємо погодні дані
            const { data: weather, error: WeatherError } = await supabase
                .from('weather')
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
                    .from('outfits')
                    .insert([
                        {
                            user_id: session?.user.id,
                            weather_id: weatherId,
                            date: currentDate,
                        },
                    ])
                    .select('id');

                if (OutfitError) {
                    throw OutfitError;
                }

                if (outfit && outfit.length > 0) {
                    const outfitId = outfit[0].id;

                    // Зберігаємо елементи образу
                    const itemsToInsert = outfitItems.map((item) => ({
                        outfit_id: outfitId,
                        item_id: item.id,
                    }));

                    const { error: InsertError } = await supabase
                        .from('outfit_item')
                        .insert(itemsToInsert);

                    if (InsertError) {
                        throw InsertError;
                    }

                    Alert.alert('Успішно', 'Образ успішно збережено!');
                    console.log('Outfit saved successfully');
                }
            }
        } catch (error) {
            console.error('Error saving outfit:', error);
            Alert.alert('Помилка', 'Не вдалося зберегти образ. Спробуйте ще раз.');
        }
    };

    // Розділення комірок по колонках
    const column1Cells = outfitCells.filter(cell => cell.column === 1);
    const column2Cells = outfitCells.filter(cell => cell.column === 2);

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={true}>
                
                {/* Заголовок та погода */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}><GetDate /></Text>
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
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    {weatherData && (
                                        <Text style={{ fontSize: 32 }}>{weatherData.temp > 0 ? '+' : ''}{Math.round(weatherData.temp)}°</Text>
                                    )}
                                    {weatherData && (
                                        <Image
                                            source={{ uri: `http://openweathermap.org/img/wn/${weatherData.icon}.png` }}
                                            style={{ width: 60, height: 50 }}
                                        />
                                    )}
                                </View>
                                {weatherData && (
                                    <Text>{weatherData.description}</Text>
                                )}
                            </View>
                            <View style={{ justifyContent: "center" }}>
                                <Text style={{ fontSize: 15 }}>Вологість: {weatherData?.humidity}%</Text>
                                <Text style={{ fontSize: 15 }}>Вітер: {weatherData?.speed} м/с</Text>
                            </View>
                        </View>
                    </View>
                </View>
                
                {/* Конструктор образу */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Створіть свій образ</Text>
                    <TouchableOpacity
                        style={[styles.editModeButton, editMode && styles.editModeButtonActive]}
                        onPress={() => {
                            console.log('Toggle edit mode:', !editMode);
                            setEditMode(!editMode);
                        }}
                    >
                        {editMode ?
                            <View> 
                                <Text style={[styles.editModeButtonText, editMode && styles.editModeButtonTextActive]}>Готово </Text>
                                </View>
                            :
                            <View style={{ flexDirection: 'row', alignItems:'center', gap:5}}>
                               <Image style={styles.iconStyle} source={require('../assets/settings.png')} />
                               <Text style={[styles.editModeButtonText, editMode && styles.editModeButtonTextActive]}>
                          Редагувати
                        </Text>
                            </View>
                                
                        }
                    </TouchableOpacity>
                </View>
                
                {editMode && (
                    <View style={styles.editInstructions}>
                        <Text style={styles.instructionsText}>
                            💡 Натисніть на назву категорії для редагування • Використовуйте кнопки +/− для зміни розміру • ↔️ для переміщення між колонками
                        </Text>
                    </View>
                )}

                {outfitCells.length > 0 ? (
                    <View style={styles.outfitBuilder}>
                        <View style={styles.columnsContainer}>
                            {/* Колонка 1 */}
                            <View style={styles.column}>
                                {column1Cells.map(renderCell)}
                            </View>
                            
                            {/* Колонка 2 */}
                            <View style={styles.column}>
                                {column2Cells.map(renderCell)}
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Завантаження рекомендацій...</Text>
                    </View>
                )}

                {/* Кнопка додавання аксесуарів */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                        style={styles.addAccessoryButton}
                        onPress={() => {
                            console.log('Add accessory button pressed');
                            setSelectedCellId('new');
                            setShowCategoryModal(true);
                        }}
                    >
                        <Text style={styles.addAccessoryText}>+ Додати аксесуари</Text>
                    </TouchableOpacity>
                    
                    <Button 
                        text="Зберегти образ" 
                        onPress={saveOutfit}
                    />
                </View>
                
                <View style={{ height: 50 }}></View>
            </ScrollView>

            {/* Модал вибору категорії */}
            <Modal
                visible={showCategoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    console.log('Modal closing');
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
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>
                            {selectedCellId === 'new' ? 'Додати категорію' : 'Замінити категорію'}
                        </Text>
                        
                        <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
                            {categories.map(category => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={styles.categoryItem}
                                    onPress={() => {
                                        console.log('Category selected:', category.name, 'for cell:', selectedCellId);
                                        if (selectedCellId === 'new') {
                                            addNewCategory(category.id);
                                        } else if (selectedCellId) {
                                            replaceCategoryInCell(selectedCellId, category.id);
                                        }
                                    }}
                                >
                                    <Image source={category.image} style={styles.categoryItemIcon} />
                                    <Text style={styles.categoryItemText}>{category.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => {
                                console.log('Close modal button pressed');
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
                    console.log('Edit modal closing');
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
                    <Pressable style={styles.editModalContent} onPress={(e) => e.stopPropagation()}>
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
                                        <Text style={styles.columnSwitchText}>
                                            ↔️ Перемістити в {outfitCells.find(cell => cell.id === selectedCellId)?.column === 1 ? '2-у' : '1-у'} колонку
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
                                            {outfitCells.find(cell => cell.id === selectedCellId)?.flexSize || 1}
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
                                        <Text style={styles.actionButtonText}>🔄 Замінити</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() => deleteCategory(selectedCellId)}
                                    >
                                        <Text style={styles.actionButtonText}>🗑️ Видалити</Text>
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
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContentContainer: {
        flexGrow: 1,
        paddingBottom: 120,
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    weatherContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    weatherContent: {
        width: '100%',
    },
    weatherRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        marginTop: 30,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    outfitBuilder: {
        flex: 1,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    columnsContainer: {
        flexDirection: 'row',
        gap: 15,
        minHeight: 400,
    },
    column: {
        flex: 1,
        gap: 15,
    },
    cell: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
    },
    categoryHeader: {
        backgroundColor: '#e9ecef',
        paddingVertical: 6,
        paddingHorizontal: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryHeaderEditMode: {
        backgroundColor: '#d1ecf1',
        borderBottomWidth: 2,
        borderBottomColor: '#007bff',
    },
    categoryHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#495057',
    },
    editIcon: {
        fontSize: 12,
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
        resizeMode: 'cover',
    },
    emptyCellContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIcon: {
        width: 60,
        height: 60,
        opacity: 0.6,
    },
    emptyCellText: {
        fontSize: 32,
        color: '#bbb',
        fontWeight: 'bold',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -20 }],
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    navButtonLeft: {
        left: 8,
    },
    navButtonRight: {
        right: 8,
    },
    navButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    itemCounter: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    itemCounterText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    addAccessoryButton: {
        backgroundColor: '#007bff',
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addAccessoryText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    buttonsContainer: {
        paddingHorizontal: 20,
        gap: 15,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 200,
    },
    loadingText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    categoriesList: {
        maxHeight: 400,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
        backgroundColor: '#007bff',
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 20,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sizeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#495057',
        backgroundColor: '#fff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    editModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    columnControls: {
        alignItems: 'center',
    },
    columnSwitchButton: {
        backgroundColor: '#17a2b8',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    columnSwitchText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    editOptions: {
        gap: 20,
        marginBottom: 20,
    },
    sizeControls: {
        alignItems: 'center',
    },
    sizeLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
        textAlign: 'center',
    },
    sizeButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    sizeButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    decreaseButton: {
        backgroundColor: '#dc3545',
    },
    increaseButton: {
        backgroundColor: '#28a745',
    },
    sizeButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    currentSize: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#495057',
        minWidth: 40,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    replaceButton: {
        backgroundColor: '#007bff',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    editInstructions: {
        backgroundColor: '#e3f2fd',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#007bff',
    },
    instructionsText: {
        fontSize: 14,
        color: '#495057',
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    editModeButton: {
        backgroundColor: 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#000000',
    },
    editModeButtonActive: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    editModeButtonText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#000',
    },
    editModeButtonTextActive: {
        color: '#fff',
    },
    quickSizeControls: {
        position: 'absolute',
        top: 5,
        left: 5,
        flexDirection: 'column',
        gap: 2,
    },
    quickSizeButton: {
        width: 25,
        height: 25,
        borderRadius: 12.5,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.8,
    },
    quickDecreaseButton: {
        backgroundColor: '#dc3545',
    },
    quickIncreaseButton: {
        backgroundColor: '#28a745',
    },
    quickSizeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 16,
    },
    quickColumnSwitch: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#17a2b8',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
    },
    quickColumnSwitchText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeModalText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    iconStyle: {
        width: 16,
        height:16,
    }
});