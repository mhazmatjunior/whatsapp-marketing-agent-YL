import BroadcastTool from './components/BroadcastTool';
import './App.css';

function App() {
    return (
        <div className="app-container">
            <header className="app-header">
                <h1>WhatsApp Marketing Agent</h1>
                <p>Standalone Connection & Broadcast Hub</p>
            </header>
            <main>
                <BroadcastTool />
            </main>
        </div>
    );
}

export default App;
