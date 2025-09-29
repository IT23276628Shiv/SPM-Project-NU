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
  TextInput,
  ActivityIndicator
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resolve Complaint</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Resolution Notes:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter resolution notes..."
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

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

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F6F61" />
        </View>
      )}
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
    paddingTop: 60,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilter: {
    backgroundColor: '#2F6F61',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  complaintItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  complaintInfo: {
    flex: 1,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  complaintUser: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  complaintDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  complaintMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  complaintDate: {
    fontSize: 12,
    color: '#999',
  },
  complaintProduct: {
    fontSize: 12,
    color: '#2F6F61',
    fontStyle: 'italic',
  },
  complaintActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#e8f5f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6F61',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalResolveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalResolveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});