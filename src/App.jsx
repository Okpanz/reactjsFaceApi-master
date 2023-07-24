import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';

const FacialRecognitionComponent = () => {
  const [cameraStream, setCameraStream] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [matricNumber, setMatricNumber] = useState('');
  const [isMatchFound, setIsMatchFound] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Request access to the user's camera
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error('Error accessing the camera:', err));
  }, []);

  const fetchImageArray = async () => {
    try {
      const response = await axios.post('https://pleasant-tie-deer.cyclic.app/api/v1/test/faceverify', { matric_number: matricNumber });
      setImageUrls(response.data.images);
      console.log(response.data.images);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  useEffect(() => {
    // Load the Face-API.js models
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    ]).then(() => {
      // Once the models are loaded, fetch the image array
      if (matricNumber !== '') {
        fetchImageArray();
      }
    });
  }, [matricNumber]);

  const startRecognition = async () => {
    // Wait for the models to be loaded
    if (!videoRef.current || !faceapi.nets.tinyFaceDetector.params || !faceapi.nets.faceRecognitionNet.params || !faceapi.nets.faceLandmark68Net.params) {
      setTimeout(startRecognition, 100);
      return;
    }

    // Perform facial recognition on the camera feed
    const canvas = faceapi.createCanvasFromMedia(videoRef.current);
    document.body.append(canvas);
    const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      console.log('Detected faces:', detections); // Log the detected faces for debugging
      if (detections.length > 0) {
        // Perform comparison logic here using the detected faces and the fetched image data
        compareWithImages(detections);
      }
    }, 100);
  };

  const compareWithImages = (detections) => {
    // Check if images are fetched
    if (imageUrls.length === 0) return;

    let matchFound = false;

    detections.forEach((face) => {
      // Check if face descriptor is valid
      if (!face.descriptor) return;

      // Loop through the fetched image descriptors and compare with the detected face descriptor
      for (const imageUrl of imageUrls) {
        const descriptor = imageUrl.descriptor; // Assuming the descriptor is stored in the 'descriptor' property of each fetched image
        if (!descriptor) return; // Skip if the fetched descriptor is invalid

        const distance = faceapi.euclideanDistance(face.descriptor, descriptor);

        // You can set a threshold value to determine if it's a match or not
        // For example, if the distance is below a certain threshold, it's considered a match
        const threshold = 0.6;
        if (distance < threshold) {
          // It's a match!
          matchFound = true;
          break; // Exit the loop once a match is found
        }
      }
    });

    setIsMatchFound(matchFound);
  };

  const handleInputChange = (event) => {
    setMatricNumber(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (matricNumber !== '') {
      fetchImageArray();
      startRecognition();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Display the camera feed */}
      <video ref={videoRef} autoPlay style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }} />

      {/* Input field for matric_number */}
      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        <input
          type="text"
          value={matricNumber}
          onChange={handleInputChange}
          placeholder="Enter your matric number"
          style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ marginLeft: '8px', padding: '8px 16px', fontSize: '16px', borderRadius: '4px', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }}>
          Submit
        </button>
      </form>

      {/* Display match result */}
      {isMatchFound ? (
        <div style={{ marginTop: '16px', color: 'green' }}>Face Match Found!</div>
      ) : (
        <div style={{ marginTop: '16px', color: 'red' }}>No Face Match Found</div>
      )}
    </div>
  );
};

export default FacialRecognitionComponent;
