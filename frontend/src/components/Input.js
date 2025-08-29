import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export default function Input(props) {
  return <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12,
  },
});
