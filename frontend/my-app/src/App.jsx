import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import FridgePoetry from './components/FridgeMagnetPoetry.jsx'
import FridgeMagnetPoetry from './components/FridgeMagnetPoetry.jsx'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <FridgeMagnetPoetry />
    </>

  )
}

export default App
