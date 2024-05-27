import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, TextInput, Text } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation, NavigationProp } from '@react-navigation/native'; // Імпорт NavigationProp з '@react-navigation/native'
import Button from '../components/Button';

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigation = useNavigation() as NavigationProp<any>; 

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
    if (error) {
      Alert.alert(error.message)
    } else {
      navigation.navigate('Home') 
    }
    setLoading(false)
  }

  async function signUpWithEmail() {
    navigation.navigate('Register') 
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
        <Button
          text="Вхід"
          onPress={() => signInWithEmail() as any} // Явне вказання типу для onPress
        />
      </View>
      <View >
        <Button
          text="Зареєструватись"
          onPress={() => signUpWithEmail() as any} // Явне вказання типу для onPress
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 16,
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
    mb_ft: {
    marginBottom:50
  },
  mb_tw: {
    marginBottom:20
  }
})
