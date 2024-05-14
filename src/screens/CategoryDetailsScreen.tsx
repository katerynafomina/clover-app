import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type CategoryDetailsScreenParams = {
    CategoryName: {
        category: string; // Тут визначте тип параметру category
    }
};
type CategoryDetailsRouteProp = RouteProp<CategoryDetailsScreenParams, 'CategoryName'>;

const CategoryDetailsScreen = ({ route, }: {route:CategoryDetailsRouteProp}) => {
    const { category } = route.params
    // const categoryName = Array.isArray(name) ? name[0] : name;
    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    console.log('categoryName', category);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.item}>
            <Image source={{ uri: item.photo_url }} style={styles.image} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category ? category : 'Назва категорії не знайдена'}</Text>
            {loading ? (
                <Text>Loading...</Text>
            ) : wardrobeItems.length === 0 ? (
                    <Text>Немає одягу даної категорії { category }</Text>
            ) : (
                <FlatList
                    data={wardrobeItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    listContainer: {
        paddingHorizontal: 10,
    },
    item: {
        flex: 1,
        margin: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 150,
        borderRadius: 10,
    },
});

export default CategoryDetailsScreen;

