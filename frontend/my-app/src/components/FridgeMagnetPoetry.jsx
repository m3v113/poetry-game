import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // adjust this path if needed
import { doc, getDoc } from 'firebase/firestore';

export default function FridgeMagnetPoetry() {
  const [wordBank, setWordBank] = useState([]);
  const [fridgeMagnets, setFridgeMagnets] = useState([]);
  const [availableMagnets, setAvailableMagnets] = useState([]);
  const [draggedMagnet, setDraggedMagnet] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 🔥 Fetch categorized words from Firestore
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const docRef = doc(db, 'wordCategories', 'categorizedWords');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Helper to randomly sample N items from an array
          const getRandomSample = (arr, n) =>
            arr.sort(() => 0.5 - Math.random()).slice(0, n);

          // Mix random nouns, verbs, adjectives
          const randomWords = [
            ...getRandomSample(data.nouns || [], 5),
            ...getRandomSample(data.verbs || [], 5),
            ...getRandomSample(data.adjectives || [], 5),
          ];

          setWordBank(randomWords);

          // Turn words into draggable magnets
          setAvailableMagnets(
            randomWords.map((word, index) => ({
              id: `word-${index}`,
              text: word,
              onFridge: false,
            }))
          );
        } else {
          console.warn('⚠️ No "categorizedWords" document found in Firestore.');
        }
      } catch (error) {
        console.error('Error fetching words:', error);
      }
    };

    fetchWords();
  }, []);

  // 🧲 Drag-and-drop logic
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

    // Keep magnets within fridge bounds
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Fridge Magnet Poetry</h1>
            <div className="flex gap-6">
              <button className="text-gray-700 hover:text-gray-900 font-semibold">
                Past Poems
              </button>
              <button className="text-gray-700 hover:text-gray-900 font-semibold">
                Feed
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-start justify-center gap-8">
          {/* Word bank on the left side */}
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

          {/* Fridge */}
          <div className="relative">
            <div className="relative w-[28rem] h-[600px] bg-gradient-to-br from-slate-300 to-slate-400 rounded-3xl shadow-2xl border-8 border-slate-500">
              {/* Top freezer section */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-slate-400 to-slate-1000 rounded-t-4xl border-b-24 border-slate-400">
                <div className="absolute top-4 right-4 w-4 h-14 bg-slate-500 rounded-full shadow-inner"></div>
              </div>

              {/* Main fridge door - droppable area */}
              <div
                className="absolute top-44 left-0 right-0 bottom-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-b-2xl"
                onDragOver={handleDragOver}
                onDrop={handleDropOnFridge}
              >
                <div className="absolute top-16 right-4 w-4 h-20 bg-slate-500 rounded-full shadow-inner"></div>

                {/* Magnets on fridge */}
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

              {/* Bottom panel */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-600 rounded-b-2xl"></div>
            </div>

            {/* Floor shadow */}
            <div className="absolute -bottom-2 left-8 right-8 h-4 bg-black opacity-20 blur-xl rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
