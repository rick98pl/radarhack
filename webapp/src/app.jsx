import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./App.css";
import PlayerCard from "./components/PlayerCard";
import Radar from "./components/Radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

/* change this to '1' if you want to use offline (your own pc only) */
const USE_LOCALHOST = 0;

/* you can get your public ip from https://ipinfo.io/ip */
const PUBLIC_IP = "your ip goes here".trim();
const PORT = 22006;

const EFFECTIVE_IP = USE_LOCALHOST ? "localhost" : PUBLIC_IP.match(/[a-zA-Z]/) ? window.location.hostname : PUBLIC_IP;

const DEFAULT_SETTINGS = {
  dotSize: 6,
  bombSize: 4,
  showAllNames: false,
  showEnemyNames: false,
  showViewCones: true,
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem("radarSettings");
  return DEFAULT_SETTINGS;
};

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState(); 
  const [settings, setSettings] = useState(loadSettings());

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("radarSettings", JSON.stringify(settings));
  }, [settings]);

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

  return (
    <div
      className={`w-screen h-screen flex flex-col justify-center backdrop-blur-[7.5px] overflow-hidden`}
      style={{
        background: `radial-gradient(50% 50% at 50% 50%, rgba(20, 40, 55, 0.95) 0%, rgba(7, 20, 30, 0.95) 100%)`,
        backdropFilter: `blur(7.5px)`,
      }}
    >

      {bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused && (
        <div className={`absolute left-1/2 top-2 flex-col items-center gap-1 z-50`}>
          <div className={`flex justify-center items-center gap-1`}>
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
            <span>{`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing &&
                `(${bombData.m_defuse_time.toFixed(1)}s)`) ||
              ""
              }`}</span>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-center`}>
        <Latency
         value={averageLatency}
         settings={settings}
         setSettings={setSettings}
        />

{ <ul id="terrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
  {playerArray
    .filter((player) => player.m_team == 2)
    .map((player) => (
      <PlayerCard
        right={false}
        key={player.m_idx}
        playerData={player}
      />
    ))}
</ul> }

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
      />
    )) || (
      <div id="radar" className={`relative overflow-hidden origin-center`}>
        <h1 className="radar_message">
          Connected! Waiting for data from usermode
        </h1>
      </div>
    )}</div>

{ <ul
  id="counterTerrorist"
  className="lg:flex hidden flex-col gap-7 m-0 p-0"
>
  {playerArray
    .filter((player) => player.m_team == 3)
    .map((player) => (
      <PlayerCard
        right={true}
        key={player.m_idx}
        playerData={player}
        settings={settings}
      />
    ))}
</ul> }

      </div>
    </div>
  );
};

export default App;