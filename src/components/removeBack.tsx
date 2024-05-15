import * as FileSystem from 'expo-file-system';

const endpoint = "https://backgremover.cognitiveservices.azure.com/computervision/imageanalysis:segment?api-version=2023-02-01-preview";
const backgroundRemoval = "&mode=backgroundRemoval";

const removeBackgroundUrl = endpoint + backgroundRemoval; 

const headers = {
    'Content-type': 'application/json',
    'Ocp-Apim-Subscription-Key': '3815c63336b3433eb81982d7e051038f'
};

async function removeBackground(imageUrl: string) {
    console.log("Removing background from: " + imageUrl);

    const image = { url: imageUrl };
    const response = await fetch(removeBackgroundUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(image)
    });

    if (!response.ok) {
        console.error(`API call failed with status: ${response.status}`);
        return;
    }

    const blob = await response.blob();
    console.log(blob);

    const objectImage = "object_" + imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
    console.log(objectImage);
    const objectImagePath = FileSystem.documentDirectory + objectImage;
    console.log(objectImagePath);

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    resolve((reader.result as string).split(',')[1]);
                } else {
                    reject(new Error("Conversion to base64 failed"));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    const base64Image = await blobToBase64(blob);
    console.log(base64Image);

    await FileSystem.writeAsStringAsync(objectImagePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64
    });

    console.log("Image saved to: " + objectImagePath);
    return objectImagePath;
}

export default removeBackground;
