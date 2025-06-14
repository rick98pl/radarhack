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
  bombSize: 2,
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
  const [lastSentAngle, setLastSentAngle] = useState(0); // Track last sent angle to avoid spam
  
  // UI Controls visibility flag - set to false to hide all control buttons
  const [showUIControls, setShowUIControls] = useState(false);

  // Get local player's view angle for radar rotation
  const getLocalPlayerViewAngle = () => {
    const localPlayer = playerArray.find(player => player.m_is_local_player);
    return localPlayer ? localPlayer.m_eye_angle : 0;
  };

  // Convert CS2 view angle to rotation angle for the iframe
  // We want the player cone to always point north (top), so we rotate the map in the opposite direction
  const convertViewAngleToRotation = (viewAngle) => {
    // Ensure viewAngle is a valid number
    if (typeof viewAngle !== 'number' || isNaN(viewAngle)) {
      viewAngle = 0;
    }
    
    // To keep the player cone pointing north, we need to rotate the map in the OPPOSITE direction
    // If player looks at 90°, we rotate the map by -90° so the cone appears to point north
    let rotation = -viewAngle; // Negative to reverse direction
    
    // Normalize to 0-360 range (handle negative values)
    rotation = ((rotation % 360) + 360) % 360;
    
    // Ensure we have a clean positive number
    rotation = Math.abs(rotation);
    
    // Final safety check - ensure it's in 0-360 range
    rotation = rotation % 360;
    
    // Round to avoid floating point precision issues
    rotation = Math.round(rotation * 10) / 10; // Round to 1 decimal place
    
    return rotation;
  };

  // Send player angle to Electron
  useEffect(() => {
    if (!isElectronRotating || playerArray.length === 0) return;

    const localPlayerAngle = (localPlayer && localPlayer.m_health > 0) ? localPlayer.m_eye_angle : 0;

    const rotationAngle = convertViewAngleToRotation(localPlayerAngle);
    
    // Only send if angle has changed significantly (avoid spam)
    const angleDifference = Math.abs(rotationAngle - lastSentAngle);
    const normalizedDifference = Math.min(angleDifference, 360 - angleDifference);
    
    if (normalizedDifference > 1) { // Only update if change is > 1 degree
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

  // Function to handle rotation
  const handleRotateMap = () => {
    setRotationOffset(prev => (prev + 90) % 360);
  };

  // Function to toggle Electron rotation
  const toggleElectronRotation = () => {
    const newState = !isElectronRotating;
    setIsElectronRotating(newState);
    
    if (!newState) {
      // Reset to 0 when stopping
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
      // Start with current player angle
      const localPlayerAngle = getLocalPlayerViewAngle();
      
      // Validate the angle before processing
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

  // Function to toggle player cards visibility
  const togglePlayerCards = () => {
    setShowPlayerCards(prev => !prev);
  };

  // Example: Auto-trigger rotation based on game events (optional)
  useEffect(() => {
    // Optional: Start rotation when bomb is planted
    if (bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused) {
      if (!isElectronRotating) {
        setIsElectronRotating(true);
      }
    }
    // Note: Removed auto-stop to let user control rotation manually
  }, [bombData]);

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

  // Get current local player info for display
  const localPlayer = playerArray.find(player => player.m_is_local_player);
  const currentPlayerAngle = localPlayer ? localPlayer.m_eye_angle : 0;
  const currentRotationAngle = convertViewAngleToRotation(currentPlayerAngle);

  return (
    <div className="w-screen h-screen flex relative overflow-hidden">
      {/* Main Radar Canvas */}
      <div
        className={`flex-1 flex flex-col justify-center backdrop-blur-[7.5px] overflow-hidden transition-all duration-300 ${
          showPlayerCards ? 'mr-64' : 'mr-0'
        }`}
        style={{
background: `linear-gradient(135deg, rgba(18, 30, 55, 0.95) 0%, rgba(15, 25, 48, 0.95) 16%, rgba(12, 20, 42, 0.95) 32%, rgba(9, 16, 36, 0.95) 48%, rgba(6, 12, 28, 0.95) 64%, rgba(4, 8, 22, 0.95) 80%, rgba(2, 5, 18, 0.95) 100%)`,          backdropFilter: `blur(7.5px)`,
        }}
      >
        {/* UI Controls - Only show if showUIControls is true */}
        {showUIControls && (
          <>
            {/* Rotation Button */}
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

            {/* Electron Player Angle Rotation Toggle Button */}
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

            {/* Player Cards Toggle Button */}
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
                  // Eye slash icon (hide)
                  <>
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                  </>
                ) : (
                  // Eye icon (show)
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </>
                )}
              </svg>
            </button>
          </>
        )}

        {/* Bomb Timer in Top-Left Corner */}
        {bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused && (
          <div className={`absolute left-4 top-4 flex items-center gap-1 z-50`}>
            <MaskedIcon
              path={`./assets/icons/c4_sml.png`}
              height={32}
              color={
                (bombData.m_is_defusing &&
                  bombData.m_blow_time - bombData.m_defuse_time > 0 &&
                  `bg-radar-green`) ||
                (bombData.m_blow_time - bombData.m_defuse_time < 0 &&
                  `bg-radar-red`) ||
                `bg-radar-secondary`
              }
            />
            <span className="text-white font-semibold">{`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing &&
                `(${bombData.m_defuse_time.toFixed(1)}s)`) ||
              ""
              }`}</span>
          </div>
        )}

        <div className={`flex items-center justify-center px-[15px] min-h-screen`}>
          <Latency
           value={averageLatency}
           settings={settings}
           setSettings={setSettings}
          />

           {/* Zoomed radar container */}
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

      {/* Player Cards Canvas - Separate sliding panel */}
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
        {/* Panel Header */}
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

        {/* Player Cards Container */}
        <div className="p-4 h-full overflow-y-auto">
          {/* Allied Team Section */}
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

          {/* Enemy Team Section */}
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