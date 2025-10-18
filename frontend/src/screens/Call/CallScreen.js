// frontend/src/screens/Call/CallScreen.js - Real WebRTC Call Screen
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { RTCPeerConnection, RTCView, mediaDevices } from "react-native-webrtc";
import io from "socket.io-client";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function CallScreen({ route, navigation }) {
  const { user } = useAuth();
  const { otherUser, conversation, callType, isOutgoing } = route.params;

  const [callStatus, setCallStatus] = useState(isOutgoing ? "calling" : "incoming");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const peerConnection = useRef(null);
  const callTimer = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ICE Servers configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    initializeCall();
    startPulseAnimation();

    return () => {
      cleanup();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const initializeCall = async () => {
    try {
      const token = await user.getIdToken();

      // Initialize Socket
      socketRef.current = io(API_URL, {
        transports: ["websocket", "polling"],
        auth: { token },
      });

      socketRef.current.on("connect", () => {
        console.log("📞 Call socket connected");
        
        if (isOutgoing) {
          // Start outgoing call
          startOutgoingCall();
        }
      });

      // Handle call answer
      socketRef.current.on("callAnswered", async ({ answer, from }) => {
        console.log("✅ Call answered");
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(answer);
          setCallStatus("connected");
          startCallTimer();
        }
      });

      // Handle incoming offer
      socketRef.current.on("callOffer", async ({ offer, from, callerName }) => {
        console.log("📥 Received call offer");
        await handleIncomingCall(offer, from);
      });

      // Handle ICE candidates
      socketRef.current.on("iceCandidate", async ({ candidate }) => {
        if (peerConnection.current && candidate) {
          await peerConnection.current.addIceCandidate(candidate);
        }
      });

      // Handle call rejection
      socketRef.current.on("callRejected", () => {
        Alert.alert("Call Declined", "The user declined your call", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      });

      // Handle call end
      socketRef.current.on("callEnded", () => {
        endCall();
      });

    } catch (error) {
      console.error("Call initialization error:", error);
      Alert.alert("Error", "Failed to initialize call");
      navigation.goBack();
    }
  };

  const startOutgoingCall = async () => {
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      setLocalStream(stream);

      // Create peer connection
      peerConnection.current = new RTCPeerConnection(iceServers);

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        console.log("📹 Received remote stream");
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("iceCandidate", {
            candidate: event.candidate,
            to: otherUser._id,
            conversationId: conversation._id,
          });
        }
      };

      // Create and send offer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socketRef.current.emit("callUser", {
        offer,
        to: otherUser._id,
        from: user.uid,
        callType,
        conversationId: conversation._id,
        callerName: user.displayName || "User",
      });

    } catch (error) {
      console.error("Error starting call:", error);
      Alert.alert("Error", "Failed to start call. Please check permissions.");
      navigation.goBack();
    }
  };

  const handleIncomingCall = async (offer, from) => {
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      setLocalStream(stream);

      // Create peer connection
      peerConnection.current = new RTCPeerConnection(iceServers);

      // Add local stream
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        console.log("📹 Received remote stream");
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("iceCandidate", {
            candidate: event.candidate,
            to: from,
            conversationId: conversation._id,
          });
        }
      };

      // Set remote description and create answer
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socketRef.current.emit("answerCall", {
        answer,
        to: from,
        conversationId: conversation._id,
      });

      setCallStatus("connected");
      startCallTimer();

    } catch (error) {
      console.error("Error handling incoming call:", error);
      Alert.alert("Error", "Failed to answer call");
      navigation.goBack();
    }
  };

  const answerCall = async () => {
    setCallStatus("connecting");
    // The actual answering happens in handleIncomingCall
    // which is triggered by the offer
  };

  const rejectCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("rejectCall", {
        to: otherUser._id,
        conversationId: conversation._id,
      });
    }
    navigation.goBack();
  };

  const endCall = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
    }

    if (socketRef.current) {
      socketRef.current.emit("endCall", {
        to: otherUser._id,
        conversationId: conversation._id,
        duration: callDuration,
      });
    }

    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (callTimer.current) {
      clearInterval(callTimer.current);
    }
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // Implementation depends on native module
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderCallStatus = () => {
    switch (callStatus) {
      case "calling":
        return "Calling...";
      case "incoming":
        return "Incoming call";
      case "connecting":
        return "Connecting...";
      case "connected":
        return formatDuration(callDuration);
      default:
        return "";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1C" />

      {/* Video Views for Video Calls */}
      {callType === "video" && callStatus === "connected" && (
        <>
          {remoteStream && (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          )}
          {localStream && (
            <View style={styles.localVideoContainer}>
              <RTCView
                streamURL={localStream.toURL()}
                style={styles.localVideo}
                objectFit="cover"
                mirror
              />
            </View>
          )}
        </>
      )}

      {/* Voice Call UI */}
      {(callType === "voice" || callStatus !== "connected") && (
        <View style={styles.voiceCallContainer}>
          <View style={styles.userInfoContainer}>
            <Animated.View
              style={[
                styles.avatarContainer,
                callStatus === "calling" && {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {otherUser.profilePictureUrl ? (
                <Image
                  source={{ uri: otherUser.profilePictureUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Text style={styles.placeholderText}>
                    {otherUser.username?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              {callStatus === "calling" && (
                <View style={styles.pulseRing1} />
              )}
              {callStatus === "calling" && (
                <View style={styles.pulseRing2} />
              )}
            </Animated.View>

            <Text style={styles.userName}>{otherUser.username}</Text>
            <Text style={styles.callStatus}>{renderCallStatus()}</Text>
          </View>
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        {callStatus === "incoming" ? (
          // Incoming call buttons
          <View style={styles.incomingCallButtons}>
            <TouchableOpacity
              style={[styles.callButton, styles.rejectButton]}
              onPress={rejectCall}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, styles.answerButton]}
              onPress={answerCall}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          // Active call controls
          <View style={styles.activeCallControls}>
            <TouchableOpacity
              style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
              onPress={toggleSpeaker}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isSpeaker ? "volume-high" : "volume-medium"}
                size={28}
                color="#FFF"
              />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isMuted ? "microphone-off" : "microphone"}
                size={28}
                color="#FFF"
              />
              <Text style={styles.controlLabel}>Mute</Text>
            </TouchableOpacity>

            {callType === "video" && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="camera-flip" size={28} color="#FFF" />
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* End Call Button (always visible except for incoming) */}
        {callStatus !== "incoming" && (
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={endCall}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1C",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  localVideoContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  voiceCallContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfoContainer: {
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 32,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: "#2F6F61",
  },
  placeholderAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#2F6F61",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#34C759",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 56,
    fontWeight: "700",
  },
  pulseRing1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "rgba(47, 111, 97, 0.4)",
    top: -20,
    left: -20,
  },
  pulseRing2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(47, 111, 97, 0.2)",
    top: -40,
    left: -40,
  },
  userName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  incomingCallButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 300,
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  answerButton: {
    backgroundColor: "#34C759",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  activeCallControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 32,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonActive: {
    backgroundColor: "#2F6F61",
  },
  controlLabel: {
    color: "#FFF",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});