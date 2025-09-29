// frontend/src/screens/Admin/AdminProfileScreen.js - UPDATED FOR UNIFIED AUTH
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext'; // Using unified context

export default function AdminProfileScreen({ navigation }) {
  const { userDetails, logout } = useAuth(); // Using unified context

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const renderInfoCard = (title, value, icon) => (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#2F6F61" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const renderActionItem = (title, icon, onPress, danger = false) => (
    <TouchableOpacity 
      style={styles.actionItem}
      onPress={onPress}
    >
      <MaterialCommunityIcons 
        name={icon} 
        size={24} 
        color={danger ? "#f44336" : "#2F6F61"} 
      />
      <Text style={[styles.actionText, danger && { color: "#f44336" }]}>
        {title}
      </Text>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={20} 
        color="#666" 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-circle" size={80} color="#2F6F61" />
          </View>
          <Text style={styles.profileName}>{userDetails?.username}</Text>
          <Text style={styles.profileEmail}>{userDetails?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userDetails?.role?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Admin Info */}
        <Text style={styles.sectionTitle}>Account Information</Text>
        {renderInfoCard(
          'Role', 
          userDetails?.role?.replace('_', ' ').toUpperCase() || 'N/A',
          'shield-account'
        )}
        {renderInfoCard(
          'Permissions', 
          userDetails?.permissions?.length || 0,
          'key'
        )}
        {renderInfoCard(
          'Last Login', 
          userDetails?.lastLoginDate 
            ? new Date(userDetails.lastLoginDate).toLocaleDateString()
            : 'Never',
          'clock'
        )}

        {/* Permissions List */}
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.permissionsContainer}>
          {userDetails?.permissions?.map(permission => (
            <View key={permission} style={styles.permissionItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.permissionText}>
                {permission.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsContainer}>
          {renderActionItem(
            'Change Password',
            'lock-reset',
            () => Alert.alert('Info', 'Password change functionality to be implemented')
          )}
          {renderActionItem(
            'System Settings',
            'cog',
            () => Alert.alert('Info', 'System settings to be implemented')
          )}
          {renderActionItem(
            'Logout',
            'logout',
            handleLogout,
            true
          )}
        </View>

        {/* System Info */}
        <View style={styles.systemInfo}>
          <Text style={styles.systemInfoTitle}>System Information</Text>
          <Text style={styles.systemInfoText}>
            RevoMart Admin Panel v1.0{'\n'}
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#2F6F61',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  infoIcon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  permissionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  actionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  systemInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  systemInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  systemInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});