import React, { useState, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import GIF from 'gif.js';

export default function GifMakerApp() {
  const [previewSize, setPreviewSize] = useState({ width: 560, height: 315 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState('gif');

  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 300, h: 300 });
  const [activeHandle, setActiveHandle] = useState(null); 
  const cropStartRef = useRef(null); 

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
  const pressTimer = useRef(null);
  const isSortDragging = useRef(false); 
  const dragOverItem = useRef(null);
  const [batchTime, setBatchTime] = useState(0.5);

  const [activeTab, setActiveTab] = useState(null);
  const [isPanelTop, setIsPanelTop] = useState(false);

  const [hasBackground, setHasBackground] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newMediaPromises = files.map(file => {
      return new Promise((resolve) => {
        if (file.type.startsWith('video')) {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file), 
            type: 'video', duration: 0.5, subtitle: "", scale: 1, imgPos: { x: 0, y: 0 },
            blur: 0, contrast: 100, brightness: 100, saturate: 100, noise: 0
          });
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 600; 
              let width = img.width;
              let height = img.height;

              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);

              resolve({
                id: Math.random().toString(36).substr(2, 9),
                url: optimizedBase64,
                type: 'image', duration: 0.5, subtitle: "", scale: 1, imgPos: { x: 0, y: 0 },
                blur: 0, contrast: 100, brightness: 100, saturate: 100, noise: 0
              });
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    });

    const newMedia = await Promise.all(newMediaPromises);

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

  // 🗑️ [기능 추가] 썸네일 삭제 함수
  const handleDeleteImage = (e, id) => {
    e.stopPropagation(); // 썸네일 클릭(선택) 이벤트 전파 방지
    
    setImages(prevImages => {
      const filtered = prevImages.filter(img => img.id !== id);
      
      // 만약 방금 지운 사진이 현재 보고 있던 사진이라면, 다른 사진으로 선택 변경!
      if (selectedMedia && selectedMedia.id === id) {
        if (filtered.length > 0) {
          setSelectedMedia(filtered[0]);
          setText(filtered[0].subtitle || "");
        } else {
          setSelectedMedia(null);
        }
      }
      return filtered;
    });
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

    if (selectedMedia) {
      setSelectedMedia(prev => ({ ...prev, duration: newTime }));
    }
  };

  const startResize = (e) => {
    e.stopPropagation(); 
    setIsResizing(true);
    resizeStart.current = {
      width: previewSize.width,
      height: previewSize.height,
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    };
  };

  const handleMouseDown = () => setIsDragging(true);
  
  const handleMouseMove = (e) => {
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

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

    if (isImgDragging && selectedMedia) {
      const nextX = clientX - imgDragStart.x;
      const nextY = clientY - imgDragStart.y;

      const updatedMedia = {
        ...selectedMedia,
        imgPos: { x: nextX, y: nextY }
      };
      setSelectedMedia(updatedMedia); 

      const updatedImages = images.map(img => 
        img.id === selectedMedia.id ? updatedMedia : img
      );
      setImages(updatedImages); 
      return; 
    }

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

    if (activeHandle) {
      setPreviewSize({ width: cropBox.w, height: cropBox.h });
      
      const updated = images.map(img => {
        const newImg = {
          ...img,
          imgPos: { x: img.imgPos.x - cropBox.x, y: img.imgPos.y - cropBox.y }
        };
        if (img.id === selectedMedia.id) {
          setSelectedMedia(newImg);
        }
        return newImg;
      });
      setImages(updated);
      
      setCropBox({ x: 0, y: 0, w: cropBox.w, h: cropBox.h });
      setActiveHandle(null);
    }
  };

  const handleImgMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.closest('.cursor-move') || !selectedMedia) return; 
    setIsImgDragging(true);
    
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

  const handlePreviewPlay = async () => {
    if (images.length === 0) return;
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    setIsPlaying(true); 
    
    for (let i = 0; i < images.length; i++) {
      const currentImg = images[i];
      setSelectedMedia(currentImg);        
      setText(currentImg.subtitle || "");  
      await new Promise(resolve => setTimeout(resolve, currentImg.duration * 1000));
    }
    
    setIsPlaying(false); 
  };

  // 🎬 [색상 손상 해결] 최고급 dither 및 팔레트 최적화가 적용된 픽셀 렌더링
  const handleBakeGif = async () => {
    if (images.length === 0) {
      alert("굽기 전에 사진이나 영상을 먼저 올려줘!");
      return;
    }

    setActiveTab(null); 
    const targetNode = previewRef.current;
    if (!targetNode) return;

    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 800)); 

    const scaleFactor = 1.5; 
    const baseWidth = targetNode.offsetWidth;
    const baseHeight = targetNode.offsetHeight;
    const width = baseWidth * scaleFactor;
    const height = baseHeight * scaleFactor;

    try {
      const gif = new GIF({
        workers: 4, 
        quality: 1, 
        // 🎯 [입술 색상 회색 방어!] 색상 손상을 최소화하는 최고급 디더링 알고리즘 적용
        dither: 'FloydSteinberg-serpentine', 
        workerScript: '/gif.worker.js',
        width: width,
        height: height
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < images.length; i++) {
        const currentImg = images[i];
        setSelectedMedia(currentImg);
        setText(currentImg.subtitle || ""); 

        await new Promise(resolve => setTimeout(resolve, 800));

        // 1. 도화지 배경 칠하기
        ctx.fillStyle = '#1f2937'; 
        ctx.fillRect(0, 0, width, height);

        // 2. 사진 원본 데이터 불러오기
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentImg.url;
        await new Promise(resolve => { 
          img.onload = resolve; 
          img.onerror = resolve; 
        });

        // 3. 🎨 픽셀 그리기 시작 (1.5배 확대 스케일 적용!)
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor); 
        
        ctx.filter = `blur(${currentImg.blur || 0}px) contrast(${currentImg.contrast || 100}%) brightness(${currentImg.brightness || 100}%) saturate(${currentImg.saturate || 100}%)`;
        
        const centerX = baseWidth / 2;
        const centerY = baseHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.translate(currentImg.imgPos?.x || 0, currentImg.imgPos?.y || 0);
        ctx.scale(currentImg.scale || 1, currentImg.scale || 1);
        ctx.translate(-centerX, -centerY);

        const imgScale = Math.min(baseWidth / img.width, baseHeight / img.height);
        const drawW = img.width * imgScale;
        const drawH = img.height * imgScale;
        const drawX = (baseWidth - drawW) / 2;
        const drawY = (baseHeight - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore(); 

        // 4. ✍️ 자막 그리기
        if (currentImg.subtitle) {
          ctx.save();
          ctx.globalAlpha = textOpacity / 100;
          ctx.font = `${isItalic ? 'italic ' : ''}bold ${fontSize * scaleFactor}px ${fontFamily.replace(/['"]/g, '')}`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';

          const tx = textPos.x * scaleFactor;
          const ty = textPos.y * scaleFactor;

          if (hasBackground) {
            const metrics = ctx.measureText(currentImg.subtitle);
            ctx.fillStyle = bgColor;
            ctx.fillRect(tx - (5 * scaleFactor), ty - (2 * scaleFactor), metrics.width + (10 * scaleFactor), (fontSize * scaleFactor) + (10 * scaleFactor));
          }

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          if (hasShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4 * scaleFactor;
            ctx.shadowOffsetX = 2 * scaleFactor;
            ctx.shadowOffsetY = 2 * scaleFactor;
          }

          if (hasStroke) {
            ctx.shadowColor = 'transparent'; 
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = (strokeWidth * 2); 
            ctx.strokeText(currentImg.subtitle, tx, ty);
            
            if (hasShadow) {
              ctx.shadowColor = 'rgba(0,0,0,0.5)';
            }
          }

          ctx.fillStyle = textColor;
          ctx.fillText(currentImg.subtitle, tx, ty);

          ctx.restore();
        }

        gif.addFrame(ctx, { delay: currentImg.duration * 1000, copy: true });
        await new Promise(resolve => setTimeout(resolve, 100)); 
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
      alert('에러 원인: ' + (error.message || error));
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

        <div className="w-full flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <span className="text-xs font-bold text-gray-600">이미지 비율:</span>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '(1:1)', w: 400, h: 400 },
              { label: '(16:9)', w: 560, h: 315 },
              { label: '(4:3)', w: 480, h: 360 },
              { label: '(9:16)', w: 315, h: 560 },
              { label: '(3:4)', w: 360, h: 480 }, 
              { label: '자유', isCrop: true }
            ].map((ratio) => (
              <button
                key={ratio.label}
                type="button"
                onClick={() => {
                  if (ratio.isCrop) {
                    if (isCropMode) {
                      setIsCropMode(false);
                    } else {
                      setIsCropMode(true);
                      setCropBox({ x: 40, y: 40, w: previewSize.width - 80, h: previewSize.height - 80 });
                    }
                  } else {
                    setIsCropMode(false);
                    setPreviewSize({ width: ratio.w, height: ratio.h });
                    setTextPos({ x: 0, y: 0 }); 
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
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

        {images.length > 0 && (
          <div className="w-full flex flex-col gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-2 z-10">
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
            
            <div className="flex gap-4 overflow-x-auto py-2 px-1 items-center">
              {images.map((img, index) => (
                <div key={img.id} className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      data-index={index} 
                      onClick={() => {
                        setSelectedMedia(img);
                        setText(img.subtitle || ""); 
                      }}
                      draggable 
                      onDragStart={(e) => (dragItem.current = index)}
                      onDragEnter={(e) => (dragOverItem.current = index)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                      onTouchStart={() => {
                        dragItem.current = index;
                        dragOverItem.current = index;
                        isSortDragging.current = false; 
                        pressTimer.current = setTimeout(() => {
                          isSortDragging.current = true; 
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        if (!isSortDragging.current) { 
                          clearTimeout(pressTimer.current); 
                          return; 
                        }
                        const touch = e.touches[0];
                        const target = document.elementFromPoint(touch.clientX, touch.clientY);
                        const dropZone = target?.closest('[data-index]'); 
                        if (dropZone) {
                          dragOverItem.current = Number(dropZone.getAttribute('data-index')); 
                        }
                      }}
                      onTouchEnd={() => {
                        clearTimeout(pressTimer.current);
                        if (isSortDragging.current && dragItem.current !== dragOverItem.current) { 
                          handleSort();
                        }
                        isSortDragging.current = false; 
                        dragItem.current = null;
                        dragOverItem.current = null;
                      }}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md cursor-pointer active:cursor-grabbing hover:border-blue-400 transition-colors group"
                    >
                      {img.type === 'video' ? (
                        <video 
                          src={img.url} className="w-full h-full object-cover" muted 
                          draggable={false}
                          style={{ pointerEvents: 'none', WebkitTouchCallout: 'none', WebkitUserDrag: 'none', userSelect: 'none' }}
                        />
                      ) : (
                        <img 
                          src={img.url} alt={`썸네일 ${index}`} className="w-full h-full object-cover" 
                          draggable={false}
                          style={{ pointerEvents: 'none', WebkitTouchCallout: 'none', WebkitUserDrag: 'none', userSelect: 'none' }}
                        />
                      )}
                      <div className="absolute top-0 left-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-br-md font-bold pointer-events-none">
                        {index + 1}
                      </div>

                      {/* 🗑️ [기능 추가] 각 썸네일 우측 상단 X 삭제 버튼 */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteImage(e, img.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow hover:bg-red-600 transition-transform active:scale-95 z-20"
                        title="사진 삭제"
                      >
                        ✕
                      </button>
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

                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setImages(prev => {
                          const newArr = [...prev];
                          [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
                          return newArr;
                        });
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 active:scale-90 transition-all z-10 -ml-1"
                    >
                      ↔️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full flex items-start justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div 
            ref={previewRef}
            onMouseDown={handleImgMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative bg-gray-800 rounded-xl overflow-hidden shadow-inner max-w-full z-0"
            style={{ 
              width: '100%', 
              maxWidth: `${previewSize.width}px`, 
              aspectRatio: `${previewSize.width} / ${previewSize.height}`, 
              touchAction: 'none' 
            }} 
            // 🎯 [줌 개선] 사진 바깥쪽(배경 영역)에 손가락이 걸쳐져 있어도 두 손가락 줌이 매끄럽게 작동하도록 전체 영역 터치 감지!
            onTouchStart={(e) => {
              if (e.target.closest('button')) return;
              
              if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                previewRef.current.pinchStartDist = dist;
                setSelectedMedia(prev => {
                  previewRef.current.pinchStartScale = prev.scale || 1;
                  return prev;
                });
              } else if (e.touches.length === 1) {
                handleImgMouseDown(e); 
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const startDist = previewRef.current.pinchStartDist || dist;
                const startScale = previewRef.current.pinchStartScale || 1;
                
                let newScale = startScale * (dist / startDist);
                newScale = Math.max(0.1, Math.min(newScale, 5));
                
                setSelectedMedia(prev => ({ ...prev, scale: Number(newScale.toFixed(2)) }));
                
              } else if (e.touches.length === 1) {
                handleMouseMove(e); 
              }
            }}
            onTouchEnd={(e) => {
              previewRef.current.pinchStartDist = null;
              setSelectedMedia(prev => {
                if (prev) {
                  setImages(prevImages => prevImages.map(img => img.id === prev.id ? prev : img));
                }
                return prev; 
              });
              handleMouseUp(e); 
            }}
          >
            {selectedMedia ? (
              <>
                <div className="absolute inset-0 pointer-events-none z-10 opacity-25" style={{ display: selectedMedia.noise > 0 ? 'block' : 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, filter: `contrast(${100 + selectedMedia.noise * 8}%)` }} />

                <div 
                  className="w-full h-full overflow-hidden flex items-start justify-start relative pointer-events-none"
                  style={{ touchAction: 'none' }} 
                >
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: '100%', height: '100%', left: 0, top: 0,
                      transform: `translate(${selectedMedia.imgPos?.x || 0}px, ${selectedMedia.imgPos?.y || 0}px) scale(${selectedMedia.scale || 1})`,
                      transformOrigin: 'center'
                    }}
                  >
                    {selectedMedia.type === 'video' ? (
                      <video 
                        src={selectedMedia.url} autoPlay loop muted playsInline 
                        draggable={false} 
                        style={{ 
                          width: '100%', height: '100%', objectFit: 'contain',
                          pointerEvents: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', WebkitUserDrag: 'none', userSelect: 'none', touchAction: 'none',
                          // 🎯 수치가 없을 때 기본값(100%)을 안전하게 잡아주어 GPU 뇌정지 방지
                          filter: `blur(${selectedMedia.blur || 0}px) contrast(${selectedMedia.contrast ?? 100}%) brightness(${selectedMedia.brightness ?? 100}%) saturate(${selectedMedia.saturate ?? 100}%)`,
                          WebkitBackfaceVisibility: 'hidden', // 💡 GPU 강제 가속 켜서 하얘짐 방지!
                          transform: 'translateZ(0)'
                        }}
                      />
                    ) : (
                      <img 
                        src={selectedMedia.url} draggable={false} 
                        style={{ 
                          width: '100%', height: '100%', objectFit: 'contain',
                          pointerEvents: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', WebkitUserDrag: 'none', userSelect: 'none', touchAction: 'none',
                          // 🎯 수치가 없을 때 기본값(100%) 안전 방어
                          filter: `blur(${selectedMedia.blur || 0}px) contrast(${selectedMedia.contrast ?? 100}%) brightness(${selectedMedia.brightness ?? 100}%) saturate(${selectedMedia.saturate ?? 100}%)`,
                          WebkitBackfaceVisibility: 'hidden', // 💡 GPU 강제 가속 켜서 하얘짐 방지!
                          transform: 'translateZ(0)'
                        }} 
                      />
                    )}
                  </div>
                </div>
                
                {/* ✍️ 화면 미리보기 자막 (튕김 현상 완벽 방어 버전) */}
                <div 
                  draggable={false}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.target.setPointerCapture(e.pointerId);
                    previewRef.current.isTextDragging = true;
                    // 🎯 손가락이 처음 닿은 화면 좌표와 당시 자막의 위치를 정확히 기억!
                    previewRef.current.startX = e.clientX;
                    previewRef.current.startY = e.clientY;
                    previewRef.current.initTextX = textPos.x; 
                    previewRef.current.initTextY = textPos.y;
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (!previewRef.current?.isTextDragging) return;
                    
                    // 🎯 손가락이 움직인 만큼 정확하게 계산해서 튕김 없이 부드럽게 이동!
                    const deltaX = e.clientX - previewRef.current.startX;
                    const deltaY = e.clientY - previewRef.current.startY;
                    
                    setTextPos({ 
                      x: previewRef.current.initTextX + deltaX, 
                      y: previewRef.current.initTextY + deltaY 
                    });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (e.target.hasPointerCapture(e.pointerId)) {
                      e.target.releasePointerCapture(e.pointerId);
                    }
                    if (previewRef.current) {
                      previewRef.current.isTextDragging = false;
                    }
                  }}
                  onPointerCancel={(e) => {
                    e.stopPropagation();
                    if (previewRef.current) {
                      previewRef.current.isTextDragging = false;
                    }
                  }}
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
                    borderRadius: '4px',
                    userSelect: 'none',
                    WebkitUserSelect: 'none', 
                    touchAction: 'none',
                    WebkitUserDrag: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                >
                  {text}
                </div>

                {selectedMedia && activeTab && (
                  <div 
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
                      <input 
                        type="range" 
                        min={activeTab === 'scale' ? "0.1" : activeTab === 'contrast' || activeTab === 'brightness' ? "50" : "0"} 
                        max={activeTab === 'scale' ? "4" : activeTab === 'contrast' || activeTab === 'brightness' ? "150" : activeTab === 'saturate' ? "200" : activeTab === 'blur' ? "4" : "10"} 
                        step={activeTab === 'scale' || activeTab === 'blur' ? "0.1" : "1"} 
                        value={selectedMedia[activeTab] || ""} 
                        className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                        onChange={(e) => { 
                          const numValue = Number(e.target.value);
                          const updatedMedia = { ...selectedMedia, [activeTab]: numValue };
                          setSelectedMedia(updatedMedia); 
                          setImages(prev => prev.map(img => img.id === updatedMedia.id ? updatedMedia : img)); 
                        }} 
                      />
                        <span className="w-12 text-right font-mono">{selectedMedia[activeTab]}{activeTab === 'scale' ? '배' : activeTab === 'blur' ? 'px' : activeTab === 'noise' ? '단' : '%'}</span>
                      </div>
                    )}

                    {activeTab === 'text' && (
                      <div className="flex flex-col gap-3 w-full mt-2">
                        <div className="flex flex-wrap gap-2 items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                          <input type="text" value={selectedMedia?.subtitle || ""} 
                            onClick={(e) => e.stopPropagation()} 
                            onTouchStart={(e) => e.stopPropagation()} 
                            onChange={(e) => { 
                              const newText = e.target.value; setText(newText); 
                              const updatedImages = images.map(img => img.id === selectedMedia.id ? { ...img, subtitle: newText } : img); 
                              setImages(updatedImages); 
                              setSelectedMedia(prev => ({ ...prev, subtitle: newText})); 
                            }} 
                            className="flex-1 px-2 py-1.5 bg-black/30 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-purple-400" placeholder="자막을 입력하세요." />
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

                {isCropMode && (
                  <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center justify-end pb-4">
                    <div
                      className="absolute border-2 border-purple-500 border-dashed pointer-events-auto z-10"
                      style={{
                        left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
                      }}
                    >
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

      <div className="flex gap-4 items-center justify-center my-4">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold cursor-pointer transition ${exportFormat === 'gif' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          <input 
            type="radio" name="format" value="gif" 
            checked={exportFormat === 'gif'} 
            onChange={() => setExportFormat('gif')}
            className="hidden" 
          />
          🖼️ 움짤(GIF)
        </label>

        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold cursor-pointer transition ${exportFormat === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          <input 
            type="radio" name="format" value="video" 
            checked={exportFormat === 'video'} 
            onChange={() => setExportFormat('video')}
            className="hidden" 
          />
          🎬 동영상(WebM/MP4)
        </label>
      </div>
        
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

      <button 
        onClick={handleBakeGif}
        className="mt-10 px-10 py-4 bg-black text-white text-xl font-bold rounded-full shadow-2xl hover:bg-gray-800 transform transition hover:scale-105">
        저장
      </button>
    </div>
  );
}