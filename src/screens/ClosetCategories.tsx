import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { categories, Category } from '../constants/Categoris';
import { Link } from 'expo-router';

const { width } = Dimensions.get('window');
const numColumns = 2;

const ClosetCategories = () => {
    // Функція, яка відповідає за відображення кожного елементу у FlatList
    const renderItem = ({ item }: { item: Category }) => (
        <Link href={`/closet/${item.name}`} asChild>
            <Pressable style={styles.item}>
                <Image source={item.image} style={styles.image} />
                {/* <Text style={styles.title}>{item.name}</Text> */}
            </Pressable>
        </Link>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={categories}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                numColumns={numColumns}
            />
            {/* Кнопка "+", яка відображається поверх списку */}
            <Link href="/closet/add" asChild>
                <Pressable style={styles.addButton}>
                    <Text style={styles.addButtonText}>+</Text>
                </Pressable>
            </Link>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#fff',
        position: 'relative', // Встановлюємо позицію відносної для контейнера
    },
    item: {
        flex: 1,
        margin: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
    },
    image: {
        width: (width - 30 - (numColumns * 20)) / numColumns, // Визначаємо ширину картинки з урахуванням кількості колонок та відступів
        height: 170,
        marginBottom: 10,
        borderRadius: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute', // Встановлюємо позицію абсолютною
        bottom: 20, // Відступ від нижнього краю
        right: 20, // Відступ від правого краю
        width: 50,
        height: 50,
        borderRadius: 25, // Щоб зробити круглий
        backgroundColor: 'blue',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: 24,
        color: 'white',
    },
});

export default ClosetCategories;
