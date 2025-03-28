import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Alert, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { RootStackParamList } from '../../App';

// Define props for navigation
type CategoryDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CategoryDetailsScreen'>;
type CategoryDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryDetailsScreen'>;

type Props = {
    route: CategoryDetailsScreenRouteProp;
    navigation: CategoryDetailsScreenNavigationProp;
};

const CategoryDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { category } = route.params;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    useEffect(() => {
        const fetchItems = async () => {
            if (!session || !session.user || !category) return;

            const userId = session.user.id;
            try {
                const { data: wardrobe, error } = await supabase
                    .from('wardrobe')
                    .select('id, photo_url, category, user_id')
                    .eq('category', category)
                    .eq('user_id', userId);

                if (error) {
                    console.error('Error fetching wardrobe items:', error.message);
                } else {
                    const itemsWithUrls = wardrobe.map((item) => ({
                        ...item,
                        image: supabase.storage.from('clothes').getPublicUrl(item.photo_url).data.publicUrl,
                    }));

                    setWardrobeItems(itemsWithUrls);
                }
            } catch (error) {
                console.error('Error fetching wardrobe items:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [category, session]);

    return (
        <View style={styles.container}>
            {loading ? (
                <Text>Loading...</Text>
            ) : wardrobeItems.length === 0 ? (
                <Text>Немає одягу даної категорії: {category}</Text>
            ) : (
                <FlatList
                    style={{ width: '100%' }}
                    data={wardrobeItems}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item}>
                            <Image source={{ uri: item.image }} style={styles.image} />
                        </TouchableOpacity>
                    )}
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
    listContainer: {
        paddingHorizontal: 10,
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

export default CategoryDetailsScreen;
