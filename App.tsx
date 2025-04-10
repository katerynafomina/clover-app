import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Pressable, Image } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { supabase } from './src/lib/supabase';
import Auth from './src/screens/Auth';
import Register from './src/screens/Register';
import Home from './src/screens/Home';
import ClosetCategories from './src/screens/ClosetCategories';
import Account from './src/screens/Account';
import { Session } from '@supabase/supabase-js';
import Calendar from './src/screens/Calendar';
import AddItemScreen from './src/screens/AddItemScreen';
import CategoryDetailsScreen from './src/screens/CategoryDetailsScreen';
import DayOutfit from './src/screens/DayOutfit';
import AllPosts from './src/screens/Community/AllPosts';
import MyPosts from './src/screens/Community/MyPosts';
import AddPost from './src/screens/Community/AddPost';

export type RootStackParamList = {
  HomeStack: undefined;
  ClosetCategories: undefined;
  AddItemScreen: undefined;
  CategoryDetailsScreen: { category: string };
  Calendar: undefined;
  DayOutfit: undefined;
  Auth: undefined;
  Register: undefined;
};


const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const ClosetStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClosetCategories"
        component={ClosetCategories}
        options={{
           headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AddItemScreen"
        component={AddItemScreen}
        options={{
           headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="CategoryDetailsScreen"
        component={CategoryDetailsScreen}
        options={({ route }: { route: { params: { category: string } } }) => ({
          headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );

}

const CalendarStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Calendar"
        component={Calendar}
        options={{
           headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name='DayOutfit'
        component={DayOutfit}
        options={{
           headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );

}

const CommunityStack = () => {
  return (
    <Stack.Navigator>
      {/* 1. Сторінка з постами всіх користувачів */}
      <Stack.Screen
        name="AllPosts"
        component={AllPosts}
        options={{
          headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />
          ),
          headerShown: true,
        }}
      />
      
      {/* 2. Сторінка з моїми постами */}
      <Stack.Screen
        name="MyPosts"
        component={MyPosts}
        options={{
          headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />
          ),
          headerShown: true,
        }}
      />
      
      {/* 3. Сторінка для додавання посту */}
      <Stack.Screen
        name="AddPost"
        component={AddPost}
        options={{
          headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />
          ),
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};


const HomeTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home"
        component={Home}
        options={{
          headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
            />),
          headerRight: () => (
            <Pressable onPress={() => supabase.auth.signOut()}>
              {({ pressed }) => (
                <AntDesign
                  name="user"
                  size={25}
                  color="black"
                  style={{ marginRight: 15, paddingEnd: 10, opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          ),
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={25} color={color} />
          ),
        }}
      />
      <Tab.Screen name="Closet"
        component={ClosetStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="appstore1" size={25} color={color} />
          ),
        }}
      />
      <Tab.Screen name="Outfits"
        component={CalendarStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="calendar" size={25} color={color} />
          ),
        }}
      />
       <Tab.Screen name="Community"
        component={CommunityStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="calendar" size={25} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  return <Layout />;
}

const Layout = () => {
const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          <>
            <Stack.Screen 
              name="Auth"
              component={Auth}
              options={{ headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
                />),
                headerShadowVisible:false
              }} />
            <Stack.Screen
              name="Register"
              component={Register}
              options={{
                 headerTitle: () => (
            <Image
              style={{ width: 130, height: 40 }} // Set the appropriate dimensions for your logo
              source={require('./src/assets/logoLight.png')} // Replace this with the path to your logo
              resizeMode="contain"
                  />),
                  headerShadowVisible:false
              }} />
          </>
        ) : (
          <Stack.Screen
            name="HomeStack"
            component={HomeTabs}
            options={
              {
                headerShown: false,
              }
            }
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
