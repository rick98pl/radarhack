import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./App.css";
import PlayerCard from "./components/PlayerCard";
import Radar from "./components/Radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

/* change this to '1' if you want to use offline (your own pc only) */
const USE_LOCALHOST = 1;

/* you can get your public ip from https://ipinfo.io/ip */
const PUBLIC_IP = "your ip goes here".trim();
const PORT = 22006;

const EFFECTIVE_IP = USE_LOCALHOST ? "localhost" : PUBLIC_IP.match(/[a-zA-Z]/) ? window.location.hostname : PUBLIC_IP;

const DEFAULT_SETTINGS = {
  dotSize: 3,
  bombSize: 4,
  showAllNames: false,
  showEnemyNames: false,
  showViewCones: true,
};

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [showPlayerCards, setShowPlayerCards] = useState(false);
  const [isElectronRotating, setIsElectronRotating] = useState(true);
  const [lastSentAngle, setLastSentAngle] = useState(0);
  
  // NEW: Dynamic padding state
  const [centerPadding, setCenterPadding] = useState(55);
  
  // UI Controls visibility flag - set to false to hide all control buttons
  const [showUIControls, setShowUIControls] = useState(false);

  // NEW: Listen for messages from Electron main process
  useEffect(() => {
    const handleParentMessage = (event) => {
      // Make sure it's from the parent (Electron)
      if (event.source !== window.parent) return;
      
      console.log('[REACT] 📨 Received message from Electron:', event.data);
      
      switch (event.data.type) {
        case 'INCREASE_PADDING':
          setCenterPadding(prev => {
            const newValue = Math.min(200, prev + 5); // Max 200px
            console.log('[REACT] 📏 Increasing padding:', prev, '→', newValue);
            return newValue;
          });
          break;
        case 'DECREASE_PADDING':
          setCenterPadding(prev => {
            const newValue = Math.max(0, prev - 5); // Min 0px
            console.log('[REACT] 📏 Decreasing padding:', prev, '→', newValue);
            return newValue;
          });
          break;
        case 'SET_PADDING':
          console.log('[REACT] 📏 Setting padding to:', Math.max(0, Math.min(200, event.data.value || 55)));
          setCenterPadding(Math.max(0, Math.min(200, event.data.value || 55)));
          break;
        case 'TOGGLE_PLAYER_CARDS':
          setShowPlayerCards(prev => !prev);
          break;
        case 'ROTATE_MAP':
          setRotationOffset(prev => (prev + 90) % 360);
          break;
        // Add more cases as needed
      }
    };

    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, []);

  // Get local player's view angle for radar rotation
  const getLocalPlayerViewAngle = () => {
    const localPlayer = playerArray.find(player => player.m_is_local_player);
    return localPlayer ? localPlayer.m_eye_angle : 0;
  };

  // Convert CS2 view angle to rotation angle for the iframe
  const convertViewAngleToRotation = (viewAngle) => {
    if (typeof viewAngle !== 'number' || isNaN(viewAngle)) {
      viewAngle = 0;
    }
    
    let rotation = -viewAngle;
    rotation = ((rotation % 360) + 360) % 360;
    rotation = Math.abs(rotation);
    rotation = rotation % 360;
    rotation = Math.round(rotation * 10) / 10;
    
    return rotation;
  };

  // Send bomb status to Electron main process
  useEffect(() => {
    if (!bombData) return;

    // Process bomb data for Electron
    const bombStatus = {
      isPlanted: bombData.m_blow_time > 0 && !bombData.m_is_defused,
      isDefused: bombData.m_is_defused,
      isDefusing: bombData.m_is_defusing,
      blowTime: bombData.m_blow_time,
      defuseTime: bombData.m_defuse_time,
      canDefuse: bombData.m_is_defusing && (bombData.m_blow_time - bombData.m_defuse_time > 0),
      defusingPlayer: bombData.m_is_defusing ? {
        name: "Player" // You might need to get the actual defuser's name from playerArray
      } : null
    };

    // Send to parent window (Electron)
    if (window.parent !== window) {
      const bombMessage = {
        type: 'BOMB_STATUS',
        bombStatus: bombStatus,
        timestamp: Date.now()
      };
      
      console.log('[REACT] 💣 Sending bomb status to Electron:', bombStatus);
      window.parent.postMessage(bombMessage, '*');
    }
  }, [bombData, playerArray]);

  // Send player angle to Electron
  useEffect(() => {
    if (!isElectronRotating || playerArray.length === 0) return;

    const localPlayer = playerArray.find(player => player.m_is_local_player);
    const localPlayerAngle = (localPlayer && localPlayer.m_health > 0) ? localPlayer.m_eye_angle : 0;

    const rotationAngle = convertViewAngleToRotation(localPlayerAngle);
    
    const angleDifference = Math.abs(rotationAngle - lastSentAngle);
    const normalizedDifference = Math.min(angleDifference, 360 - angleDifference);
    
    if (normalizedDifference > 1) {
      console.log('[REACT] 🎯 Local player angle:', localPlayerAngle, '° -> Rotation:', rotationAngle, '°');
      
      if (window.parent !== window) {
        const rotationMessage = {
          type: 'ROTATION_ANGLE',
          angle: rotationAngle,
          playerAngle: localPlayerAngle,
          timestamp: Date.now()
        };
        
        window.parent.postMessage(rotationMessage, '*');
      }
      
      setLastSentAngle(rotationAngle);
    }
  }, [playerArray, isElectronRotating, lastSentAngle]);

  // NEW: Send padding updates to Electron for debugging/persistence
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PADDING_CHANGED',
        padding: centerPadding,
        timestamp: Date.now()
      }, '*');
    }
  }, [centerPadding]);

  const handleRotateMap = () => {
    setRotationOffset(prev => (prev + 90) % 360);
  };

  const toggleElectronRotation = () => {
    const newState = !isElectronRotating;
    setIsElectronRotating(newState);
    
    if (!newState) {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'ROTATION_ANGLE',
          angle: 0,
          playerAngle: 0,
          timestamp: Date.now()
        }, '*');
      }
      setLastSentAngle(0);
    } else {
      const localPlayerAngle = getLocalPlayerViewAngle();
      
      if (typeof localPlayerAngle === 'number' && !isNaN(localPlayerAngle)) {
        const rotationAngle = convertViewAngleToRotation(localPlayerAngle);
        
        if (window.parent !== window && rotationAngle >= 0 && rotationAngle < 360) {
          window.parent.postMessage({
            type: 'ROTATION_ANGLE',
            angle: rotationAngle,
            playerAngle: localPlayerAngle,
            timestamp: Date.now()
          }, '*');
        }
        setLastSentAngle(rotationAngle);
      }
    }
  };

  const togglePlayerCards = () => {
    setShowPlayerCards(prev => !prev);
  };

  useEffect(() => {
    const fetchData = async () => {
      let webSocket = null;
      let webSocketURL = null;
      let connectionTimeout = null;

      if (PUBLIC_IP.startsWith("192.168")) {
        document.getElementsByClassName(
          "radar_message"
        )[0].textContent = `A public IP address is required! Currently detected IP (${PUBLIC_IP}) is a private/local IP`;
        return;
      }

      if (!webSocket) {
        try {
          if (USE_LOCALHOST) {
            webSocketURL = `ws://localhost:${PORT}/cs2_webradar`;
          } else {
            webSocketURL = `ws://${EFFECTIVE_IP}:${PORT}/cs2_webradar`;
          }

          if (!webSocketURL) return;
          webSocket = new WebSocket(webSocketURL);
        } catch (error) {
          document.getElementsByClassName(
            "radar_message"
          )[0].textContent = `${error}`;
        }
      }

      connectionTimeout = setTimeout(() => {
        webSocket.close();
      }, CONNECTION_TIMEOUT);

      webSocket.onopen = async () => {
        clearTimeout(connectionTimeout);
        console.info("connected to the web socket");
      };

      webSocket.onclose = async () => {
        clearTimeout(connectionTimeout);
        console.error("disconnected from the web socket");
      };

      webSocket.onerror = async (error) => {
        clearTimeout(connectionTimeout);
        document.getElementsByClassName(
          "radar_message"
        )[0].textContent = `WebSocket connection to '${webSocketURL}' failed. Please check the IP address and try again`;
        console.error(error);
      };

      webSocket.onmessage = async (event) => {
        setAverageLatency(getLatency());

        const parsedData = JSON.parse(await event.data.text());
        setPlayerArray(parsedData.m_players);
        setLocalTeam(parsedData.m_local_team);
        setBombData(parsedData.m_bomb);

        const map = parsedData.m_map;
        if (map !== "invalid") {
          setMapData({
            ...(await (await fetch(`data/${map}/data.json`)).json()),
            name: map,
          });
          document.body.style.backgroundImage = `url(./data/${map}/background.png)`;
        }
      };
    };

    fetchData();
  }, []);

  const localPlayer = playerArray.find(player => player.m_is_local_player);
  const currentPlayerAngle = localPlayer ? localPlayer.m_eye_angle : 0;
  const currentRotationAngle = convertViewAngleToRotation(currentPlayerAngle);

  return (
    <div className="w-screen h-screen flex relative overflow-hidden">
      {/* REMOVED: Bomb Timer UI - now handled by Electron main.js */}

      {/* Main Radar Canvas */}
      <div
        className={`flex-1 flex flex-col justify-center backdrop-blur-[7.5px] overflow-hidden transition-all duration-300 ${
          showPlayerCards ? 'mr-64' : 'mr-0'
        }`}
        style={{
          background: `linear-gradient(135deg, rgba(18, 30, 55, 0.95) 0%, rgba(15, 25, 48, 0.95) 16%, rgba(12, 20, 42, 0.95) 32%, rgba(9, 16, 36, 0.95) 48%, rgba(6, 12, 28, 0.95) 64%, rgba(4, 8, 22, 0.95) 80%, rgba(2, 5, 18, 0.95) 100%)`,
          backdropFilter: `blur(7.5px)`,
        }}
      >
        {/* UI Controls */}
        {showUIControls && (
          <>
            <button
              onClick={handleRotateMap}
              className="absolute bottom-4 left-4 z-50 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-all duration-200 border border-white/30 hover:border-white/50 shadow-lg"
              title={`Rotate map 90° (current: ${rotationOffset}°)`}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>

            <button
              onClick={toggleElectronRotation}
              className={`absolute bottom-16 left-4 z-50 rounded-full p-3 transition-all duration-200 border shadow-lg ${
                isElectronRotating 
                  ? 'bg-blue-600/60 hover:bg-blue-500/70 border-blue-400/50 hover:border-blue-300/60' 
                  : 'bg-black/40 hover:bg-black/60 border-white/30 hover:border-white/50'
              }`}
              title={`${isElectronRotating ? 'Stop' : 'Start'} player angle rotation`}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6"/>
                <path d="M12 17v6"/>
                <path d="M3.5 9.5l4.2-4.2"/>
                <path d="M16.3 16.3l4.2-4.2"/>
              </svg>
            </button>

            <button
              onClick={togglePlayerCards}
              className="absolute bottom-4 right-4 z-50 bg-black/40 hover:bg-black/60 rounded-full p-3 transition-all duration-200 border border-white/30 hover:border-white/50 shadow-lg"
              title={`${showPlayerCards ? 'Hide' : 'Show'} player cards`}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-white"
              >
                {showPlayerCards ? (
                  <>
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </>
                )}
              </svg>
            </button>
          </>
        )}

        {/* UPDATED: Dynamic padding container with visual indicator */}
        <div 
          className="flex items-center justify-center min-h-screen transition-all duration-300"
          style={{ paddingLeft: `${centerPadding}px`, paddingRight: `${centerPadding}px` }}
        >
          {/* Optional: Padding indicator for debugging (remove in production) */}
          {showUIControls && (
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-sm font-mono">
              Padding: {centerPadding}px
            </div>
          )}

          <Latency
           value={averageLatency}
           settings={settings}
           setSettings={setSettings}
          />

          <div style={{transform: 'scale(1.0)', transformOrigin: 'center'}}>
            {(playerArray.length > 0 && mapData && (
              <Radar
                playerArray={playerArray}
                radarImage={`./data/${mapData.name}/radar.png`}
                mapData={mapData}
                localTeam={localTeam}
                averageLatency={averageLatency}
                bombData={bombData}
                settings={settings}
                rotationOffset={rotationOffset}
                localPlayerViewAngle={getLocalPlayerViewAngle()}
              />
            )) || (
              <div id="radar" className={`relative overflow-hidden origin-center`}>
                <h1 className="radar_message">
                  Connected! Waiting for data from usermode
                </h1>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Cards Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-64 transition-transform duration-300 ease-in-out z-40 ${
          showPlayerCards ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: `linear-gradient(135deg, rgba(15, 5, 30, 0.95) 0%, rgba(70, 35, 100, 0.95) 100%)`,
          backdropFilter: `blur(10px)`,
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Players</h2>
            <button
              onClick={togglePlayerCards}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-white"
              >
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 h-full overflow-y-auto">
          {playerArray.filter((player) => player.m_team === localTeam).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-green-300 mb-3 uppercase tracking-wide">
                Allied Team
              </h3>
              <div className="space-y-2">
                {playerArray
                  .filter((player) => player.m_team === localTeam)
                  .map((player) => (
                    <div key={player.m_idx} className="w-full">
                      <PlayerCard
                        playerData={player}
                        localTeam={localTeam}
                        isOnRightSide={false}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {playerArray.filter((player) => player.m_team !== localTeam).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-300 mb-3 uppercase tracking-wide">
                Enemy Team
              </h3>
              <div className="space-y-2">
                {playerArray
                  .filter((player) => player.m_team !== localTeam)
                  .map((player) => (
                    <div key={player.m_idx} className="w-full">
                      <PlayerCard
                        playerData={player}
                        localTeam={localTeam}
                        isOnRightSide={false}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;