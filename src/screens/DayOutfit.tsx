import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import  removeBackground  from '../components/removeBack';
import { RouteProp } from '@react-navigation/native';

type DayOutfitParams = {
    Date :{
        day: string;
    };
}
type DayOutfitRouteProp = RouteProp<DayOutfitParams, 'Date'>;


const DayOutfit =({ route, }: {route:DayOutfitRouteProp}) => {
  const { day } = route.params;
const [imageUrl, setImageUrl] = useState<string>('');
    const [processedImagePath, setProcessedImagePath] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleRemoveBackground = async () => {
        if (!imageUrl) {
            Alert.alert("Error", "Please enter a valid image URL");
            return;
        }

        setLoading(true);
        setProcessedImagePath(null);

        try {
            const result = await removeBackground(imageUrl);
            setProcessedImagePath(result?.toString() ?? '');
            console.log(result);
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert("Error", "Failed to remove background: " + error.message);
            } else {
                Alert.alert("Error", "An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Background Removal</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter image URL"
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
                keyboardType="url"
            />
            <Button title="Remove Background" onPress={handleRemoveBackground} />
            {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />}
            {processedImagePath && (
                <View style={styles.imageContainer}>
                    <Text style={styles.label}>Processed Image:</Text>
                    <Image source={{ uri: processedImagePath }} style={styles.image} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    button: {
        marginBottom: 20,
    },
    loading: {
        marginTop: 20,
    },
    imageContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    image: {
        width: 200,
        height: 200,
    },
});

export default DayOutfit;