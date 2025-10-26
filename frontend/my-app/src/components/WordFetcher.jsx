import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * WordFetcher component
 * - Fetches categorized words from Firebase Firestore
 * - Randomly selects nouns, verbs, and adjectives
 * - Combines them into a single array for your poem game
 *
 * Optional: Pass a prop `onWordsReady` to get the combined array in the parent component.
 * Example:
 *   <WordFetcher onWordsReady={(arr) => setPoemWords(arr)} />
 */

export default function WordFetcher({ onWordsReady }) {
  const [words, setWords] = useState({ nouns: [], verbs: [], adjectives: [] });
  const [combinedWords, setCombinedWords] = useState([]);

  // helper to randomly pick n items
  const randomSample = (arr, n) =>
    arr.sort(() => 0.5 - Math.random()).slice(0, n);

  // fetch words from Firebase
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const docRef = doc(db, "wordCategories", "categorizedWords");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWords(docSnap.data());
        } else {
          console.error("No document found in Firestore!");
        }
      } catch (err) {
        console.error("Error fetching words:", err);
      }
    };

    fetchWords();
  }, []);

  // generate random combined array
  const generateRandomSet = () => {
    const { nouns, verbs, adjectives } = words;
    if (nouns.length && verbs.length && adjectives.length) {
      const selectedNouns = randomSample(nouns, 10);
      const selectedVerbs = randomSample(verbs, 7);
      const selectedAdjectives = randomSample(adjectives, 8);

      // combine all into one array
      const combined = [
        ...selectedNouns,
        ...selectedVerbs,
        ...selectedAdjectives,
      ];

      setCombinedWords(combined);

      // send up to parent if provided
      if (onWordsReady) {
        onWordsReady(combined);
      }
    } else {
      console.warn("Word lists are empty or not loaded yet!");
    }
  };

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-3">🎨 Random Poem Words</h2>

      <button
        onClick={generateRandomSet}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
      >
        Generate Words
      </button>

      {/* Display combined array */}
      {combinedWords.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Combined Word Array:</h3>
          <pre className="bg-gray-800 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(combinedWords, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
