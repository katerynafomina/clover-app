import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ScrollView } from 'react-native';
import { FileObject } from '@supabase/storage-js'

type CategoryDetailsScreenParams = {
    CategoryName: {
        category: string;
    };
};
type CategoryDetailsRouteProp = RouteProp<CategoryDetailsScreenParams, 'CategoryName'>;

const CategoryDetailsScreen = ({ route }: { route: CategoryDetailsRouteProp }) => {
    const [session, setSession] = useState<Session | null>(null);
    const { category } = route.params;

   useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])


    const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
    const [files, setFiles] = useState<FileObject[]>([])
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const { data: wardrobe, error } = await supabase
                    .from('wardrobe')
                    .select('id, photo_url, category, user_id')
                    .eq('category', category)
                    .eq('user_id', session?.user.id);

                if (error) {
                    console.error('Error fetching wardrobe items:', error.message);
                } else {
                    setWardrobeItems(wardrobe || []);
                     wardrobeItems.forEach(async (item) => {
                        const { data, error } = await supabase.storage
                            .from('clothes')
                            .download(item.photo_url);
                        if (error) {
                            console.error('Error downloading file:', error.message);
                        } else {
                            console.log('File downloaded successfully:', data);
                             const fr = new FileReader()
                            fr.readAsDataURL(data)
                            console.log('File FR downloaded successfully:', fr.result as string);
                            item.photo_url = fr.result as string;
                        }
                    });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching wardrobe items:', error);
            }
        };

        fetchItems();
        setLoading(false);
    }, [category, session]);
   

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.item}>
            {/* <Image source={{ uri: item.photo_url }} style={styles.image} /> */}
            <Text>{item.category}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{category ? category : 'Назва категорії не знайдена'}</Text>
            <ScrollView>
            {loading ? (
                <Text>Loading...</Text>
            ) : wardrobeItems.length === 0 ? (
                <Text>Немає одягу даної категорії {category}</Text>
                ) : (
                        
                        wardrobeItems.map((item) => (
                        <View style={styles.item} key={item.id}>
                            <Image source={{ data: item.photo_url }} style={styles.image} />
                            <Text>{item.category}</Text>
                        </View>
                )))}
            </ScrollView>
                {/* <FlatList
                    data={wardrobeItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.listContainer}
                />
            )} */}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: 150,
        borderRadius: 10,
    },
});

export default CategoryDetailsScreen;
