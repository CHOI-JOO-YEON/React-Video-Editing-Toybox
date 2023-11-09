import React from 'react';

// VideoUpload 컴포넌트 정의
const VideoUpload = ({onUpload}) => {
    const handleVideoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // 비디오의 메타데이터를 읽기 위해 비디오 엘리먼트를 생성
            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(file);

            videoElement.onloadedmetadata = () => {
                videoElement.src = ''; // 메모리 누수 방지를 위해 src 제거
                onUpload(file);
            };
        }
    };

    return (
        <div className="video-upload">
            <input type="file" accept="video/*" onChange={handleVideoUpload}/>
        </div>
    );
};

export default VideoUpload;
