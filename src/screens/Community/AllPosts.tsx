import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';

// Описуємо інтерфейс для постів
interface Post {
  id: string;
  username: string;
  content: string;
}

const AllPosts: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [posts, setPosts] = useState<Post[]>([]); // Додаємо типізацію useState

  useEffect(() => {
    // Завантажуємо пости (приклад з фіктивними даними)
    const fetchedPosts: Post[] = [
      { id: '1', username: 'User1', content: 'Post content 1' },
      { id: '2', username: 'User2', content: 'Post content 2' },
      { id: '3', username: 'User3', content: 'Post content 3' },
    ];
    setPosts(fetchedPosts);
  }, []);

  // Додаємо типізацію параметрів функції
  const handleVote = (postId: string, vote: 'like' | 'dislike') => {
    console.log(`Post ${postId} voted as ${vote}`);
  };

  // Додаємо типізацію для item у FlatList
  const renderItem = ({ item }: { item: Post }) => (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text>{item.username}</Text>
      <Text>{item.content}</Text>
      <Button title="Like" onPress={() => handleVote(item.id, 'like')} />
      <Button title="Dislike" onPress={() => handleVote(item.id, 'dislike')} />
    </View>
  );

  return (
    <View>
      <Text>All Posts</Text>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      <Button
        title="Go to MyPosts"
        onPress={() => navigation.navigate('MyPosts')}
      />
    </View>
  );
};

export default AllPosts;
