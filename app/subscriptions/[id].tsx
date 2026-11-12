import { View, Text } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'

const SubscrintionDetails = () => {
    const { id } = useLocalSearchParams<{id : string}>();
    return (
        <View>
            <Text>SubscrintionDetails : {id}</Text>
            <Link href="/">Go Back</Link>
        </View>
    )
}

export default SubscrintionDetails