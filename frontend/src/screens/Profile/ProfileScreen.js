import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/colors';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  email: { color: colors.muted, marginBottom: 20 },
});
