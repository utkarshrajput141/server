import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://168.231.123.107:5000");

const App = () => {
  const localVideo = useRef();
  const [peers, setPeers] = useState({});
  const localStream = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    const init = async () => {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.current.srcObject = localStream.current;

      const roomId = "room1"; // Change to dynamic if needed
      socket.emit("join", roomId);

      socket.on("user-joined", async (id) => {
        const pc = createPeerConnection(id);
        peerConnections.current[id] = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { to: id, offer });
      });

      socket.on("offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from);
        peerConnections.current[from] = pc;

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { to: from, answer });
      });

      socket.on("answer", async ({ from, answer }) => {
        const pc = peerConnections.current[from];
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("ice-candidate", ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("user-left", (id) => {
        if (peerConnections.current[id]) {
          peerConnections.current[id].close();
          delete peerConnections.current[id];
          setPeers((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      });
    };

    init();
  }, []);

  const createPeerConnection = (id) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: id, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setPeers((prev) => ({ ...prev, [id]: e.streams[0] }));
    };

    localStream.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    return pc;
  };

  return (
    <div>
      <h2>React WebRTC Group Call</h2>
      <video ref={localVideo} autoPlay muted playsInline width={200} />
      {Object.keys(peers).map((id) => (
        <video
          key={id}
          autoPlay
          playsInline
          width={200}
          srcObject={peers[id]}
          ref={(video) => {
            if (video) video.srcObject = peers[id];
          }}
        />
      ))}
    </div>
  );
};

export default App;
