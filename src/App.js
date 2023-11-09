import React, { useState } from 'react';
import VideoEditor from './components/VideoEditor';
import './App.css'; // App 컴포넌트의 스타일을 위한 CSS 파일

function App() {
  const [videoFile, setVideoFile] = useState(null); // 사용자가 업로드한 비디오 파일 상태

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
    }
  };

  return (
      <div className="App">
        {!videoFile && (
            <input type="file" accept="video/*" onChange={handleVideoUpload} />
        )}
        {videoFile && (
            <VideoEditor videoFile={videoFile} />
        )}
      </div>
  );
}

export default App;
