import React, { useState, useRef } from 'react';
// 👇 요 두 줄을 추가해 줘
import * as htmlToImage from 'html-to-image';
import GIF from 'gif.js';

export default function GifMakerApp() {
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
  const [aspectRatio, setAspectRatio] = useState('16 / 9');
  const [isImgDragging, setIsImgDragging] = useState(false);
  const [imgDragStart, setImgDragStart] = useState({ x: 0, y: 0 });
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // 🌟 라이트룸 패널 제어용 상태
  const [activeTab, setActiveTab] = useState(null);
  const [isPanelTop, setIsPanelTop] = useState(false); // 패널 위치 (위/아래)

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
    const inputTime = prompt("모든 사진/영상의 재생 시간을 몇 초로 통일할까요? (예: 0.3)", "0.5");
    if (inputTime === null || inputTime.trim() === "") return;
    const newTime = Number(inputTime);
    if (isNaN(newTime) || newTime <= 0) {
      alert("올바른 숫자를 입력해주세요! (0보다 큰 숫자)");
      return;
    }
    const _images = images.map(img => ({ ...img, duration: newTime }));
    setImages(_images);
  };

  const handleMouseDown = () => setIsDragging(true);

  const handleMouseMove = (e) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left - 100;
    let y = e.clientY - rect.top - 20;
    x = Math.max(0, Math.min(x, rect.width - 150));
    y = Math.max(0, Math.min(y, rect.height - 40));
    setTextPos({ x, y });
  };
  
  const handleMouseUp = () => setIsDragging(false);

  const handleImgMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.closest('.cursor-move') || !selectedMedia) return; 
    setIsImgDragging(true);
    setImgDragStart({ x: e.clientX - selectedMedia.imgPos.x, y: e.clientY - selectedMedia.imgPos.y });
  };

  const handleImgMouseMove = (e) => {
    if (!isImgDragging || !selectedMedia) return;
    const nextX = e.clientX - imgDragStart.x;
    const nextY = e.clientY - imgDragStart.y;
    selectedMedia.imgPos = { x: nextX, y: nextY };
    setImages([...images]);
  };

  const handleImgMouseUp = () => setIsImgDragging(false);

  // 👈 기존 handleImgMouseUp 함수가 끝나는 곳 바로 밑!

  const handleBakeGif = async () => {
    if (images.length === 0) {
      alert("굽기 전에 사진이나 영상을 먼저 올려줘!");
      return;
    }

    setActiveTab(null); 
    
    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: '/gif.worker.js',
        width: previewRef.current.offsetWidth,
        height: previewRef.current.offsetHeight
      });

      for (let i = 0; i < images.length; i++) {
        const currentImg = images[i];
        // 1. 사진 주인공 교체
        setSelectedMedia(currentImg);
        // 2. 자막도 현재 사진에 맞는 걸로 교체!
        setText(currentImg.subtitle || ""); 
        await new Promise(resolve => setTimeout(resolve, 300));

        const dataUrl = await htmlToImage.toPng(previewRef.current, { cacheBust: true });
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
      alert('앗! 움짤 굽다가 에러가 났어!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">🎬 나만의 레트로 움짤 깎기</h1>
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
          <span className="text-gray-500 font-medium text-lg">+ 사진/영상 클릭해서 추가하기</span>
          <span className="text-gray-400 text-sm mt-1">드래그해서 여러 장 선택 쌉가능!</span>
        </div>

        {/* 📐 움짤 크기 비율 설정 */}
        <div className="w-full flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <span className="text-xs font-bold text-gray-600">📐 움짤 크기 비율 설정:</span>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '정사각형 (1:1)', val: '1 / 1' },
              { label: '유튜브 (16:9)', val: '16 / 9' },
              { label: '고전 TV (4:3)', val: '4 / 3' },
              { label: '인스타 스토리 (9:16)', val: '9 / 16' }
            ].map((ratio) => (
              <button
                key={ratio.val}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio.val);
                  if (selectedMedia) selectedMedia.imgPos = { x: 0, y: 0 };
                  setImages([...images]);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${aspectRatio === ratio.val ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* 썸네일 리스트 */}
        {images.length > 0 && (
          <div className="flex gap-4 overflow-x-auto py-2 px-1">
            {images.map((img, index) => (
              <div key={img.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div 
                  onClick={() => setSelectedMedia(img)}
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
        )}

        {/* 메인 미리보기 박스 영역 */}
        <div 
          ref={previewRef}
          onMouseMove={(e) => { handleMouseMove(e); handleImgMouseMove(e); }}
          onMouseUp={() => { handleMouseUp(); handleImgMouseUp(); }}
          onMouseLeave={() => { handleMouseUp(); handleImgMouseUp(); }}
          onMouseDown={handleImgMouseDown}
          className="relative w-full h-auto bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center select-none shadow-inner"
          style={{ aspectRatio: aspectRatio }} 
        >
          {selectedMedia ? (
            <>
              {/* 노이즈 레이어 */}
              <div 
                className="absolute inset-0 pointer-events-none z-10 opacity-25"
                style={{
                  display: selectedMedia.noise > 0 ? 'block' : 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  filter: `contrast(${100 + selectedMedia.noise * 8}%)`,
                }}
              />

              <div className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
                {selectedMedia.type === 'video' ? (
                  <video 
                    src={selectedMedia.url} autoPlay loop muted 
                    className="absolute pointer-events-none max-w-none max-h-none"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `translate(${selectedMedia.imgPos.x}px, ${selectedMedia.imgPos.y}px) scale(${selectedMedia.scale})`, 
                      filter: `blur(${selectedMedia.blur}px) contrast(${selectedMedia.contrast}%) brightness(${selectedMedia.brightness}%) saturate(${selectedMedia.saturate}%)` 
                    }}
                  />
                ) : (
                  <img 
                    src={selectedMedia.url} 
                    className="absolute pointer-events-none max-w-none max-h-none"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transform: `translate(${selectedMedia.imgPos.x}px, ${selectedMedia.imgPos.y}px) scale(${selectedMedia.scale})`, 
                      filter: `blur(${selectedMedia.blur}px) contrast(${selectedMedia.contrast}%) brightness(${selectedMedia.brightness}%) saturate(${selectedMedia.saturate}%)` 
                    }} 
                  />
                )}
              </div>
              
              {/* 자막 레이어 (버그 픽스 완료!) */}
              <div 
                onMouseDown={handleMouseDown}
                className="absolute cursor-move transition-transform duration-75 active:scale-105 z-20"
                style={{ 
                  top: textPos.y, left: textPos.x, color: textColor,
                  fontFamily: fontFamily, fontSize: `${fontSize}px`, 
                  fontStyle: isItalic ? 'italic' : 'normal',
                  opacity: textOpacity / 100,
                  WebkitTextStroke: hasStroke ? `${strokeWidth}px ${strokeColor}` : '0px transparent',
                  paintOrder: 'stroke fill', 
                  textShadow: hasShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {text}
              </div>

              {/* 🌟 둥둥 뜨는 라이트룸 조절바 & 자막 종합 세팅 패널 (위치 이동 기능 탑재!) */}
              {selectedMedia && activeTab && (
                <div className={`absolute left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 z-30 border border-white/10 flex flex-col gap-3 text-white text-xs max-h-60 overflow-y-auto shadow-2xl transition-all duration-300 ${isPanelTop ? 'top-4' : 'bottom-4'}`}>
                  
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-bold text-purple-300">
                      {activeTab === 'scale' && '🔎 크롭(확대)'}
                      {activeTab === 'blur' && '🌫️ 흐림(Blur)'}
                      {activeTab === 'brightness' && '☀️ 명도(밝기)'}
                      {activeTab === 'contrast' && '🎞️ 색감 대비'}
                      {activeTab === 'saturate' && '🌈 채도(선명도)'}
                      {activeTab === 'noise' && '📺 미세 노이즈'}
                      {activeTab === 'text' && '✍️ 자막 종합 세팅'}
                    </span>
                    
                    {/* 패널 위치 이동 & 닫기 버튼 */}
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsPanelTop(!isPanelTop)} 
                        className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded font-bold text-sm transition-colors"
                      >
                        {isPanelTop ? '⬇️ 아래로' : '⬆️ 위로'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab(null)} 
                        className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded font-bold text-sm text-red-300 hover:text-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* 일반 필터 슬라이더 */}
                  {activeTab !== 'text' && (
                    <div className="flex items-center gap-4 w-full">
                      <input 
                        type="range" 
                        min={activeTab === 'scale' ? "1" : activeTab === 'contrast' || activeTab === 'brightness' ? "50" : "0"} 
                        max={activeTab === 'scale' ? "4" : activeTab === 'contrast' || activeTab === 'brightness' ? "150" : activeTab === 'saturate' ? "200" : activeTab === 'blur' ? "4" : "10"} 
                        step={activeTab === 'scale' || activeTab === 'blur' ? "0.1" : "1"}
                        value={selectedMedia[activeTab]} 
                        onChange={(e) => { 
                          selectedMedia[activeTab] = Number(e.target.value); 
                          setImages([...images]); 
                        }} 
                        className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none" 
                      />
                      <span className="w-12 text-right font-mono">
                        {selectedMedia[activeTab]}
                        {activeTab === 'scale' ? '배' : activeTab === 'blur' ? 'px' : activeTab === 'noise' ? '단' : '%'}
                      </span>
                    </div>
                  )}

                  {/* ✍️ 자막 올인원 툴킷 (3단 콤팩트 리모델링 완료!) */}
                  {activeTab === 'text' && (
                    <div className="flex flex-col gap-3 w-full mt-2">
                      {/* 1층: 자막 입력, 폰트, 색상 */}
                      <div className="flex flex-wrap gap-2 items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                        <input 
                          type="text" 
                          value={selectedMedia.subtitle || ""} 
                          onChange={(e) => {
                            const newText = e.target.value;
                            // 1. 화면에 보이는 자막(text 상태)도 바꾸고
                            setText(newText);
                            // 2. 지금 선택된 이미지 데이터의 subtitle도 업데이트!
                            const updatedImages = images.map(img => 
                              img.id === selectedMedia.id ? { ...img, subtitle: newText } : img
                            );
                            setImages(updatedImages);
                          }}
                          className="flex-1 px-2 py-1.5 bg-black/30 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-purple-400"
                          placeholder="이 사진의 자막을 입력하세요..."
                        />
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                          <span className="text-gray-300">🅰️ 폰트:</span>
                          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="bg-black/50 border border-white/20 rounded px-1 py-1 text-xs text-white focus:outline-none">
                            <option value='"JoseonGulim", sans-serif'>조선굴림체</option>
                            <option value='"Hangyore", sans-serif'>한겨레결체</option>
                            <option value='"Iropke Batang", serif'>이롭게 바탕체</option>
                            <option value='"Gowun Dodum", sans-serif'>단정한 고운돋움</option>
                            <option value='"Jua", sans-serif'>레트로 간판(주아)</option>
                            <option value='"Hi Melody", cursive'>삐뚤빼뚤 손글씨</option>
                            <option value='"Dongle", sans-serif'>귀여운 동글</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                          <span className="text-gray-300">🎨 색상:</span>
                          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-5 h-5 cursor-pointer bg-transparent border-0" />
                        </div>
                      </div>

                      {/* 2층: 크기 & 투명도 */}
                      <div className="flex gap-3">
                        <div className="flex-1 flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">📏 글자 크기</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-12 px-1 py-0.5 text-right bg-black/50 border border-white/20 rounded text-white font-mono outline-none focus:border-purple-400" />
                              <span className="text-gray-400">px</span>
                            </div>
                          </div>
                          <input type="range" min="20" max="100" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
                        </div>

                        <div className="flex-1 flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">🫥 투명도</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min="10" max="100" value={textOpacity} onChange={(e) => setTextOpacity(Number(e.target.value))} className="w-12 px-1 py-0.5 text-right bg-black/50 border border-white/20 rounded text-white font-mono outline-none focus:border-purple-400" />
                              <span className="text-gray-400">%</span>
                            </div>
                          </div>
                          <input type="range" min="10" max="100" value={textOpacity} onChange={(e) => setTextOpacity(Number(e.target.value))} className="w-full accent-purple-400 cursor-pointer" />
                        </div>
                      </div>

                      {/* 3층: 테두리, 그림자, 기울임 */}
                      <div className="flex flex-wrap gap-4 items-center bg-white/5 p-2 rounded-lg border border-white/10">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={hasStroke} onChange={(e) => setHasStroke(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                          <span className={hasStroke ? 'text-white font-bold' : 'text-gray-400'}>🔳 테두리</span>
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
                          <span className={hasShadow ? 'text-white font-bold' : 'text-gray-400'}>👥 그림자</span>
                        </label>
                        
                        <label className="flex items-center gap-1.5 cursor-pointer pl-3 border-l border-white/20">
                          <input type="checkbox" checked={isItalic} onChange={(e) => setIsItalic(e.target.checked)} className="rounded accent-purple-500 w-3 h-3" />
                          <span className={isItalic ? 'text-white font-bold' : 'text-gray-400'}><i>I</i> 기울임</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400">사진이나 영상을 올려봐!</p>
          )}
        </div>

        {/* 🎛️ 이미지 바로 밑에 찰싹 붙은 아이콘 바 */}
        <div className="w-full flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200 mt-2">
          <span className="text-xs font-bold text-gray-600">📸 이미지 보정 & 자막 세팅 (누르면 화면 위에 제어 패널이 뜸!):</span>
          <div className="flex gap-2 flex-wrap mt-1">
            {[
              { id: 'scale', label: '🔎 크롭', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
              { id: 'blur', label: '🌫️ 흐림', color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' },
              { id: 'brightness', label: '☀️ 명도', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
              { id: 'contrast', label: '🎞️ 대비', color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
              { id: 'saturate', label: '🌈 채도', color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' },
              { id: 'noise', label: '📺 노이즈', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
              { id: 'text', label: '✍️ 자막 세팅', color: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all transform active:scale-95 ${activeTab === tab.id ? 'bg-black text-white border-black shadow-md' : tab.color}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ⏱️ 재생 시간 일괄 조절 버튼 */}
        <div className="w-full mt-2">
          <button 
            type="button"
            onClick={handleAllTimeChange} 
            className="px-5 py-2.5 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition w-full"
          >
            ⏱️ 모든 사진 재생 시간 일괄 변경
          </button>
        </div>
        
      </main>

      <button 
        onClick={handleBakeGif}
        className="mt-10 px-10 py-4 bg-black text-white text-xl font-bold rounded-full shadow-2xl hover:bg-gray-800 transform transition hover:scale-105">
        🔥 움짤 굽기 & 저장
      </button>
    </div>
  );
}