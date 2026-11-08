import React from 'react'
import { View, Button } from 'react-native'
import { Link, router } from 'expo-router'

const SignIn = () => {
  return (
    <View>
      <Link href="/(auth)/sign-up">Create Account</Link>
      <Button title="Homega qaytish" onPress={() => router.replace("/")} />
    </View>
  )
}

export default SignIn