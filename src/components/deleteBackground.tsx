import React, { useState } from 'react';
import { View, Image, Button, ActivityIndicator, Text } from 'react-native';

interface PhotoWithoutBackgroundProps {
    photoUrl: string;
}

const PhotoWithoutBackground = ({ photoUrl } : PhotoWithoutBackgroundProps) => {
    const axios = require('axios');
    const FormData = require('form-data');
    const fs = require('fs');

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_url', photoUrl);
    
    fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
            'X-Api-Key': 'QC5rxDZoTSxzzFjKeJbGCuLo',   
            ...formData.getHeaders()
        },
        body: formData as unknown as string, 
    })
    .then(response => {
        return response.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
    })
    .catch(error => {
        return (
        <View>
            <Text>Помилка при видаленні фону</Text>
        </View>);
        console.error('Request failed:', error);
    });
    
    return (
         <View>
            {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={{ width: 100, height: 100 }} />
            ) : (
                <ActivityIndicator size="large" color="#0000ff" />
            )}
        </View>
    );
};


export default PhotoWithoutBackground;
