import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { supabase } from './src/lib/supabase'
import Auth from './src/screens/Auth'
import Account from './src/screens/Account'
import { View } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import Register from './src/screens/Register'
import Home from './src/screens/Home'
import React from 'react'
import { Pressable } from 'react-native'
import { AntDesign } from '@expo/vector-icons'



export default function App() {
  

  return (
    <Layout />
  )
}



const Stack = createStackNavigator()

const Layout = () => {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={Home}
              options={{
               headerRight: () => (
                    
                        <Pressable onPress={() => {supabase.auth.signOut}}>
                          {({ pressed }) => (
                            <AntDesign
                            name="user"
                              size={25}
                              color='black'
                              style={{ marginRight: 15, paddingEnd:10, opacity: pressed ? 0.5 : 1 }} />
                          )}
                        </Pressable>
                            
        )}}
                  />
                </>
              ) : (
          <>
            <Stack.Screen name="Auth" component={Auth} />
          </>
        )}
        <Stack.Screen name="Register" component={Register} />
        
        <Stack.Screen
            name="Account"
            component={Account}
          />
      </Stack.Navigator>
    </NavigationContainer>
  )
}