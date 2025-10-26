import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, collectionGroup } from 'firebase/firestore';

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

  const userId = user.uid;
  const BACKEND_TTS_ENDPOINT = 'http://localhost:8000/api/tts';
  const BACKEND_VOICES_ENDPOINT = 'http://localhost:8000/api/voices';

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
      const voiceName = selectedVoices[poemId] || 'spongebob';

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
            ...getRandomSample(data.nouns || [], 5),
            ...getRandomSample(data.verbs || [], 6),
            ...getRandomSample(data.adjectives || [], 5),
            ...getRandomSample(data.conjunctionsAndArticles || [], 4)
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
        setAvailableVoices(['spongebob', 'horror', 'alle', 'king_von', 'cringe', 'chinese']);
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

  // 💾 Save poem
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
        createdAt: new Date(),
      });
      
      alert('Poem saved successfully! 🎉');
      setFridgeMagnets([]);
      setAvailableMagnets(availableMagnets.map(m => ({ ...m, onFridge: false })));
    } catch (error) {
      console.error('Error saving poem:', error);
      alert('Failed to save poem. Please try again.');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
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
                Gallery
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
              <div className="relative">
                <div className="relative w-[28rem] h-[600px] bg-gradient-to-br from-slate-300 to-slate-400 rounded-3xl shadow-2xl border-8 border-slate-500">
                  <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-slate-400 to-slate-500 rounded-t-2xl border-b-4 border-slate-400">
                    <div className="absolute top-4 right-4 w-4 h-14 bg-slate-500 rounded-full shadow-inner"></div>
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
              <div className="grid grid-cols-2 gap-8 max-w-6xl mx-auto">
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
                        value={selectedVoices[poem.id] || 'spongebob'}
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
                            <span>🔊</span> Play
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
                      value={selectedVoices[feedPoems[currentFeedIndex]?.id] || 'spongebob'}
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
                          <span>🔊</span> Play
                        </>
                      )}
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