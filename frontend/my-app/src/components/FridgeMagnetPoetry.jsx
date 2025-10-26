import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, collectionGroup, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import html2canvas from 'html2canvas';

export default function FridgeMagnetPoetry({ user }) {
  const [currentView, setCurrentView] = useState('create');
  const [wordBank, setWordBank] = useState([]);
  const [fridgeMagnets, setFridgeMagnets] = useState([]);
  const [availableMagnets, setAvailableMagnets] = useState([]);
  const [draggedMagnet, setDraggedMagnet] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pastPoems, setPastPoems] = useState([]);
  const [feedPoems, setFeedPoems] = useState([]);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [playingPoemId, setPlayingPoemId] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [selectedVoices, setSelectedVoices] = useState({});
  const [availableVoices, setAvailableVoices] = useState([]);
  const [likingPoem, setLikingPoem] = useState(null);
  const [userTotalLikes, setUserTotalLikes] = useState(0);
  const [fridgeStickers, setFridgeStickers] = useState([]);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [poemAnalysis, setPoemAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fridgeRef = useRef(null);

  const userId = user.uid;
  const BACKEND_TTS_ENDPOINT = 'http://localhost:8000/api/tts';
  const BACKEND_VOICES_ENDPOINT = 'http://localhost:8000/api/voices';
  const BACKEND_ANALYSIS_ENDPOINT = 'http://localhost:8000/api/analyze-poem';

  // 🎨 Available stickers with unlock thresholds
  const availableStickers = [
    { name: 'cat', path: '/src/assets/stickers/cat.png', unlockAt: 1 },
    { name: 'corgi', path: '/src/assets/stickers/corgi.png', unlockAt: 2 },
    { name: 'elprimo', path: '/src/assets/stickers/elprimo.png', unlockAt: 5 },
    { name: 'hogrider', path: '/src/assets/stickers/hogrider.jpeg', unlockAt: 10 },
    { name: 'mocking', path: '/src/assets/stickers/mocking.png', unlockAt: 15 },
    { name: 'sleepy', path: '/src/assets/stickers/sleepy.webp', unlockAt: 20 },
  ];

  // 🎭 Mood detection
  const detectMood = (magnets) => {
    const words = magnets.map(m => m.text.toLowerCase());
    
    const moodKeywords = {
      happy: ['love', 'joy', 'light', 'dance', 'sing', 'bright', 'dream', 'magic', 'wonder', 'sweet'],
      sad: ['shadow', 'dark', 'broken', 'empty', 'silent', 'lonely', 'tear', 'sorrow', 'pain'],
      dramatic: ['storm', 'fire', 'thunder', 'wild', 'chaos', 'rage', 'fight', 'battle'],
      romantic: ['love', 'whisper', 'moon', 'gentle', 'soft', 'heart', 'forever', 'tender'],
      peaceful: ['peace', 'calm', 'quiet', 'still', 'rest', 'soft', 'gentle', 'serene']
    };

    const scores = {};
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      scores[mood] = words.filter(w => keywords.includes(w)).length;
    }

    const dominantMood = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    return dominantMood;
  };

  // 🎤 Voice parameters
  const getVoiceParams = (mood) => {
    const params = {
      happy: { pitch: 1.2, speed: 1.1, emotion: 'cheerful' },
      sad: { pitch: 0.8, speed: 0.9, emotion: 'melancholic' },
      dramatic: { pitch: 1.0, speed: 1.2, emotion: 'intense' },
      romantic: { pitch: 1.0, speed: 0.95, emotion: 'warm' },
      peaceful: { pitch: 0.9, speed: 0.85, emotion: 'calm' }
    };
    return params[mood] || params.peaceful;
  };

  // 🔊 Play poem
  const playPoem = async (poem, poemId) => {
    if (playingPoemId === poemId) {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      setPlayingPoemId(null);
      return;
    }

    try {
      setPlayingPoemId(poemId);

      const sortedMagnets = [...poem.magnets].sort((a, b) => {
        if (Math.abs(a.y - b.y) < 30) return a.x - b.x;
        return a.y - b.y;
      });

      const text = sortedMagnets.map(m => m.text).join(' ');
      const mood = detectMood(poem.magnets);
      const voiceParams = getVoiceParams(mood);
      const voiceName = selectedVoices[poemId] || 'poem';

      const response = await fetch(BACKEND_TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          pitch: voiceParams.pitch,
          speed: voiceParams.speed,
          voice_name: voiceName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      const audio = new Audio(data.audio_url);

      audio.onended = () => {
        setPlayingPoemId(null);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setPlayingPoemId(null);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      await audio.play();

    } catch (error) {
      console.error('Error playing poem:', error);
      alert(`Failed to play poem: ${error.message}`);
      setPlayingPoemId(null);
    }
  };

  // 📸 Share poem as image
  const sharePoem = async () => {
    if (!fridgeRef.current || fridgeMagnets.length === 0) {
      alert('Create a poem first before sharing!');
      return;
    }

    try {
      setShareLoading(true);
      
      // Capture the fridge as canvas
      const canvas = await html2canvas(fridgeRef.current, {
        backgroundColor: '#cbd5e1',
        scale: 2, // Higher quality
        logging: false,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `fridge-poem-${Date.now()}.png`;
        link.href = url;
        link.click();

        // Show success message
        setShareUrl(url);
        setTimeout(() => setShareUrl(null), 5000);
      });

      setShareLoading(false);
    } catch (error) {
      console.error('Error sharing poem:', error);
      alert('Failed to create image. Try again!');
      setShareLoading(false);
    }
  };

  // 🎭 Analyze poem with AI
  const analyzePoem = async () => {
    if (fridgeMagnets.length === 0) {
      alert('Add some magnets to the fridge first!');
      return;
    }

    try {
      setAnalyzing(true);
      setPoemAnalysis(null);

      // Sort magnets to read left-to-right, top-to-bottom
      const sortedMagnets = [...fridgeMagnets].sort((a, b) => {
        if (Math.abs(a.y - b.y) < 30) return a.x - b.x;
        return a.y - b.y;
      });

      const text = sortedMagnets.map(m => m.text).join(' ');

      const response = await fetch(BACKEND_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysis = await response.json();
      setPoemAnalysis(analysis);
      setAnalyzing(false);

    } catch (error) {
      console.error('Error analyzing poem:', error);
      alert(`Failed to analyze poem: ${error.message}`);
      setAnalyzing(false);
    }
  };

  // 🔥 Fetch words with custom proportions
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const docRef = doc(db, 'wordCategories', 'categorizedWords');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          const getRandomSample = (arr, n) =>
            arr.sort(() => 0.5 - Math.random()).slice(0, n);

          // Custom word mix: 6 nouns, 4 verbs, 5 adjectives, 5 conjunctions
          const randomWords = [
            ...getRandomSample(data.nouns || [], 6),
            ...getRandomSample(data.verbs || [], 4),
            ...getRandomSample(data.adjectives || [], 5),
            ...getRandomSample(data.conjunctionsAndArticles || [], 5)
          ];

          setWordBank(randomWords);

          setAvailableMagnets(
            randomWords.map((word, index) => ({
              id: `word-${index}`,
              text: word,
              onFridge: false,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching words:', error);
      }
    };

    fetchWords();
  }, []);

  // 🎤 Fetch voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch(BACKEND_VOICES_ENDPOINT);
        const data = await response.json();
        setAvailableVoices(data.voices);
      } catch (error) {
        console.error('Error fetching voices:', error);
        setAvailableVoices(['poem', 'poem2', 'spongebob', 'horror', 'alle', 'king_von', 'cringe']);
      }
    };
    fetchVoices();
  }, []);

  // 📖 Fetch poems
  useEffect(() => {
    if (currentView === 'past') {
      fetchPastPoems();
    } else if (currentView === 'feed') {
      fetchFeedPoems();
    }
  }, [currentView]);

  // 📊 Calculate total likes user has received
  useEffect(() => {
    const calculateTotalLikes = async () => {
      try {
        const poemsRef = collection(db, 'users', userId, 'poems');
        const poemsSnapshot = await getDocs(poemsRef);
        
        let totalLikes = 0;
        poemsSnapshot.forEach((doc) => {
          totalLikes += doc.data().likes || 0;
        });
        
        setUserTotalLikes(totalLikes);
        console.log(`🎨 User has ${totalLikes} total likes!`);
      } catch (error) {
        console.error('Error calculating total likes:', error);
      }
    };
    
    calculateTotalLikes();
  }, [userId, pastPoems]);

  const fetchPastPoems = async () => {
    try {
      const poemsRef = collection(db, 'users', userId, 'poems');
      const q = query(poemsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const poems = [];
      querySnapshot.forEach((doc) => {
        poems.push({ id: doc.id, ...doc.data() });
      });
      
      setPastPoems(poems);
    } catch (error) {
      console.error('Error fetching past poems:', error);
    }
  };

  const fetchFeedPoems = async () => {
    try {
      console.log('🚀 Using collectionGroup to fetch ALL poems...');
      
      // Get ALL poems from ALL users using collectionGroup
      const poemsQuery = query(
        collectionGroup(db, 'poems'),
        orderBy('createdAt', 'desc')
      );
      
      const poemsSnapshot = await getDocs(poemsQuery);
      
      console.log(`🔥 Found ${poemsSnapshot.size} total poems across all users!`);
      
      const allPoems = [];
      poemsSnapshot.forEach((poemDoc) => {
        // Get parent path to extract userId
        const userId = poemDoc.ref.parent.parent?.id || 'unknown';
        
        allPoems.push({
          id: poemDoc.id,
          userId: userId,
          ...poemDoc.data()
        });
      });
      
      console.log('✅ Poems loaded:', allPoems.length);
      
      setFeedPoems(allPoems);
      setCurrentFeedIndex(0);
    } catch (error) {
      console.error('❌ Error fetching feed poems:', error);
      console.error('Error details:', error.message);
    }
  };

  // 💾 Save poem with stickers
  const savePoem = async () => {
    if (fridgeMagnets.length === 0) {
      alert('Please add some magnets to the fridge first!');
      return;
    }

    setSaving(true);
    try {
      const poemsRef = collection(db, 'users', userId, 'poems');
      await addDoc(poemsRef, {
        magnets: fridgeMagnets,
        stickers: fridgeStickers,
        createdAt: new Date(),
      });
      
      alert('Poem saved successfully! 🎉');
      setFridgeMagnets([]);
      setFridgeStickers([]);
      setAvailableMagnets(availableMagnets.map(m => ({ ...m, onFridge: false })));
    } catch (error) {
      console.error('Error saving poem:', error);
      alert('Failed to save poem. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // 🎨 Add sticker to fridge
  const addStickerToFridge = (sticker) => {
    const newSticker = {
      id: `sticker-${Date.now()}`,
      name: sticker.name,
      path: sticker.path,
      x: 50, // Default position
      y: 20
    };
    setFridgeStickers([...fridgeStickers, newSticker]);
    setShowStickerPanel(false);
  };

  // Remove sticker
  const removeSticker = (id) => {
    setFridgeStickers(fridgeStickers.filter(s => s.id !== id));
  };

  // 🧲 Drag and drop
  const handleDragStart = (e, magnet, fromFridge = false) => {
    const rect = e.target.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggedMagnet({ ...magnet, fromFridge });
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDropOnFridge = (e) => {
    e.preventDefault();
    if (!draggedMagnet) return;

    const fridgeRect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - fridgeRect.left - offset.x;
    let y = e.clientY - fridgeRect.top - offset.y;

    x = Math.max(0, Math.min(x, fridgeRect.width - 100));
    y = Math.max(0, Math.min(y, fridgeRect.height - 40));

    if (draggedMagnet.fromFridge) {
      setFridgeMagnets((prev) =>
        prev.map((m) => (m.id === draggedMagnet.id ? { ...m, x, y } : m))
      );
    } else {
      setFridgeMagnets((prev) => [...prev, { ...draggedMagnet, x, y }]);
      setAvailableMagnets((prev) =>
        prev.map((m) =>
          m.id === draggedMagnet.id ? { ...m, onFridge: true } : m
        )
      );
    }
    setDraggedMagnet(null);
  };

  const removeMagnetFromFridge = (id) => {
    setFridgeMagnets((prev) => prev.filter((m) => m.id !== id));
    setAvailableMagnets((prev) =>
      prev.map((m) => (m.id === id ? { ...m, onFridge: false } : m))
    );
  };

  // Swipe functions
  const handleSwipeLeft = () => {
    if (currentFeedIndex < feedPoems.length - 1) {
      setCurrentFeedIndex(currentFeedIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentFeedIndex > 0) {
      setCurrentFeedIndex(currentFeedIndex - 1);
    }
  };

  // ❤️ Like/Unlike poem
  const toggleLike = async (poem) => {
    if (likingPoem) return; // Prevent spam clicking
    
    setLikingPoem(poem.id);
    try {
      const poemRef = doc(db, 'users', poem.userId, 'poems', poem.id);
      const hasLiked = poem.likedBy?.includes(userId);
      
      if (hasLiked) {
        // Unlike
        await updateDoc(poemRef, {
          likes: increment(-1),
          likedBy: arrayRemove(userId)
        });
        
        // Update local state
        setFeedPoems(feedPoems.map(p => 
          p.id === poem.id 
            ? { ...p, likes: (p.likes || 0) - 1, likedBy: p.likedBy.filter(id => id !== userId) }
            : p
        ));
      } else {
        // Like
        await updateDoc(poemRef, {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        });
        
        // Update local state
        setFeedPoems(feedPoems.map(p => 
          p.id === poem.id 
            ? { ...p, likes: (p.likes || 0) + 1, likedBy: [...(p.likedBy || []), userId] }
            : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to like poem. Please try again.');
    } finally {
      setLikingPoem(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">🧊</h1>
            <div className="flex gap-6">
              <button 
                onClick={() => setCurrentView('create')}
                className={`font-semibold ${currentView === 'create' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-700 hover:text-gray-900'}`}
              >
                Create
              </button>
              <button 
                onClick={() => setCurrentView('past')}
                className={`font-semibold ${currentView === 'past' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-700 hover:text-gray-900'}`}
              >
                Past Poems
              </button>
              <button 
                onClick={() => setCurrentView('feed')}
                className={`font-semibold ${currentView === 'feed' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-700 hover:text-gray-900'}`}
              >
                Feed
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        {currentView === 'create' && (
          // Create view
          <div className="flex items-start justify-center gap-8">
            <div className="w-64 bg-white rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Word Magnets</h2>
              {availableMagnets.length > 0 ? (
                <div className="flex flex-wrap gap-3 justify-center">
                  {availableMagnets.map((magnet) => (
                    <div
                      key={magnet.id}
                      draggable={!magnet.onFridge}
                      onDragStart={(e) =>
                        !magnet.onFridge && handleDragStart(e, magnet, false)
                      }
                      className={`px-3 py-1.5 rounded-md shadow-md font-semibold border-2 select-none transition ${
                        magnet.onFridge
                          ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                          : 'bg-white text-gray-800 border-gray-300 cursor-move hover:shadow-lg hover:scale-105'
                      }`}
                    >
                      {magnet.text}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">Loading words...</p>
              )}
            </div>

            <div className="relative flex flex-col items-center gap-4">
              {/* Sticker Button */}
              <button
                onClick={() => setShowStickerPanel(!showStickerPanel)}
                className="px-6 py-2 rounded-lg font-bold bg-purple-500 text-white shadow-lg hover:bg-purple-600 transition"
              >
                🎨 Stickers ({userTotalLikes} likes)
              </button>

              {/* Sticker Panel */}
              {showStickerPanel && (
                <div className="absolute top-12 left-0 bg-white rounded-xl p-4 shadow-2xl border-2 border-purple-500 z-50">
                  <h3 className="font-bold text-gray-800 mb-3">Unlock Stickers with Likes!</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {availableStickers.map((sticker) => {
                      const isUnlocked = userTotalLikes >= sticker.unlockAt;
                      return (
                        <button
                          key={sticker.name}
                          onClick={() => isUnlocked && addStickerToFridge(sticker)}
                          disabled={!isUnlocked}
                          className={`p-2 rounded-lg border-2 transition ${
                            isUnlocked
                              ? 'border-purple-500 hover:bg-purple-50 cursor-pointer'
                              : 'border-gray-300 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <img src={sticker.path} alt={sticker.name} className="w-12 h-12 object-contain" />
                          <p className="text-xs mt-1">{isUnlocked ? '✅' : `🔒 ${sticker.unlockAt}`}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="relative">
                <div ref={fridgeRef} className="relative w-[28rem] h-[600px] bg-gradient-to-br from-slate-300 to-slate-400 rounded-3xl shadow-2xl border-8 border-slate-500">
                  <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-slate-400 to-slate-500 rounded-t-2xl border-b-4 border-slate-400">
                    <div className="absolute top-4 right-4 w-4 h-14 bg-slate-500 rounded-full shadow-inner"></div>
                    
                    {/* Stickers on freezer */}
                    {fridgeStickers.map((sticker) => (
                      <div
                        key={sticker.id}
                        style={{ left: sticker.x, top: sticker.y }}
                        className="absolute cursor-pointer group"
                      >
                        <img src={sticker.path} alt={sticker.name} className="w-16 h-16 object-contain" />
                        <button
                          onClick={() => removeSticker(sticker.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    className="absolute top-44 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-b-2xl"
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnFridge}
                  >
                    <div className="absolute top-16 right-4 w-4 h-20 bg-slate-500 rounded-full shadow-inner"></div>

                    {fridgeMagnets.map((magnet) => (
                      <div
                        key={magnet.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, magnet, true)}
                        style={{ left: magnet.x, top: magnet.y }}
                        className="absolute bg-white px-3 py-1.5 rounded-md shadow-lg cursor-move font-semibold text-gray-800 border-2 border-gray-300 hover:shadow-xl transition select-none"
                      >
                        {magnet.text}
                        <button
                          onClick={() => removeMagnetFromFridge(magnet.id)}
                          className="ml-2 text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-600 rounded-b-2xl"></div>
                </div>

                <div className="absolute -bottom-2 left-8 right-8 h-4 bg-black opacity-20 blur-xl rounded-full"></div>
              </div>

              <div className="flex gap-4 items-center">
                <button
                  onClick={savePoem}
                  disabled={saving || fridgeMagnets.length === 0}
                  className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition ${
                    saving || fridgeMagnets.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 hover:shadow-xl'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Poem'}
                </button>

                <button
                  onClick={sharePoem}
                  disabled={shareLoading || fridgeMagnets.length === 0}
                  className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 ${
                    shareLoading || fridgeMagnets.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 hover:shadow-xl'
                  }`}
                >
                  {shareLoading ? (
                    <>📸 Creating...</>
                  ) : (
                    <>📸 Share as Image</>
                  )}
                </button>

                <button
                  onClick={analyzePoem}
                  disabled={analyzing || fridgeMagnets.length === 0}
                  className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 ${
                    analyzing || fridgeMagnets.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600 hover:shadow-xl'
                  }`}
                >
                  {analyzing ? (
                    <>🤖 Analyzing...</>
                  ) : (
                    <>🎭 AI Analysis</>
                  )}
                </button>
              </div>

              {/* Success message */}
              {shareUrl && (
                <div className="mt-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg text-green-800 font-semibold">
                  ✅ Image downloaded! Check your downloads folder.
                </div>
              )}

              {/* AI Analysis Card */}
              {poemAnalysis && (
                <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-400 rounded-2xl shadow-2xl max-w-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-purple-800">🎉 AI Poetry Analysis</h3>
                    <button 
                      onClick={() => setPoemAnalysis(null)}
                      className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 italic">Making poetry from random words is tough - great job! 🌟</p>
                  
                  {/* Score */}
                  <div className="mb-6 text-center">
                    <div className="text-6xl font-bold text-purple-600 mb-2">
                      {poemAnalysis.score}/10
                    </div>
                    <div className="flex justify-center gap-1 mb-2">
                      {[...Array(10)].map((_, i) => (
                        <span key={i} className="text-2xl">
                          {i < poemAnalysis.score ? '⭐' : '☆'}
                        </span>
                      ))}
                    </div>
                    {poemAnalysis.score >= 9 && (
                      <p className="text-lg font-bold text-purple-700">🔥 FIRE POEM! Absolute bars! 🔥</p>
                    )}
                    {poemAnalysis.score >= 7 && poemAnalysis.score < 9 && (
                      <p className="text-lg font-bold text-purple-700">✨ Great work with those random words! ✨</p>
                    )}
                    {poemAnalysis.score < 7 && (
                      <p className="text-lg font-bold text-purple-700">💪 Keep going! You're getting the hang of it! 💪</p>
                    )}
                  </div>

                  {/* Mood */}
                  <div className="mb-4 text-center">
                    <span className="inline-block px-6 py-2 bg-purple-200 rounded-full text-purple-800 font-bold text-lg">
                      🎭 Mood: {poemAnalysis.mood}
                    </span>
                  </div>

                  {/* Strengths */}
                  <div className="mb-4">
                    <h4 className="font-bold text-green-700 text-lg mb-2">✅ Strengths:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {poemAnalysis.strengths.map((strength, idx) => (
                        <li key={idx} className="text-gray-800">{strength}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="mb-4">
                    <h4 className="font-bold text-blue-700 text-lg mb-2">💫 Ideas to Try Next:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {poemAnalysis.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-gray-800">{improvement}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Literary Devices */}
                  <div>
                    <h4 className="font-bold text-purple-700 text-lg mb-2">📚 Literary Devices Found:</h4>
                    <div className="flex flex-wrap gap-2">
                      {poemAnalysis.literary_devices.map((device, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-purple-200 rounded-full text-purple-800 font-semibold text-sm"
                        >
                          {device}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'past' && (
          // Past poems view
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Past Poems</h2>
            {pastPoems.length === 0 ? (
              <p className="text-gray-600 text-center text-lg">No saved poems yet. Create your first poem!</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-12 gap-y-16 max-w-6xl mx-auto">
                {pastPoems.map((poem) => (
                  <div key={poem.id} className="relative flex flex-col items-center gap-4">
                    <div className="relative w-[28rem] h-[600px] bg-gradient-to-br from-slate-300 to-slate-400 rounded-3xl shadow-2xl border-8 border-slate-500">
                      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-slate-400 to-slate-500 rounded-t-2xl border-b-4 border-slate-400">
                        <div className="absolute top-4 right-4 w-4 h-14 bg-slate-500 rounded-full shadow-inner"></div>
                      </div>

                      <div className="absolute top-44 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-b-2xl">
                        <div className="absolute top-16 right-4 w-4 h-20 bg-slate-500 rounded-full shadow-inner"></div>
                        
                        {poem.magnets.map((magnet, idx) => (
                          <div
                            key={idx}
                            style={{ left: magnet.x, top: magnet.y }}
                            className={`absolute bg-white px-3 py-1.5 rounded-md shadow-lg font-semibold text-gray-800 border-2 border-gray-300 transition ${
                              playingPoemId === poem.id ? 'ring-2 ring-blue-400' : ''
                            }`}
                          >
                            {magnet.text}
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-600 rounded-b-2xl"></div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedVoices[poem.id] || 'poem'}
                        onChange={(e) => setSelectedVoices({...selectedVoices, [poem.id]: e.target.value})}
                        className="px-3 py-2 rounded-lg border-2 border-gray-300 font-semibold text-gray-800 focus:outline-none focus:border-blue-500 capitalize"
                      >
                        {availableVoices.map((voice) => (
                          <option key={voice} value={voice} className="capitalize">
                            {voice.replace('_', ' ')}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => playPoem(poem, poem.id)}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 ${
                          playingPoemId === poem.id
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {playingPoemId === poem.id ? (
                          <>
                            <span>⏸</span> Stop
                          </>
                        ) : (
                          <>
                            Play
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'feed' && (
          // Feed view
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Community Feed</h2>
            
            {feedPoems.length === 0 ? (
              <p className="text-gray-600 text-center text-lg">No poems in the feed yet!</p>
            ) : (
              <div className="relative">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-[28rem] h-[600px] bg-gradient-to-br from-slate-300 to-slate-400 rounded-3xl shadow-2xl border-8 border-slate-500">
                    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-slate-400 to-slate-500 rounded-t-2xl border-b-4 border-slate-400">
                      <div className="absolute top-4 right-4 w-4 h-14 bg-slate-500 rounded-full shadow-inner"></div>
                    </div>

                    <div className="absolute top-44 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-b-2xl">
                      <div className="absolute top-16 right-4 w-4 h-20 bg-slate-500 rounded-full shadow-inner"></div>
                      
                      {feedPoems[currentFeedIndex]?.magnets?.map((magnet, idx) => (
                        <div
                          key={idx}
                          style={{ left: magnet.x, top: magnet.y }}
                          className={`absolute bg-white px-3 py-1.5 rounded-md shadow-lg font-semibold text-gray-800 border-2 border-gray-300 transition ${
                            playingPoemId === feedPoems[currentFeedIndex].id ? 'ring-2 ring-blue-400' : ''
                          }`}
                        >
                          {magnet.text}
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-600 rounded-b-2xl"></div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={selectedVoices[feedPoems[currentFeedIndex]?.id] || 'poem'}
                      onChange={(e) => setSelectedVoices({...selectedVoices, [feedPoems[currentFeedIndex].id]: e.target.value})}
                      className="px-3 py-2 rounded-lg border-2 border-gray-300 font-semibold text-gray-800 focus:outline-none focus:border-blue-500 capitalize"
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice} value={voice} className="capitalize">
                          {voice.replace('_', ' ')}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => playPoem(feedPoems[currentFeedIndex], feedPoems[currentFeedIndex].id)}
                      className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 ${
                        playingPoemId === feedPoems[currentFeedIndex]?.id
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {playingPoemId === feedPoems[currentFeedIndex]?.id ? (
                        <>
                          <span>⏸</span> Stop
                        </>
                      ) : (
                        <>
                          Play
                        </>
                      )}
                    </button>

                    {/* Like Button */}
                    <button
                      onClick={() => toggleLike(feedPoems[currentFeedIndex])}
                      disabled={likingPoem === feedPoems[currentFeedIndex]?.id}
                      className={`px-6 py-2 rounded-lg font-bold shadow-lg transition flex items-center gap-2 ${
                        feedPoems[currentFeedIndex]?.likedBy?.includes(userId)
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-white text-red-500 border-2 border-red-500 hover:bg-red-50'
                      }`}
                    >
                      <span className="text-xl">{feedPoems[currentFeedIndex]?.likedBy?.includes(userId) ? '❤️' : '🤍'}</span>
                      <span>{feedPoems[currentFeedIndex]?.likes || 0}</span>
                    </button>
                  </div>

                  <div className="flex gap-8 mt-4">
                    <button
                      onClick={handleSwipeRight}
                      disabled={currentFeedIndex === 0}
                      className={`px-8 py-4 rounded-full font-bold text-white shadow-xl transition text-2xl ${
                        currentFeedIndex === 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
                      }`}
                    >
                      ← Previous
                    </button>
                    
                    <button
                      onClick={handleSwipeLeft}
                      disabled={currentFeedIndex === feedPoems.length - 1}
                      className={`px-8 py-4 rounded-full font-bold text-white shadow-xl transition text-2xl ${
                        currentFeedIndex === feedPoems.length - 1
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-pink-500 hover:bg-pink-600 hover:scale-110'
                      }`}
                    >
                      Next →
                    </button>
                  </div>

                  <p className="text-gray-600 text-lg font-semibold">
                    {currentFeedIndex + 1} / {feedPoems.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}