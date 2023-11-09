import React, { useState, useEffect } from 'react';

const CropAreaSelector = ({ cropData, videoRef, onCropAreaChange }) => {
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: cropData.x, y: cropData.y });
    const [size, setSize] = useState({ width: cropData.width, height: cropData.height });
    const [videoRect, setVideoRect] = useState(null);

    useEffect(() => {
        setPosition({ x: cropData.x, y: cropData.y });
        setSize({ width: cropData.width, height: cropData.height });
        const videoElement = videoRef.current;
        if (videoElement) {
            // 비디오 요소의 경계 값을 한 번만 계산합니다.
            const rect = videoElement.getBoundingClientRect();
            setVideoRect(rect);
        }
    }, [cropData,videoRef]);

    const startDragging = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };


    //마우스가 영역 밖으로 나갈 경우 드래그가 취소되는데 해결하는 로직 필요합니다.
    const onDrag = (e) => {
        if (isDragging) {

            // 드래그로 인한 새 위치 계산
            let newX = position.x + e.movementX;
            let newY = position.y + e.movementY;

            let newEndX = newX+size.width
            let newEndY = newY+size.height

            if(newX<videoRect.left||newY<videoRect.top||newEndX>videoRect.right||newEndY>videoRect.bottom)
            {
                return
            }

            console.log('!')
            setPosition({ x: newX, y: newY });
        }
    };

    const endDrag = () => {
        setIsDragging(false);
        onCropAreaChange({ ...cropData, x: position.x, y: position.y });
    };

    const startResizing = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
    };

    const onResize = (e) => {
        if (isResizing) {
            const newWidth = Math.max(100, size.width + e.movementX);
            const newHeight = newWidth * (16 / 9);


            // 드래그로 인한 새 위치 계산

            let newEndX = position.x+newWidth
            let newEndY = position.y+newHeight

            if(newEndX>videoRect.right||newEndY>videoRect.bottom)
            {return}


            setSize({ width: newWidth, height: newHeight });


        }
    };

    const stopResizing = () => {
        setIsResizing(false);
        onCropAreaChange({ ...cropData, width: size.width, height: size.height });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            onDrag(e);
            onResize(e);
        };

        const handleMouseUp = () => {
            endDrag();
            stopResizing();
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, onDrag, onResize]);

    return (
        <div
            className="crop-area-selector"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                border: '2px solid red',
                boxSizing: 'border-box',
                cursor: 'grab',
            }}
            onMouseDown={startDragging}
            onMouseUp={endDrag}
        >
            <div
                className="resize-handle"
                style={{
                    position: 'absolute',
                    right: '0px',
                    bottom: '0px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: 'blue',
                    cursor: 'nwse-resize',
                }}
                onMouseDown={startResizing}
            ></div>
        </div>
    );
};

export default CropAreaSelector;
