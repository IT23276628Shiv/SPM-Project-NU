// api/message.js
import axios from 'axios';

const API_URL = 'http://192.168.8.156:5000/api';

export const sendMessageAPI = async (messageData) => {
  console.log('sendMessageAPI - Sending:', JSON.stringify(messageData, null, 2));
  try {
    const res = await axios.post(`${API_URL}/messages`, messageData);
    console.log('sendMessageAPI - Response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error('sendMessageAPI - Error:', err.message, err.response?.data);
    throw err;
  }
};

export const getMessagesAPI = async (user1, user2) => {
  console.log('getMessagesAPI - Fetching for:', { user1, user2 });
  try {
    const res = await axios.get(`${API_URL}/messages/${user1}/${user2}`);
    console.log('getMessagesAPI - Response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error('getMessagesAPI - Error:', err.message, err.response?.data);
    throw err;
  }
};

export const getConversationsAPI = async (userId) => {
  console.log('getConversationsAPI - Fetching for userId:', userId);
  try {
    const res = await axios.get(`${API_URL}/messages/user/${userId}`);
    console.log('getConversationsAPI - Response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error('getConversationsAPI - Error:', err.message, err.response?.data);
    throw err;
  }
};

export const markAsReadAPI = async (user1, user2) => {
  console.log('markAsReadAPI - Marking for:', { user1, user2 });
  try {
    const res = await axios.patch(`${API_URL}/messages/${user1}/${user2}/read`);
    console.log('markAsReadAPI - Response:', JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error('markAsReadAPI - Error:', err.message, err.response?.data);
    throw err;
  }
};

export const getUserByIdAPI = async (userId) => {
  console.log('getUserByIdAPI - Fetching for userId:', userId);
  try {
    const res = await axios.get(`${API_URL}/users/by-id/${userId}`);
    console.log('getUserByIdAPI - Response:', JSON.stringify(res.data, null, 2));
    return res.data; // Expected: { _id, username, profilePictureUrl, phoneNumber }
  } catch (err) {
    console.error('getUserByIdAPI - Error:', err.message, err.response?.data);
    throw err;
  }
};