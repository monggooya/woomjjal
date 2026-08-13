import React, { useState, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import GIF from 'gif.js';

export default function GifMakerApp() {
  // 📐 자유로운 비율 조절을 위한 미리보기 박스 크기 상태 (기본값 가로 560px, 세로 315px = 16:9 느낌)
  const [previewSize, setPreviewSize] = useState({ width: 560, height: 315 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // 🔍 State 모여있는 곳 아무 데나 추가!
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. 저장 포맷 상태 (기본값: 'gif')
  const [exportFormat, setExportFormat] = useState('gif');

// ✂️ 포토샵식 크롭을 위한 상태들
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 300, h: 300 });
  const [activeHandle, setActiveHandle] = useState(null); // 'nw', 'ne', 'sw', 'se'
  const cropStartRef = useRef(null); // 드래그 시작점 기억

  const [textPos, setTextPos] = useState({ x: 80, y: 150 });
  const [text, setText] = useState('자막을 설정해보세요.');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('"Jua", sans-serif');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [hasShadow, setHasShadow] = useState(true);
  const [fontSize, setFontSize] = useState(40);
  const [isItalic, setIsItalic] = useState(false);
  const [hasStroke, setHasStroke] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textOpacity, setTextOpacity] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  
  const previewRef = useRef(null);
  const [images, setImages] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isImgDragging, setIsImgDragging] = useState(false);
  const [imgDragStart, setImgDragStart] = useState({ x: 0, y: 0 });
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [batchTime, setBatchTime] = useState(0.5);

  const [activeTab, setActiveTab] = useState(null);
  const [isPanelTop, setIsPanelTop] = useState(false);

  // 🔲 자막 배경용 상태
  const [hasBackground, setHasBackground] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      duration: 0.5,
      subtitle: "",
      scale: 1,
      imgPos: { x: 0, y: 0 },
      blur: 0,
      contrast: 100,
      brightness: 100,
      saturate: 100,
      noise: 0
    }));
    
    setImages(prevImages => {
      const updated = [...prevImages, ...newMedia];
      if (!selectedMedia) setSelectedMedia(updated[0]); 
      return updated;
    });
  };

  const handleSort = () => {
    let _images = [...images];
    const draggedItemContent = _images.splice(dragItem.current, 1)[0];
    _images.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setImages(_images);
  };

  const handleTimeChange = (index, newTime) => {
    const _images = [...images];
    _images[index].duration = Number(newTime);
    setImages(_images);
  };

  const handleAllTimeChange = () => {
    const newTime = Number(batchTime);
    if (isNaN(newTime) || newTime <= 0) {
      alert("올바른 숫자를 입력해주세요! (0보다 큰 숫자)");
      return;
    }
    const _images = images.map(img => ({ ...img, duration: newTime }));
    setImages(_images);

    // 💡 [1번 버그 해결] 화면에 띄워진 '현재 사진'의 시간 상태도 같이 최신화!
    if (selectedMedia) {
      setSelectedMedia(prev => ({ ...prev, duration: newTime }));
    }
  };

  // 📐 액자 틀(비율 크롭) 우측 하단 핸들 마우스 다운
  const startResize = (e) => {
    e.stopPropagation(); // 이미지 드래그 발동 방지
    setIsResizing(true);
    resizeStart.current = {
      width: previewSize.width,
      height: previewSize.height,
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    };
  };

  // 🖱️ 자막 드래그 시작
  const handleMouseDown = () => setIsDragging(true);
  
  // 🔄 마우스 & 터치 이동 통합 관리 (자막 이동 + 액자 비율 크롭 조절)
  const handleMouseMove = (e) => {
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    // 1. ✂️ 크롭 모서리 잡고 드래그 중일 때
    if (activeHandle) {
      const deltaX = clientX - cropStartRef.current.startX;
      const deltaY = clientY - cropStartRef.current.startY;
      let newBox = { ...cropStartRef.current.startBox };

      if (activeHandle.includes('e')) newBox.w = Math.max(100, newBox.w + deltaX);
      if (activeHandle.includes('s')) newBox.h = Math.max(100, newBox.h + deltaY);
      if (activeHandle.includes('w')) {
        const shift = Math.min(deltaX, newBox.w - 100);
        newBox.x += shift; newBox.w -= shift;
      }
      if (activeHandle.includes('n')) {
        const shift = Math.min(deltaY, newBox.h - 100);
        newBox.y += shift; newBox.h -= shift;
      }
      setCropBox(newBox);
      return; 
    }

    // 2. [수정] 📸 이미지(사진) 캔버스 드래그 중일 때 (리액트 State 정석 방식으로 변경)
    if (isImgDragging && selectedMedia) {
      const nextX = clientX - imgDragStart.x;
      const nextY = clientY - imgDragStart.y;

      // 💡 직접 selectedMedia.imgPos를 수정하는 대신, 새 객체를 만들어서 setState 해주는 정석 방식!
      const updatedMedia = {
        ...selectedMedia,
        imgPos: { x: nextX, y: nextY }
      };
      setSelectedMedia(updatedMedia); // 선택된 이미지 정보 업데이트

      const updatedImages = images.map(img => 
        img.id === selectedMedia.id ? updatedMedia : img
      );
      setImages(updatedImages); // 전체 이미지 배열 업데이트
      return; 
    }

    // 3. ✍️ 자막 드래그 중일 때
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    let x = clientX - rect.left - 100;
    let y = clientY - rect.top - 20;
    x = Math.max(0, Math.min(x, rect.width - 150));
    y = Math.max(0, Math.min(y, rect.height - 40));
    setTextPos({ x, y });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsImgDragging(false);

    // ✂️ 마우스를 놓는 순간 싹둑 자르기
    if (activeHandle) {
      // 1. 액자 크기를 내가 그린 크롭 박스 크기로 변경
      setPreviewSize({ width: cropBox.w, height: cropBox.h });
      
      // 2. [수정] 잘려 나간 좌표만큼 이미지 위치를 보정하면서, selectedMedia도 새 객체로 싱크 맞춰주기!
      const updated = images.map(img => {
        const newImg = {
          ...img,
          imgPos: { x: img.imgPos.x - cropBox.x, y: img.imgPos.y - cropBox.y }
        };
        // 💡 중요: 지금 쌤이 보고 있는 이미지라면 selectedMedia State도 같이 새것으로 교체해 줘!
        if (img.id === selectedMedia.id) {
          setSelectedMedia(newImg);
        }
        return newImg;
      });
      setImages(updated);
      
      // 3. 모드를 강제 종료하지 말고, 방금 자른 새 액자 크기(0, 0)에 맞춰서 점선 박스만 찰싹 붙여줌!
      setCropBox({ x: 0, y: 0, w: cropBox.w, h: cropBox.h });
      setActiveHandle(null);
    }
  };

  // 📸 이미지 클릭 시작할 때 좌표 제대로 잡기
  const handleImgMouseDown = (e) => {
    // 자막(.cursor-move)이나 버튼을 누른 게 아닐 때만 이미지 드래그 시작!
    if (e.target.tagName === 'INPUT' || e.target.closest('.cursor-move') || !selectedMedia) return; 
    setIsImgDragging(true);
    
    // PC 마우스 & 모바일 터치 둘 다 대응
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    
    setImgDragStart({ 
      x: clientX - selectedMedia.imgPos.x, 
      y: clientY - selectedMedia.imgPos.y 
    });
  };

  const handleImgMouseMove = (e) => {
    if (!isImgDragging || !selectedMedia) return;
    const nextX = e.clientX - imgDragStart.x;
    const nextY = e.clientY - imgDragStart.y;
    selectedMedia.imgPos = { x: nextX, y: nextY };
    setImages([...images]);
  };

  // 🎬 전체 미리보기 재생 감독님
  const handlePreviewPlay = async () => {
    if (images.length === 0) return;
    
    setIsPlaying(true); // 🔴 온에어 불 켜기!
    
    for (let i = 0; i < images.length; i++) {
      const currentImg = images[i];
      setSelectedMedia(currentImg);        // 사진 바꾸고
      setText(currentImg.subtitle || "");  // 자막도 맞게 바꾸고!
      
      // ⏱️ 해당 사진의 duration(초) 만큼 기다리기!
      await new Promise(resolve => setTimeout(resolve, currentImg.duration * 1000));
    }
    
    setIsPlaying(false); // 💡 상영 끝! 불 끄기
  };

  const handleBakeGif = async () => {
    if (images.length === 0) {
      alert("굽기 전에 사진이나 영상을 먼저 올려줘!");
      return;
    }

    setActiveTab(null); 
    
    try {
      const gif = new GIF({
        workers: 2,
        quality: 30, 
        workerScript: '/gif.worker.js',
        width: previewRef.current.offsetWidth,
        height: previewRef.current.offsetHeight
      });

      for (let i = 0; i < images.length; i++) {
        const currentImg = images[i];
        setSelectedMedia(currentImg);
        setText(currentImg.subtitle || ""); 
        await new Promise(resolve => setTimeout(resolve, 300));

        const dataUrl = await htmlToImage.toPng(previewRef.current, { 
          useCORS: true,     // 👈 [추가!] 외부 구글 폰트/이미지 보안 장벽 프리패스 옵션!
          allowTaint: true,   // 👈 [추가!] 혹시 모를 캔버스 오염 에러 방어 방패!
          style: { borderRadius: '0px' }
        });
        const imgElement = new Image();
        imgElement.src = dataUrl;
        await new Promise(resolve => { imgElement.onload = resolve; });

        gif.addFrame(imgElement, { delay: images[i].duration * 1000 });
      }

      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-retro-gif.gif';
        a.click();
      });

      gif.render();
    } catch (error) {
      console.error(error);
      alert('오류가 발생하였습니다.');
    }
  };

  // 🎬 동영상 파일로 굽기 함수
  const handleBakeVideo = async () => {
    if (images.length === 0) {
      alert("굽기 전에 사진이나 영상을 먼저 올려줘!");
      return;
    }

    try {
      // 1. htmlToImage로 캡처할 캔버스 생성 준비
      const canvas = document.createElement('canvas');
      canvas.width = previewRef.current.offsetWidth;
      canvas.height = previewRef.current.offsetHeight;
      const ctx = canvas.getContext('2d');

      // 2. 브라우저 MediaRecorder 세팅
      const stream = canvas.captureStream(30); // 30fps
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-problem-solving-video.webm';
        a.click();
      };

      mediaRecorder.start();

      // 3. 사진 프레임별로 순차적으로 캔버스에 그려서 녹화하기
      for (let i = 0; i < images.length; i++) {
        const currentImg = images[i];
        setSelectedMedia(currentImg);
        setText(currentImg.subtitle || ""); 
        await new Promise(resolve => setTimeout(resolve, 200));

        const dataUrl = await htmlToImage.toPng(previewRef.current, { 
          cacheBust: true,
          useCORS: true,     // 👈 [추가!] 외부 구글 폰트/이미지 보안 장벽 프리패스 옵션!
          allowTaint: true,   // 👈 [추가!] 혹시 모를 캔버스 오염 에러 방어 방패!
          style: { borderRadius: '0px' }
        });
        const imgElement = new Image();
        imgElement.src = dataUrl;
        await new Promise(resolve => { imgElement.onload = resolve; });

        // 캔버스에 프레임 그리기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

        // 지정된 재생 시간만큼 대기
        await new Promise(resolve => setTimeout(resolve, currentImg.duration * 1000));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error(error);
      alert('오류가 발생하였습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans select-none"
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onTouchMove={handleMouseMove}
         onTouchEnd={handleMouseUp}>
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">🎬 숏폼 만들기</h1>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-6">
        
        <input 
          type="file" 
          accept="image/*,video/*" 
          multiple
          className="hidden" 
          id="fileInput"
          onChange={handleImageUpload}
        />
        
        <div 
          onClick={() => document.getElementById('fileInput').click()}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
        >
          <span className="text-gray-500 font-medium text-lg">+ 사진/영상 추가</span>
          <span className="text-gray-400 text-sm mt-1">드래그해서 여러 장 선택 가능</span>
        </div>

        {/* 📐 움짤 크기 비율 설정 버튼 재도입 */}
        <div className="w-full flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <span className="text-xs font-bold text-gray-600">이미지 비율:</span>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '(1:1)', w: 400, h: 400 },
              { label: '(16:9)', w: 560, h: 315 },
              { label: '(4:3)', w: 480, h: 360 },
              { label: '(9:16)', w: 315, h: 560 },
              { label: '자유', isCrop: true } // 👈 새로 추가된 녀석!
            ].map((ratio) => (
              <button
                key={ratio.label}
                type="button"
                onClick={() => {
                  if (ratio.isCrop) {
                    // 💡 핵심: 이미 켜져 있으면 끄고(false), 꺼져 있으면 켜기(true)
                    if (isCropMode) {
                      setIsCropMode(false);
                    } else {
                      setIsCropMode(true);
                      setCropBox({ x: 40, y: 40, w: previewSize.width - 80, h: previewSize.height - 80 });
                    }
                  } else {
                    setIsCropMode(false);
                    setPreviewSize({ width: ratio.w, height: ratio.h });
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                  /* 💡 디자인 처리: 자유 크롭 모드일 때도 보라색으로 불이 들어오게 수정! */
                  (ratio.isCrop && isCropMode) || (!ratio.isCrop && previewSize.width === ratio.w && previewSize.height === ratio.h)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📸 썸네일 리스트 & 일괄 변경 컨트롤 패널 */}
        {images.length > 0 && (
          <div className="w-full flex flex-col gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-2 z-10">
            {/* ⏱️ 일괄 적용 컨트롤러 */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-sm font-bold text-gray-700">📸 추가된 컷 (총 {images.length}장)</span>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-600">일괄 변경:</span>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={batchTime}
                  onChange={(e) => setBatchTime(e.target.value)}
                  className="w-14 px-1 py-1 text-center border border-gray-300 rounded bg-white text-xs text-gray-800 focus:outline-none focus:border-green-500"
                />
                <span className="text-xs text-gray-500 font-medium">초</span>
                <button 
                  onClick={handleAllTimeChange}
                  className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition active:scale-95"
                >
                  적용
                </button>
              </div>
            </div>
            
            {/* 기존 썸네일 리스트 */}
            <div className="flex gap-4 overflow-x-auto py-2 px-1">
              {images.map((img, index) => (
                <div key={img.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div 
                    onClick={() => {setSelectedMedia(img);
                      setText(img.subtitle || ""); // 👈 [핵심] 이 이미지에 저장된 자막으로 업데이트!
                    }}
                    draggable 
                    onDragStart={(e) => (dragItem.current = index)}
                    onDragEnter={(e) => (dragOverItem.current = index)}
                    onDragEnd={handleSort}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md cursor-pointer active:cursor-grabbing hover:border-blue-400 transition-colors"
                  >
                    {img.type === 'video' ? (
                      <video src={img.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={img.url} alt={`썸네일 ${index}`} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-0 left-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-br-md font-bold pointer-events-none">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0.1"
                      value={img.duration}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className="w-14 px-1 py-0.5 text-center border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-500 font-medium">초</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📺 메인 미리보기 박스 영역 (이제 style에서 가로세로를 주도적으로 조절!) */}
        <div className="w-full flex items-start justify-start p-4 bg-gray-50 rounded-xl border border-gray-200 overflow-auto">
          
          <div 
            ref={previewRef}
            onMouseDown={handleImgMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            
            // 💡 [해결 2] 모바일에서 사진 터치 시 앱 화면 스크롤 원천 차단! (touchAction: 'none')
            className="relative bg-gray-800 rounded-xl overflow-hidden shadow-inner max-w-full z-0"
            style={{ width: `${previewSize.width}px`, height: `${previewSize.height}px`, touchAction: 'none' }} 
            
            // 💡 [해결 3] 두 손가락 핀치 줌(확대/축소) 로직 완벽 구현!
            onTouchStart={(e) => {
              if (e.target.closest('button') || e.target.cursor) return;
              
              if (e.touches.length === 2) {
                // ✌️ 두 손가락일 때: 확대/축소 모드 돌입
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                previewRef.current.pinchStartDist = dist;
                previewRef.current.pinchStartScale = selectedMedia?.scale || 1;
              } else if (e.touches.length === 1) {
                // 👆 한 손가락일 때: 기존 드래그(이동) 모드
                handleImgMouseDown(e);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && selectedMedia) {
                // ✌️ 두 손가락 거리에 맞춰서 사진 비율 스무스하게 변경
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const startDist = previewRef.current.pinchStartDist || dist;
                const startScale = previewRef.current.pinchStartScale || 1;
                
                let newScale = startScale * (dist / startDist);
                newScale = Math.max(0.1, Math.min(newScale, 5)); // 0.1배 ~ 5배 사이로 리밋 걸기
                
                const updatedMedia = { ...selectedMedia, scale: Number(newScale.toFixed(2)) };
                setSelectedMedia(updatedMedia);
                setImages(prev => prev.map(img => img.id === selectedMedia.id ? updatedMedia : img));
              } else if (e.touches.length === 1) {
                // 👆 한 손가락 드래그로 위치 이동
                handleMouseMove(e);
              }
            }}
            onTouchEnd={(e) => {
              previewRef.current.pinchStartDist = null;
              handleMouseUp();
            }}
          >
            {selectedMedia ? (
              <>
                {/* 노이즈 레이어 */}
                <div className="absolute inset-0 pointer-events-none z-10 opacity-25" style={{ display: selectedMedia.noise > 0 ? 'block' : 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, filter: `contrast(${100 + selectedMedia.noise * 8}%)` }} />

                <div className="w-full h-full overflow-hidden flex items-start justify-start relative">
                  {selectedMedia.type === 'video' ? (
                    <video 
                      src={selectedMedia.url} autoPlay loop muted 
                      className="absolute pointer-events-none"
                      // 💡 [해결 1] 어떤 거대 사진이 와도 무조건 액자(100%)에 쏙 들어가게 절대규격 강제 적용!
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        left: 0, 
                        top: 0,
                        transform: `translate(${selectedMedia.imgPos.x}px, ${selectedMedia.imgPos.y}px) scale(${selectedMedia.scale})`, 
                        filter: `blur(${selectedMedia.blur}px) contrast(${selectedMedia.contrast}%) brightness(${selectedMedia.brightness}%) saturate(${selectedMedia.saturate}%)`,
                        transformOrigin: 'center'
                      }}
                    />
                  ) : (
                    <img 
                      src={selectedMedia.url} 
                      draggable={false} 
                      decoding="async"
                      className="absolute pointer-events-none"
                      // 💡 [해결 1] 어떤 거대 사진이 와도 무조건 액자(100%)에 쏙 들어가게 절대규격 강제 적용!
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        left: 0, 
                        top: 0,
                        transform: `translate(${selectedMedia.imgPos.x}px, ${selectedMedia.imgPos.y}px) scale(${selectedMedia.scale})`, 
                        filter: `blur(${selectedMedia.blur}px) contrast(${selectedMedia.contrast}%) brightness(${selectedMedia.brightness}%) saturate(${selectedMedia.saturate}%)`,
                        transformOrigin: 'center'
                      }} 
                    />
                  )}
                </div>
                
                {/* 3. 자막 레이어 */}
                <div 
                  draggable={false}
                  // 💡 [버그 해결 1] 마우스/터치 시작할 때 '초기 자막 위치'와 '초기 손가락 위치' 기억!
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    previewRef.current.isTextDragging = true;
                    previewRef.current.startX = e.clientX;
                    previewRef.current.startY = e.clientY;
                    // (혹시 자막 위치 변수 이름이 textPos가 아니라면 쌤 코드에 맞게 살짝 바꿔줘!)
                    previewRef.current.initTextX = selectedMedia.textPos?.x || 0;
                    previewRef.current.initTextY = selectedMedia.textPos?.y || 0;
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    previewRef.current.isTextDragging = true;
                    previewRef.current.startX = e.touches[0].clientX;
                    previewRef.current.startY = e.touches[0].clientY;
                    previewRef.current.initTextX = selectedMedia.textPos?.x || 0;
                    previewRef.current.initTextY = selectedMedia.textPos?.y || 0;
                  }}
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    if (!previewRef.current.isTextDragging) return;
                    const deltaX = e.clientX - previewRef.current.startX;
                    const deltaY = e.clientY - previewRef.current.startY;
                    
                    const updatedMedia = { 
                      ...selectedMedia, 
                      textPos: { x: previewRef.current.initTextX + deltaX, y: previewRef.current.initTextY + deltaY } 
                    };
                    setSelectedMedia(updatedMedia);
                    setImages(prev => prev.map(img => img.id === selectedMedia.id ? updatedMedia : img));
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    if (!previewRef.current.isTextDragging) return;
                    const deltaX = e.touches[0].clientX - previewRef.current.startX;
                    const deltaY = e.touches[0].clientY - previewRef.current.startY;
                    
                    const updatedMedia = { 
                      ...selectedMedia, 
                      textPos: { x: previewRef.current.initTextX + deltaX, y: previewRef.current.initTextY + deltaY } 
                    };
                    setSelectedMedia(updatedMedia);
                    setImages(prev => prev.map(img => img.id === selectedMedia.id ? updatedMedia : img));
                  }}
                  onMouseUp={(e) => { e.stopPropagation(); previewRef.current.isTextDragging = false; }}
                  onMouseLeave={(e) => { e.stopPropagation(); previewRef.current.isTextDragging = false; }}
                  onTouchEnd={(e) => { e.stopPropagation(); previewRef.current.isTextDragging = false; }}
                  className="absolute cursor-move transition-transform duration-75 active:scale-105 z-20 select-none touch-none"
                  style={{ 
                    top: textPos.y, left: textPos.x, color: textColor,
                    fontFamily: fontFamily, fontSize: `${fontSize}px`, 
                    fontStyle: isItalic ? 'italic' : 'normal',
                    opacity: textOpacity / 100,
                    WebkitTextStroke: hasStroke ? `${strokeWidth}px ${strokeColor}` : '0px transparent',
                    paintOrder: 'stroke fill', 
                    textShadow: hasShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                    backgroundColor: hasBackground ? bgColor : 'transparent',
                    padding: hasBackground ? '5px 10px' : '0px',
                    borderRadius: '4px'
                    // 🛡️ 기존 방패 3개 (저번에 넣었던 거 그대로 유지)
                    userSelect: 'none',
                    WebkitUserSelect: 'none', 
                    touchAction: 'none',
                    // 🛡️ 얄미운 아이폰 억까 차단용 새 방패 2개 (여기에 쏙 추가!)
                    WebkitUserDrag: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                >
                  {text}
                </div>

                {/* 4. 세팅 조절바 패널 영역 */}
                {selectedMedia && activeTab && (
                  <div 
                    // 💡 [버그 해결] 메뉴판 안에서의 터치/스크롤/마우스 움직임이 뒤쪽 사진으로 뚫고 나가는 걸 완벽 방어!
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseMove={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    
                    className={`absolute left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 z-30 border border-white/10 flex flex-col gap-3 text-white text-xs max-h-40 overflow-y-auto shadow-2xl transition-all duration-300 ${isPanelTop ? 'top-4' : 'bottom-4'}`}
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="font-bold text-purple-300">
                        {activeTab === 'scale' && '확대'}
                        {activeTab === 'blur' && '흐림'}
                        {activeTab === 'brightness' && '명도'}
                        {activeTab === 'contrast' && '대비'}
                        {activeTab === 'saturate' && '채도'}
                        {activeTab === 'noise' && '노이즈'}
                        {activeTab === 'text' && '자막 설정'}
                      </span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsPanelTop(!isPanelTop)} className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded font-bold text-sm transition-colors">
                          {isPanelTop ? '아래로' : '위로'}
                        </button>
                        <button type="button" onClick={() => setActiveTab(null)} className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded font-bold text-sm text-red-300 hover:text-red-100 transition-colors">
                          ✕
                        </button>
                      </div>
                    </div>

                    {activeTab !== 'text' && (
                      <div className="flex items-center gap-4 w-full">
                        <input type="range" min={activeTab === 'scale' ? "0.1" : activeTab === 'contrast' || activeTab === 'brightness' ? "50" : "0"} max={activeTab === 'scale' ? "4" : activeTab === 'contrast' || activeTab === 'brightness' ? "150" : activeTab === 'saturate' ? "200" : activeTab === 'blur' ? "4" : "10"} step={activeTab === 'scale' || activeTab === 'blur' ? "0.1" : "1"} value={selectedMedia[activeTab]} onChange={(e) => { selectedMedia[activeTab] = Number(e.target.value); setImages([...images]); }} className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none" />
                        <span className="w-12 text-right font-mono">{selectedMedia[activeTab]}{activeTab === 'scale' ? '배' : activeTab === 'blur' ? 'px' : activeTab === 'noise' ? '단' : '%'}</span>
                      </div>
                    )}

                    {activeTab === 'text' && (
                      <div className="flex flex-col gap-3 w-full mt-2">
                        <div className="flex flex-wrap gap-2 items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                          <input type="text" value={selectedMedia?.subtitle || ""} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => { const newText = e.target.value; setText(newText); const updatedImages = images.map(img => img.id === selectedMedia.id ? { ...img, subtitle: newText } : img); setImages(updatedImages); setSelectedMedia(prev => ({ ...prev, subtitle: newText})); }} className="flex-1 px-2 py-1.5 bg-black/30 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-purple-400" placeholder="이 사진의 자막을 입력하세요..." />
                          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                            <span className="text-gray-300">폰트:</span>
                            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="bg-black/50 border border-white/20 rounded px-1 py-1 text-xs text-white focus:outline-none">
                              <option value='"JoseonGulim", sans-serif'>조선굴림체</option>
                              <option value='"Hangyore", sans-serif'>한겨레결체</option>
                              <option value='"Iropke Batang", serif'>이롭게 바탕체</option>
                              <option value='"Gowun Dodum", sans-serif'>단정한 고운돋움</option>
                              <option value='"Jua", sans-serif'>레트로 간판(주아)</option>
                              <option value='"Hi Melody", cursive'>삐뚤빼뚤 손글씨</option>
                              <option value='"Dongle", sans-serif'>귀여운 동글</option>
                              <option value='"Libre Baskerville", serif'>바스커빌체</option>
                              <option value='"Open Sans", sans-serif'>오픈산스체</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                            <span className="text-gray-300">색상:</span>
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-5 h-5 cursor-pointer bg-transparent border-0" />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex-1 flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">글자 크기</span>
                              <div className="flex items-center gap-1">
                                <input type="number" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-12 px-1 py-0.5 text-right bg-black/50 border border-white/20 rounded text-white font-mono outline-none focus:border-purple-400" />
                                <span className="text-gray-400">px</span>
                              </div>
                            </div>
                            <input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
                          </div>

                          <div className="flex-1 flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">투명도</span>
                              <div className="flex items-center gap-1">
                                <input type="number" min="10" max="100" value={textOpacity} onChange={(e) => setTextOpacity(Number(e.target.value))} className="w-12 px-1 py-0.5 text-right bg-black/50 border border-white/20 rounded text-white font-mono outline-none focus:border-purple-400" />
                                <span className="text-gray-400">%</span>
                              </div>
                            </div>
                            <input type="range" min="10" max="100" value={textOpacity} onChange={(e) => setTextOpacity(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center bg-white/5 p-2 rounded-lg border border-white/10">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={hasBackground} onChange={(e) => setHasBackground(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                            <span className={hasBackground ? 'text-white font-bold' : 'text-gray-400'}>배경색 추가</span>
                          </label>
                          {hasBackground && <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-5 h-5 cursor-pointer bg-transparent border-0" />}
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={hasStroke} onChange={(e) => setHasStroke(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                            <span className={hasStroke ? 'text-white font-bold' : 'text-gray-400'}>테두리</span>
                          </label>
                          {hasStroke && (
                            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-5 h-5 cursor-pointer bg-transparent border-0" />
                              <input type="number" min="0" max="10" step="0.1" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-12 px-1 py-0.5 text-right bg-black/50 border border-white/20 rounded text-white font-mono outline-none focus:border-purple-400" />
                              <span className="text-[10px] text-gray-400">px</span>
                            </div>
                          )}
                          <div className="flex-1"></div>
                          <label className="flex items-center gap-1.5 cursor-pointer pl-3 border-l border-white/20">
                            <input type="checkbox" checked={hasShadow} onChange={(e) => setHasShadow(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                            <span className={hasShadow ? 'text-white font-bold' : 'text-gray-400'}>그림자</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer pl-3 border-l border-white/20">
                            <input type="checkbox" checked={isItalic} onChange={(e) => setIsItalic(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                            <span className={isItalic ? 'text-white font-bold' : 'text-gray-400'}>기울임</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ✂️ 포토샵식 크롭 오버레이 & 완료 버튼 (주석 처리된 자리에 실제 로직을 통째로 올바르게 넣었어!) */}
                {isCropMode && (
                  <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center justify-end pb-4">
                    
                    {/* 보라색 점선 박스 테두리 */}
                    <div
                      className="absolute border-2 border-purple-500 border-dashed pointer-events-auto z-10"
                      style={{
                        left: cropBox.x,
                        top: cropBox.y,
                        width: cropBox.w,
                        height: cropBox.h,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      {/* 4개 모서리 조절 꼭짓점 */}
                      {['nw', 'ne', 'sw', 'se'].map(pos => (
                        <div
                          key={pos}
                          className="absolute w-5 h-5 bg-white border-2 border-gray-800 shadow-md"
                          style={{
                            top: pos.includes('n') ? -10 : 'auto',
                            bottom: pos.includes('s') ? -10 : 'auto',
                            left: pos.includes('w') ? -10 : 'auto',
                            right: pos.includes('e') ? -10 : 'auto',
                            cursor: `${pos}-resize`
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveHandle(pos);
                            cropStartRef.current = { startX: e.clientX, startY: e.clientY, startBox: { ...cropBox } };
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            setActiveHandle(pos);
                            cropStartRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startBox: { ...cropBox } };
                          }}
                        />
                      ))}
                    </div>

                    

                  </div>
                )}
                
              </>
            ) : (
              <p className="text-gray-400">사진이나 영상을 올려봐!</p>
            )}
          </div>
        </div>
        {/* 👇 여기 빈 공간에 이 코드를 쏙 붙여넣어 줘! 👇 */}
        {isCropMode && (
          <div className="w-full flex justify-center mt-4 mb-2 z-50">
            <button 
              type="button"
              onClick={() => setIsCropMode(false)}
              className="bg-purple-600 text-white px-10 py-3 rounded-full font-black text-lg shadow-xl hover:bg-purple-700 active:scale-95 transition transform animate-bounce"
            >
              ✅ 크롭 완료하고 빠져나오기
            </button>
          </div>
        )}
        {/* 👆 여기까지 👆 */}


        {/* 👇 그 아래에는 원래 있던 메뉴 바가 그대로 이어지면 돼! */}
        {/* 🎛️ 격자무늬 표 모양 메뉴 바 */}
        <div className="w-full -mt-6 border border-gray-300 bg-white flex flex-wrap divide-x divide-gray-300 overflow-hidden rounded-b-xl z-20"></div>
        {/* 🔍 여기까지 덮어쓰기 완료! (끝점) */}

        {/* 🎛️ 격자무늬 표 모양 메뉴 바 */}
        <div className="w-full -mt-6 border border-gray-300 bg-white flex flex-wrap divide-x divide-gray-300 overflow-hidden rounded-b-xl z-20">
          {[
            { id: 'scale', label: '확대' },
            { id: 'blur', label: '흐림' },
            { id: 'brightness', label: '명도' },
            { id: 'contrast', label: '대비' },
            { id: 'saturate', label: '채도' },
            { id: 'noise', label: '노이즈' },
            { id: 'text', label: '자막 설정' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
              className={`flex-1 min-w-[70px] py-3 text-xs font-bold text-center transition-all focus:outline-none
                ${activeTab === tab.id 
                  ? 'bg-purple-600 text-white font-black' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
      </main>

      {/* 저장 포맷 선택 스위치 */}
      <div className="flex gap-4 items-center justify-center my-4">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold cursor-pointer transition ${exportFormat === 'gif' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          <input 
            type="radio" 
            name="format" 
            value="gif" 
            checked={exportFormat === 'gif'} 
            onChange={() => setExportFormat('gif')}
            className="hidden" 
          />
          🖼️ 움짤(GIF)
        </label>

        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold cursor-pointer transition ${exportFormat === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          <input 
            type="radio" 
            name="format" 
            value="video" 
            checked={exportFormat === 'video'} 
            onChange={() => setExportFormat('video')}
            className="hidden" 
          />
          🎬 동영상(WebM/MP4)
        </label>
      </div>

      {/* 👇 저장 포맷 선택 스위치(GIF/동영상) 바로 위나 아래, 맘에 드는 곳에 쏙 넣어줘! */}
        
        {/* ▶️ 미리보기 재생 버튼 */}
        <div className="flex justify-center mt-6 mb-2 z-10">
          <button
            type="button"
            onClick={handlePreviewPlay}
            disabled={isPlaying}
            className={`px-8 py-3 rounded-full font-bold text-lg shadow-md transition transform ${
              isPlaying 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
            }`}
          >
            {isPlaying ? '🍿 미리보기 재생 중...' : '▶️ 미리보기'}
          </button>
        </div>

      {/* 👆 여기까지 추가 완료! */}

      <button 
        onClick={handleBakeGif}
        className="mt-10 px-10 py-4 bg-black text-white text-xl font-bold rounded-full shadow-2xl hover:bg-gray-800 transform transition hover:scale-105">
        저장
      </button>
    </div>
  );
}