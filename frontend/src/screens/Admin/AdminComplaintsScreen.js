import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function AdminComplaintsScreen({ navigation }) {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      let url = `${API_URL}/api/admin/complaints?limit=50`;
      if (filter !== 'all') url += `&status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateComplaintStatus = async (complaintId, status, notes = '') => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, resolutionNotes: notes })
      });

      if (response.ok) {
        setComplaints(prev => prev.map(complaint => 
          complaint._id === complaintId 
            ? { ...complaint, status, resolutionNotes: notes }
            : complaint
        ));
        Alert.alert('Success', 'Complaint status updated');
      }
    } catch (error) {
      console.error('Error updating complaint:', error);
    }
  };

  const openResolutionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolutionNotes(complaint.resolutionNotes || '');
    setModalVisible(true);
  };

  const handleResolve = () => {
    if (selectedComplaint) {
      updateComplaintStatus(selectedComplaint._id, 'resolved', resolutionNotes);
      setModalVisible(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_review': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#666';
      default: return '#666';
    }
  };

  const renderComplaintItem = ({ item }) => (
    <View style={styles.complaintItem}>
      <View style={styles.complaintHeader}>
        <View style={styles.complaintInfo}>
          <Text style={styles.complaintTitle}>{item.title}</Text>
          <Text style={styles.complaintUser}>
            By: {item.complainantId?.username || 'Unknown'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.complaintDescription} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.complaintMeta}>
        <Text style={styles.complaintDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.productId && (
          <Text style={styles.complaintProduct}>
            Product: {item.productId.title}
          </Text>
        )}
      </View>

      <View style={styles.complaintActions}>
        {item.status === 'open' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateComplaintStatus(item._id, 'in_review')}
          >
            <Text style={styles.actionButtonText}>Review</Text>
          </TouchableOpacity>
        )}
        
        {(item.status === 'open' || item.status === 'in_review') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={() => openResolutionModal(item)}
          >
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>Resolve</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
        <Text style={styles.headerTitle}>Complaint Management</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {['all', 'open', 'in_review', 'resolved', 'closed'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.activeFilter]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.activeFilterText]}>
              {status === 'all' ? 'All' : status.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={complaints}
        keyExtractor={(item) => item._id}
        renderItem={renderComplaintItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              fetchComplaints().finally(() => setRefreshing(false));
            }} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
      />

      {/* Resolution Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalResolveButton}
                onPress={handleResolve}
              >
                <Text style={styles.modalResolveText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
