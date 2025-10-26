import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
import Login from './components/Login.jsx';
import FridgeMagnetPoetry from './components/FridgeMagnetPoetry.jsx';
import TitleScreen from './components/TitleScreen.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Show title screen first
  if (showTitle) {
    return <TitleScreen onStart={() => setShowTitle(false)} />;
  }

  // ✅ After title, show login if not logged in
  if (!user) {
    return <Login onLogin={() => setShowTitle(false)} />;
  }

  // ✅ If logged in, show the game
  return (
    <div className="App flex flex-col items-center gap-4 mt-6">
      <h1 className="text-xl font-bold">Welcome, {user.email.split('@')[0]}.</h1>
      <button
        onClick={() => signOut(auth)}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
      <FridgeMagnetPoetry user={user} />
    </div>
  );
}

export default App;
