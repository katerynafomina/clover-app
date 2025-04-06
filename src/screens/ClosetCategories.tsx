import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import { categories, Category } from "../constants/Categoris";
import { useNavigation, NavigationProp } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const numColumns = 2;

const ClosetCategories = () => {
  const navigation = useNavigation() as NavigationProp<any>;
  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      style={styles.item}
      onPress={() => {
        navigation.navigate("CategoryDetailsScreen", {
          category: item.name.toString(),
        });
      }}
    >
      <Image source={item.image} style={styles.image} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={numColumns}
      />

      <Pressable
        style={styles.addButton}
        onPress={() => {
          navigation.navigate("AddItemScreen");
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
    position: "relative",
  },
  item: {
    flex: 1,
    margin: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
  },
  image: {
    width: (width - 30 - numColumns * 20) / numColumns,
    height: 170,
    marginBottom: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "blue",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 24,
    color: "white",
  },
});

export default ClosetCategories;
