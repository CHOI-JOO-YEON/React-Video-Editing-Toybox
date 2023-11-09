import React, {useEffect, useRef, useState} from 'react';
import CropAreaSelector from './CropAreaSelector';
import {createFFmpeg, fetchFile} from '@ffmpeg/ffmpeg';
import {v4} from 'uuid';

const VideoEditor = ({videoFile}) => {
    const BASE_URL = 'http://localhost:8080';
    const videoRef = useRef(null);
    const [cropData, setCropData] = useState({x: 0, y: 0, width: 0, height: 0});
    const [trimData, setTrimData] = useState({start: 0, end: 0});
    const [trimmedVideoUrl, setTrimmedVideoUrl] = useState('');
    const [isTrimming, setIsTrimming] = useState(false);
    const [ready, setReady] = useState(false);

    const ffmpeg = useRef(null);
    useEffect(() => {
        ffmpeg.current = createFFmpeg({
            log: true,
            corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
        });
    }, []);

    const handleTrimChange = (field, value) => {
        setTrimData(prev => ({...prev, [field]: value}));
    };


    const trimVideo = async (file, startTime, endTime) => {
        setIsTrimming(true);
        const uuid = v4();

        try {
            //파일 이름은 uuid로 랜덤하게 생성합니다.
            const outputFileName = `${uuid}.mp4`;

            if (!ffmpeg.current.isLoaded()) {
                await ffmpeg.current.load();
            }
            // 파일을 FFmpeg 파일 시스템에 작성합니다.

            await ffmpeg.current.FS('writeFile', 'input.mp4', await fetchFile(file));
            // FFmpeg 명령을 실행하여 비디오를 트리밍합니다.
            await ffmpeg.current.run('-ss', String(startTime),'-i', 'input.mp4',  '-to', String(endTime), '-c:v', 'copy','-c:a','copy', outputFileName);

            // 결과 파일을 읽습니다.
            const data = await ffmpeg.current.FS('readFile', outputFileName);

            // Blob으로 변환하고 URL을 생성합니다.
            const videoBlob = await new Blob([data.buffer], { type: 'video/mp4' });


            const videoElement = videoRef.current;
            const videoRect = videoElement.getBoundingClientRect(); // 비디오 요소의 화면상의 절대 좌표
            const cropRatio = (videoRect.width / videoElement.videoWidth);

            const cropStartX = Math.round(cropData.x - videoRect.left + window.scrollX); // 스크롤 보정
            const cropStartY = Math.round(cropData.y - videoRect.top + window.scrollY);  // 스크롤 보정
            const cropWidth = Math.round(cropData.width / cropRatio);
            const cropHeight = Math.round(cropData.height / cropRatio);

            const crop = {
                x: cropStartX, // 크롭 시작 x 좌표
                y: cropStartY,  // 크롭 시작 y 좌표
                width: cropWidth,  // 크롭 너비
                height: cropHeight  // 크롭 높이
            };

            // 프리사인된 URL을 요청하기 위해 백엔드 서버에 파일 이름을 전송합니다.
            const presignedUrl = await getPresignedUrl(outputFileName, crop);

            // 프리사인된 URL을 사용하여 S3에 파일을 업로드합니다.
            await uploadVideo(presignedUrl, videoBlob);

            //서버에 편집요청을 합니다.
            const videoUrl = await uploadComplete(outputFileName);

            //편집이 완료된 영상을 새로운 비디오 플레이어에 띄웁니다.
            setTrimmedVideoUrl(videoUrl);

        } catch (e) {
            console.error(e);
        } finally {
            setIsTrimming(false);
        }
    };

    const handleTrim = () => {
        console.log('트림 처리 시작:', trimData);
        trimVideo(videoFile, trimData.start, trimData.end);
    };

    async function uploadComplete(videoName) {

        const response = await fetch(`${BASE_URL}/api/temp-video/upload/${videoName}/upload-complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });
        const data = await response.json();
        console.log(data)
        return data.url;
    }


    async function getPresignedUrl(videoName, crop) {
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        const dto = {
            videoName: videoName

        };
        // crop의 width와 height가 비디오의 실제 크기와 같은지 비교하고, Crop이 변경되지 않았다고 판단하면 서버로 보내지 않습니다.
        if (crop.width !== videoWidth || crop.height !== videoHeight) {
            dto.crop = crop;
        }

        // 백엔드 서버에 POST 요청을 보냅니다.
        const response = await fetch(`${BASE_URL}/api/temp-video/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            throw new Error('Failed to get presigned URL');
        }

        const data = await response.json();
        return data.url; // 백엔드로부터 받은 프리사인된 URL을 반환합니다.
    }


    // s3에 파일을 업로드함
    async function uploadVideo(presignedUrl, file) {
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: file // 트리밍된 비디오 파일
        });

        if (!response.ok) {
            throw new Error('Failed to upload video');
        }

        console.log('Video uploaded successfully');
    }

    const onLoadedMetadata = () => {
        const videoElement = videoRef.current;
        const rect = videoElement.getBoundingClientRect();
        // 9:16 비율에 맞게 크롭 데이터 설정
        const aspectRatio = 9 / 16;
        let newWidth, newHeight;

        // rect.width / rect.height 가 원하는 비율보다 크거나 같은 경우
        if (rect.width >= rect.height * aspectRatio) {
            // 세로 기준으로 가로 크기 설정
            newHeight = rect.height;
            newWidth = rect.height * aspectRatio;
        } else {
            // 가로 기준으로 세로 크기 설정
            newWidth = rect.width;
            newHeight = rect.width / aspectRatio;
        }

        const x = (rect.width - newWidth) / 2 + rect.left - window.scrollX;
        const y = (rect.height - newHeight) / 2 + rect.top - window.scrollY;

        setCropData({
            x: x,
            y: y,
            width: newWidth,
            height: newHeight,
        });
    };


    const printCropData = () => {
        if (!cropData) return;

        const videoElement = videoRef.current;
        const videoRect = videoElement.getBoundingClientRect(); // 비디오 요소의 화면상의 절대 좌표

        // 크롭 데이터에서 비디오 요소의 상대적인 좌표를 계산
        const cropStartX = Math.round(cropData.x - videoRect.left + window.scrollX); // 스크롤 보정
        const cropStartY = Math.round(cropData.y - videoRect.top + window.scrollY);  // 스크롤 보정

        const cropRatio = (videoRect.width / videoElement.videoWidth);

        const cropWidth = Math.round(cropData.width / cropRatio);
        const cropHeight = Math.round(cropData.height / cropRatio);

        // 원본 비디오 크기 대비 크롭 크기의 비율을 계산하여 백분율로 표현

        console.log(`크롭 상대 시작점: (${cropStartX}, ${cropStartY})`);
        console.log(`크롭 크기: (${cropWidth}, ${cropHeight})`);
    };


    return (
        <div className="video-editor"
             style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
            <video
                ref={videoRef}
                onLoadedMetadata={onLoadedMetadata}
                style={{maxHeight: '100vh'}} // 비디오의 세로 크기를 화면에 맞춤
                controls
            >
                <source src={URL.createObjectURL(videoFile)} type="video/mp4"/>
            </video>
            <CropAreaSelector
                videoRef={videoRef}
                cropData={cropData}
                onCropAreaChange={setCropData}
            />
            {/* 트림 설정 인터페이스 */}
            <div>
                <label>
                    시작 시간:
                    <input
                        type="number"
                        value={trimData.start}
                        onChange={(e) => handleTrimChange('start', parseFloat(e.target.value))}
                        step="0.01"
                    />
                </label>
                <label>
                    종료 시간:
                    <input
                        type="number"
                        value={trimData.end}
                        onChange={(e) => handleTrimChange('end', parseFloat(e.target.value))}
                        step="0.01"
                    />
                </label>
                <button onClick={handleTrim}>트림 실행</button>
            </div>

            {/* 트림된 비디오 플레이어 */}
            {trimmedVideoUrl && (
                <video controls style={{marginTop: '20px'}} crossOrigin="anonymous">
                    <source src={trimmedVideoUrl} type="video/mp4"/>
                </video>
            )}
            <button onClick={printCropData}>크롭 데이터 출력</button>
        </div>
    );
};

export default VideoEditor;
