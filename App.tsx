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
import UserProfileScreen from './src/screens/Community/UserProfile';
import PostDetailScreen from './src/screens/Community/PostDetail';
import MyProfileScreen from './src/screens/Profile/MyProfile';
import EditProfileScreen from './src/screens/Profile/EditProfile';
import SavedPostsScreen from './src/screens/Profile/SavedPosts';

export type RootStackParamList = {
  HomeStack: undefined;
  HomeMain: undefined;
  ClosetCategories: undefined;
  AddItemScreen: undefined;
  CategoryDetailsScreen: { category: string };
  Calendar: undefined;
  DayOutfit: { date: string };
  Auth: undefined;
  Register: undefined;
  Home: undefined;
  AllPosts: undefined;
  MyPosts: undefined;
  AddPost: undefined;
  UserProfile: { username: string };
  PostDetail: { postId: number };
  MyProfile: undefined;
  EditProfile: { profile: any };
  SavedPosts: undefined;
  HomeTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Компонент для іконки користувача в навбарі
const UserIcon = ({ navigation }: { navigation: any }) => {
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserAvatar(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchUserAvatar(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserAvatar = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (!error && data?.avatar_url) {
        let avatarUrl = data.avatar_url;
        if (!avatarUrl.startsWith('http')) {
          const { data: avatarData } = await supabase.storage
            .from('avatars')
            .getPublicUrl(avatarUrl);
          
          if (avatarData) {
            avatarUrl = avatarData.publicUrl;
          }
        }
        setUserAvatar(avatarUrl);
      }
    } catch (error) {
      console.error('Error fetching user avatar:', error);
    }
  };

  return (
    <Pressable 
      onPress={() => navigation.navigate('MyProfile')}
      style={{ marginRight: 15, paddingEnd: 10 }}
    >
      {({ pressed }) => (
        userAvatar ? (
          <Image
            source={{ uri: userAvatar }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              opacity: pressed ? 0.5 : 1,
            }}
          />
        ) : (
          <AntDesign
            name="user"
            size={25}
            color="black"
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )
      )}
    </Pressable>
  );
};

// Компонент для заголовка з логотипом
const HeaderLogo = () => (
  <Image
    style={{ width: 130, height: 40 }}
    source={require('./src/assets/logoLight.png')}
    resizeMode="contain"
  />
);

const ClosetStack = ({ navigation }: { navigation: any }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClosetCategories"
        component={ClosetCategories}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AddItemScreen"
        component={AddItemScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="CategoryDetailsScreen"
        component={CategoryDetailsScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerTitle: HeaderLogo,
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const CalendarStack = ({ navigation }: { navigation: any }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Calendar"
        component={Calendar}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name='DayOutfit'
        component={DayOutfit}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerTitle: HeaderLogo,
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const CommunityStack = ({ navigation }: { navigation: any }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AllPosts"
        component={AllPosts}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      
      <Stack.Screen
        name="MyPosts"
        component={MyPosts}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
      
      <Stack.Screen
        name="AddPost"
        component={AddPost}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const HomeStack = ({ navigation }: { navigation: any }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={Home}
        options={{
          headerTitle: HeaderLogo,
          headerRight: () => <UserIcon navigation={navigation} />,
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={25} color={color} />
          ),
        }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          headerTitle: HeaderLogo,
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerTitle: HeaderLogo,
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const HomeTabs = ({ navigation }: { navigation: any }) => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Головна" 
        children={() => <HomeStack navigation={navigation} />}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={25} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Гардероб"
        children={() => <ClosetStack navigation={navigation} />}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="appstore1" size={25} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Календар"
        children={() => <CalendarStack navigation={navigation} />}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="calendar" size={25} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Спільнота"
        children={() => <CommunityStack navigation={navigation} />}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <AntDesign name="team" size={25} color={color} />
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
              options={{ 
                headerTitle: HeaderLogo,
                headerShadowVisible: false
              }} 
            />
            <Stack.Screen
              name="Register"
              component={Register}
              options={{
                headerTitle: HeaderLogo,
                headerShadowVisible: false
              }} 
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="HomeTabs"
              children={({ navigation }) => <HomeTabs navigation={navigation} />}
              options={{
                headerShown: false,
              }}
            />
            {/* Профільні екрани на рівні основного стеку */}
            <Stack.Screen
              name="MyProfile"
              component={MyProfileScreen}
              options={{
                headerTitle: HeaderLogo,
                headerShown: true,
                presentation: 'modal',
              }}
            />
            
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                headerTitle: HeaderLogo,
                headerShown: true,
              }}
            />
            
            <Stack.Screen
              name="SavedPosts"
              component={SavedPostsScreen}
              options={{
                headerTitle: HeaderLogo,
                headerShown: true,
              }}
            />
            
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{
                headerTitle: HeaderLogo,
                headerShown: true,
              }}
            />
            
            <Stack.Screen
              name="UserProfile"
              component={UserProfileScreen}
              options={{
                headerTitle: HeaderLogo,
                headerShown: true,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};