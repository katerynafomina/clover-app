import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, TextInput, Text } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation, NavigationProp } from '@react-navigation/native'; // Імпорт NavigationProp з '@react-navigation/native'
import Button from '../components/Button';
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
      <View style={ styles.mb_ft} />
       <Text style={{marginLeft:16}}>Пошта</Text>
      <View style={[styles.textInputContainer, styles.mb_tw]}>
        <TextInput
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
        />
      </View>
      <Text style={{marginLeft:16}}>Пароль</Text>
     <View style={[styles.textInputContainer, styles.mb_ft]}>
        <TextInput
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="пароль"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.mb_tw}>
        <Button text="Зареєструватись" disabled={loading} onPress={() => signUpWithEmail()} />
        </View>
        <View >
        <Button text="Назад" disabled={loading} onPress={() => signInWithEmail()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
   
  },
  textInputContainer: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'black',
    backgroundColor: 'transpered',
    paddingVertical: 10,
    paddingHorizontal:16,
    marginVertical: 10,
    borderRadius:30,
  },
  mb_tw: {
    marginBottom:20
  },
   mb_ft: {
    marginBottom:50
  }
})