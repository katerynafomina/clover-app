import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Визначаємо типи для параметрів навігації
type CommunityStackParamList = {
  AddPost: undefined; // Сторінка додавання посту не очікує параметрів
};

// Вказуємо, що компонент отримує navigation через пропси
type Props = NativeStackScreenProps<CommunityStackParamList, 'AddPost'>;

const AddPost: React.FC<Props> = ({ navigation }) => {
  const [postContent, setPostContent] = useState('');

  const handleAddPost = () => {
    if (postContent.trim()) {
      // Логіка для додавання посту (приклад з фіктивними даними)
      console.log('New Post:', postContent);
      // Повертаємось назад після додавання
      navigation.goBack();
    } else {
      alert('Please enter some content');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Add a New Post</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
        placeholder="Write something..."
        value={postContent}
        onChangeText={setPostContent}
      />
      <Button title="Post" onPress={handleAddPost} />
    </View>
  );
};

export default AddPost;
