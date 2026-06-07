import { Canvas } from './components/Canvas'
import { useDesktopDocumentState } from './hooks/useDesktopDocumentState'

function App() {
  useDesktopDocumentState()
  return <Canvas />
}

export default App
