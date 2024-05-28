import React from 'react';
import { View, Image, FlatList, Pressable, StyleSheet } from 'react-native';

type CategoryItemProps = {
    category: string;
    items: { id: number; image: string }[];
    selectedItems: { id: number; image: string }[];
    toggleItemSelection: (item: { id: number; image: string }) => void;
};

const CategoryItem = ({ category, items, selectedItems, toggleItemSelection }:CategoryItemProps) => {
    return (
        <View style={styles.categoryContainer}>
            <FlatList
                data={items}
                horizontal
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.categoryContentContainer}
                renderItem={({ item }) => (
                    <Pressable
                        style={[
                            styles.item,
                            selectedItems.some((selected) => selected.id === item.id) && styles.selectedItem,
                        ]}
                        onPress={() => toggleItemSelection(item)}
                    >
                        <Image source={{ uri: item.image }} style={styles.image} />
                    </Pressable>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    categoryContainer: {
        flex: 1,
        margin: 10,
    },
    categoryContentContainer: {
        padding: 5,
        gap: 10,
    },
    item: {
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 8,
        padding: 8,
    },
    selectedItem: {
        borderColor: 'black',
    },
    image: {
        height: 150, // Збільшена висота фото
        width: 150,  // Збільшена ширина фото
        borderRadius: 10,
        resizeMode: 'contain',
    },
});

export default CategoryItem;
