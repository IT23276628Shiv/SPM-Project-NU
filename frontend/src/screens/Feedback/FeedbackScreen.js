import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/colors';
import { Dropdown } from 'react-native-element-dropdown';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { submitFeedback } from '../../api/feedbackApi';

const { width } = Dimensions.get('window');

// Feedback type options
const FEEDBACK_TYPES = [
  { label: 'Bug Report', value: 'bug' },
  { label: 'Suggestion', value: 'suggestion' },
  { label: 'General', value: 'general' },
];

export default function FeedbackScreen() {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [feedbackType, setFeedbackType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please write your feedback before submitting.');
      return;
    }

    if (!feedbackType) {
      Alert.alert('Error', 'Please select a feedback type.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please provide your email address.');
      return;
    }

    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      await submitFeedback({
        token,
        email,
        type: feedbackType,
        rating,
        message: feedback.trim(),
      });

      // Reset form
      setRating(0);
      setFeedback('');
      setFeedbackType('');

      Alert.alert(
        '✅ Success',
        'Thank you for your feedback! We value your input.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? Your feedback will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { 
          text: 'Cancel', 
          style: 'destructive',
          onPress: () => {
            setRating(0);
            setFeedback('');
            setFeedbackType('');
          }
        }
      ]
    );
  };

  const renderStar = (index) => {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index + 1)}
        style={styles.star}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={index < rating ? 'star' : 'star-outline'}
          size={32}
          color={index < rating ? '#FFD700' : '#DDD'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.title}>We'd love your feedback!</Text>
        <Text style={styles.subtitle}>Help us improve Revomart by sharing your thoughts</Text>

        {/* Star Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.label}>Rate your experience</Text>
          <View style={styles.starsContainer}>
            {[0, 1, 2, 3, 4].map(renderStar)}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Tap a star to rate' : `${rating} star${rating > 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Feedback Type Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Feedback Type *</Text>
          <Dropdown
            style={styles.dropdown}
            data={FEEDBACK_TYPES}
            labelField="label"
            valueField="value"
            placeholder="Select feedback type"
            value={feedbackType}
            onChange={(item) => setFeedbackType(item.value)}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            renderRightIcon={() => (
              <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
            )}
          />
        </View>

        {/* Feedback Text */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Your Feedback *</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Write your feedback..."
            placeholderTextColor={colors.muted}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>
            {feedback.length}/1000 characters
          </Text>
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!user?.email} // Pre-filled if user is logged in
          />
          {user?.email && (
            <Text style={styles.helpText}>
              Pre-filled from your account
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2f95dc',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    marginHorizontal: 4,
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 20,
  },
  dropdown: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdownPlaceholder: {
    color: colors.muted,
    fontSize: 16,
  },
  dropdownSelectedText: {
    color: colors.text,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2f95dc',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#2f95dc',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#2f95dc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    backgroundColor: colors.muted,
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
