import { useRef } from "react";
import Player from "./player";
import Bomb from "./bomb";

const getSpawnRotation = (localTeam, rotationOffset = 0) => {
  let offset = 180;
  // Rotate so CT spawn is always north (top)
  if (localTeam === 3) { // Counter-Terrorist
    return offset + rotationOffset; // Add user rotation offset
  } else { // Terrorist
    return offset + 180 + rotationOffset; // Flip the map + user rotation offset
  }
};

const Radar = ({
  playerArray,
  radarImage,
  mapData,
  localTeam,
  averageLatency,
  bombData,
  settings,
  rotationOffset = 0
}) => {
  const radarImageRef = useRef();

  return (
    <div id="radar" className={`relative overflow-hidden origin-center`} 
      style={{
        transform: `rotate(${getSpawnRotation(localTeam, rotationOffset)}deg)`,
        transition: 'transform 0.3s ease-out' // Smooth rotation animation
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
          rotationOffset={rotationOffset}
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