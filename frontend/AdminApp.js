import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AdminProvider } from './src/context/AdminContext';
import AdminNavigator from './src/navigation/AdminNavigator';

const AdminApp = () => {
  return (
    <NavigationContainer>
      <AdminProvider>
        <AdminNavigator />
      </AdminProvider>
    </NavigationContainer>
  );
};

export default AdminApp;