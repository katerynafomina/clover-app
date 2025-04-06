import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';

// Описуємо інтерфейс для об'єкта посту
interface Post {
  id: string;
  content: string;
}

const MyPosts: React.FC = () => {
  // Вказуємо, що myPosts є масивом об'єктів типу Post
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Завантажуємо пости поточного користувача (приклад з фіктивними даними)
    const fetchedMyPosts: Post[] = [
      { id: '1', content: 'My first post' },
      { id: '2', content: 'My second post' },
    ];
    setMyPosts(fetchedMyPosts);
  }, []);

  // Вказуємо, що item має тип Post
  const renderItem = ({ item }: { item: Post }) => (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text>{item.content}</Text>
    </View>
  );

  return (
    <View>
      <Text>My Posts</Text>
      <FlatList
        data={myPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

export default MyPosts;
