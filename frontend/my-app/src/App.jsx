import { useEffect, useState } from 'react'
//import { onAuthStateChanged, signOut } from 'firebase/auth';
//import { auth } from 'firebase';
import './App.css'
import Login from './components/Login.jsx';

function App() {
  
  const [count, setCount] = useState(0)

  return (
    <>
      <Login/>
    </>
  )
}

export default App
