import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Pressable } from 'react-native';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ClosetStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClosetCategories"
        component={ClosetCategories}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddItemScreen"
        component={AddItemScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CategoryDetailsScreen"
        component={CategoryDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );

}

const HomeTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home"
        component={Home}
        options={{
          headerShown: false,
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
      <Tab.Screen name="Calendar"
        component={Calendar}
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
            <Stack.Screen name="Auth" component={Auth} />
            <Stack.Screen name="Register" component={Register} />
          </>
        ) : (
          <Stack.Screen
            name="HomeStack"
            component={HomeTabs}
              options={{
              
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
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
