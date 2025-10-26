import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import './App.css'
import Login from './components/login.jsx';
import FridgeMagnetPoetry from './components/FridgeMagnetPoetry.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  <h1>Welcome to </h1>

  if (!user) return <Login onLogin={() => {}} />;

  return (
    <div class = "App">
      <h1>Welcome, {user.email}</h1>
      <button
        onClick={() => signOut(auth)}
      >
        Logout
      </button>
      <FridgeMagnetPoetry/>
    </div>
  );
}

export default App
