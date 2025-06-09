import { useRef, useState, useEffect } from "react";
import { getRadarPosition, playerColors } from "../utilities/utilities";


let playerRotations = [];
const calculatePlayerRotation = (playerData) => {
  const playerViewAngle = 270 - playerData.m_eye_angle;
  const idx = playerData.m_idx;

  playerRotations[idx] = (playerRotations[idx] || 0) % 360;
  playerRotations[idx] +=
    ((playerViewAngle - playerRotations[idx] + 540) % 360) - 180;

  return playerRotations[idx];
};

const Player = ({ playerData, mapData, radarImage, localTeam, averageLatency, settings, rotationOffset = 0 }) => {
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const radarPosition = getRadarPosition(mapData, playerData.m_position) || { x: 0, y: 0 };
  const invalidPosition = radarPosition.x <= 0 && radarPosition.y <= 0;

  const playerRef = useRef();
  const playerBounding = (playerRef.current &&
    playerRef.current.getBoundingClientRect()) || { width: 0, height: 0 };
  const playerRotation = calculatePlayerRotation(playerData);

  const radarImageBounding = (radarImage !== undefined &&
    radarImage.getBoundingClientRect()) || { width: 0, height: 0 };

  const scaledSize = 0.7 * settings.dotSize;

  // Store the last known position when the player dies
  useEffect(() => {
    if (playerData.m_is_dead) {
      if (!lastKnownPosition) {
        setLastKnownPosition(radarPosition);
      }
    } else {
      setLastKnownPosition(null);
    }
  }, [playerData.m_is_dead, radarPosition, lastKnownPosition]);

  const effectivePosition = playerData.m_is_dead ? lastKnownPosition || { x: 0, y: 0 } : radarPosition;

  const radarImageTranslation = {
    x: radarImageBounding.width * effectivePosition.x - playerBounding.width * 0.5,
    y: radarImageBounding.height * effectivePosition.y - playerBounding.height * 0.5,
  };

  // Check if this is an enemy player
  const isEnemy = playerData.m_team !== localTeam;
  
  // Cap health and armor at 100
  const safeHealth = Math.min(100, Math.max(0, playerData.m_health || 0));

  // Calculate the total rotation (spawn rotation + user rotation offset)
  const getSpawnRotation = (localTeam, rotationOffset = 0) => {
    let offset = 180;
    if (localTeam === 3) { // Counter-Terrorist
      return offset + rotationOffset;
    } else { // Terrorist
      return offset + 180 + rotationOffset;
    }
  };

  const totalMapRotation = getSpawnRotation(localTeam, rotationOffset);

  // Calculate offset based on map rotation to keep HP above dot
  const getHPOffset = () => {
    const angle = (totalMapRotation * Math.PI) / 180; // Convert to radians
    const distance = 20; // Reduced distance from dot center
    return {
      x: Math.sin(angle) * distance,
      y: -Math.cos(angle) * distance
    };
  };

  const hpOffset = getHPOffset();

if (playerData.m_is_dead) {
  return null;
}

  return (
    
    <div
      className={`absolute origin-center rounded-[100%] left-0 top-0`}
      ref={playerRef}
      style={{
        width: `${scaledSize}vw`,
        height: `${scaledSize}vw`,
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        transition: `transform ${averageLatency}ms linear`,
        zIndex: `${(playerData.m_is_dead && `0`) || `1`}`,
        WebkitMask: `${(playerData.m_is_dead && `url('./assets/icons/icon-enemy-death_png.png') no-repeat center / contain`) || `none`}`,
      }}
    >
      {/* HP number for enemy players - positioned to always appear above dot */}
      {isEnemy && !playerData.m_is_dead && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${hpOffset.x}px), calc(-50% + ${hpOffset.y}px)) rotate(${-totalMapRotation}deg)`,
            zIndex: 10
          }}
        >
          <span className="text-xs text-white font-bold bg-black/40 px-0.5 py-0.5 rounded text-[10px]">
            {safeHealth}
          </span>
        </div>
      )}

      {/* Name above the dot - outside rotation container */}
     {/* {(settings.showAllNames && playerData.m_team === localTeam) ||
  (settings.showEnemyNames && playerData.m_team !== localTeam) ? (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 text-center">
    <span className="text-xs text-white whitespace-nowrap max-w-[80px] inline-block overflow-hidden text-ellipsis">
      {playerData.m_name}
    </span>
  </div>
) : null} */}

{playerData.m_name === 'THE_SMURFx' && (
  <>
    {/* Inner aureola */}
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-400"
      style={{
        width: `${scaledSize * 2}vw`,
        height: `${scaledSize * 2}vw`,
        animation: 'customPulse 1.5s infinite'
      }}
    />
    

    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-300"
      style={{
        width: `${scaledSize * 3}vw`,
        height: `${scaledSize * 3}vw`,
        animation: 'customPulse 1.5s infinite 0.3s'
      }}
    />
    
    
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-200"
      style={{
        width: `${scaledSize * 4}vw`,
        height: `${scaledSize * 4}vw`,
        animation: 'customPulse 1.5s infinite 0.6s'
      }}
    />
    
    <style jsx>{`
      @keyframes customPulse {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 0.3;
          transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    `}</style>
  </>
)}
      {/* Rotating container for player elements */}
      <div
        style={{
          transform: `rotate(${(playerData.m_is_dead && `0`) || playerRotation}deg)`,
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          transition: `transform ${averageLatency}ms linear`,
          opacity: `${(playerData.m_is_dead && `0.8`) || (invalidPosition && `0`) || `1`}`,
        }}
      >
        {/* Player dot */}
        <div
          className={`w-full h-full rounded-[50%_50%_50%_0%] rotate-[315deg]`}
         style={{
  backgroundColor: `${
    playerData.m_name === 'THE_SMURFx' ? '#00ff00' : // Green for THE_SMURF
    (playerData.m_team == localTeam && playerColors[playerData.m_color]) || 
    `red`
  }`,
}}
        />

{/* View cone */}
{settings.showViewCones && !playerData.m_is_dead && (
  <div
    className={`absolute left-1/2 top-1/2 ${
      playerData.m_name === 'THE_SMURF' ? 'w-[6vw] h-[12vw] opacity-15 bg-green-300' : 'w-[4vw] h-[8vw] opacity-30 bg-white'
    }`}
    style={{
      transform: `translate(-50%, 5%) rotate(0deg)`,
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    }}
  />
)}

      </div>
    </div>
  );
};

export default Player;