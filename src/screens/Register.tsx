import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from 'react-native-elements'
import { useNavigation, NavigationProp } from '@react-navigation/native';
// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.


export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
  const navigation = useNavigation() as NavigationProp<any>;
  AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
  })

  async function signInWithEmail() {
    navigation.navigate('Auth')
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      
      password: password,
    })

    if (error) {
      Alert.alert(error.message)
      console.log(error)
    }
    
    
    
    setLoading(false)
    navigation.navigate('Auth')
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Електронна пошта"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Пароль"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="пароль"
          autoCapitalize={'none'}
        /> 
      </View>
      
      <View style={styles.verticallySpaced}>
        <Button title="Зареєструватись" disabled={loading} onPress={() => signUpWithEmail()} />
        </View>
        <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Назад" disabled={loading} onPress={() => signInWithEmail()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})