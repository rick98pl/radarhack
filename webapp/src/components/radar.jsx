import { useRef } from "react";
import Player from "./player";
import Bomb from "./bomb";
const getSpawnRotation = (localTeam) => {
  // Rotate so CT spawn is always north (top)
  if (localTeam === 3) { // Counter-Terrorist
    return 270; // No rotation needed
  } else { // Terrorist
    return 90; // Flip the map
  }
};
const Radar = ({
  playerArray,
  radarImage,
  mapData,
  localTeam,
  averageLatency,
  bombData,
  settings
}) => {
  const radarImageRef = useRef();

  return (
    <div id="radar" className={`relative overflow-hidden origin-center`} 
  style={{
    transform: `rotate(${getSpawnRotation(localTeam)}deg)`
  }}>
      <img ref={radarImageRef} className={`w-[100vw] h-auto`} src={radarImage} />

      {playerArray.map((player) => (
        <Player
          key={player.m_idx}
          playerData={player}
          mapData={mapData}
          radarImage={radarImageRef.current}
          localTeam={localTeam}
          averageLatency={averageLatency}
          settings={settings}
        />
      ))}

      {bombData && (
        <Bomb
          bombData={bombData}
          mapData={mapData}
          radarImage={radarImageRef.current}
          localTeam={localTeam}
          averageLatency={averageLatency}
          settings={settings}
        />
      )}
    </div>
  );
};

export default Radar;