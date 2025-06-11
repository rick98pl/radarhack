import { useRef, useState, useEffect } from "react";
import { getRadarPosition, playerColors } from "../utilities/utilities";
import MaskedIcon from "./maskedicon";

let playerRotations = [];
const calculatePlayerRotation = (playerData) => {
  const playerViewAngle = 270 - playerData.m_eye_angle;
  const idx = playerData.m_idx;
  playerRotations[idx] = (playerRotations[idx] || 0) % 360;
  playerRotations[idx] += ((playerViewAngle - playerRotations[idx] + 540) % 360) - 180;
  return playerRotations[idx];
};

const Player = ({ playerData, mapData, radarImage, localTeam, averageLatency, settings, rotationOffset = 0 }) => {
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const radarPosition = getRadarPosition(mapData, playerData.m_position) || { x: 0, y: 0 };
  const invalidPosition = radarPosition.x <= 0 && radarPosition.y <= 0;
  const playerRef = useRef();
  const playerBounding = (playerRef.current && playerRef.current.getBoundingClientRect()) || { width: 0, height: 0 };
  const playerRotation = calculatePlayerRotation(playerData);
  const radarImageBounding = (radarImage !== undefined && radarImage.getBoundingClientRect()) || { width: 0, height: 0 };
  const scaledSize = 0.7 * settings.dotSize;

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

  const isEnemy = playerData.m_team !== localTeam;
  const safeHealth = Math.min(100, Math.max(0, playerData.m_health || 0));
  
  // Get Z coordinate (height) and round it
  const zCoordinate = Math.round(Math.round(playerData.m_position?.z + 600|| 0)/10);

  const getWeaponToDisplay = () => {
    if (playerData.m_weapons?.m_primary) return playerData.m_weapons.m_primary;
    if (playerData.m_weapons?.m_secondary) return playerData.m_weapons.m_secondary;
    return null;
  };

  const weaponToDisplay = getWeaponToDisplay();

  const getSpawnRotation = (localTeam, rotationOffset = 0) => {
    let offset = 180;
    return localTeam === 3 ? offset + rotationOffset : offset + 180 + rotationOffset;
  };

  const totalMapRotation = getSpawnRotation(localTeam, rotationOffset);

  const getHPOffset = () => {
    const angle = (totalMapRotation * Math.PI) / 180;
    const distance = 20;
    return {
      x: Math.sin(angle) * distance,
      y: -Math.cos(angle) * distance
    };
  };

  const getZOffset = () => {
    const angle = (totalMapRotation * Math.PI) / 180;
    const distance = 35; // Slightly further than HP
    return {
      x: Math.sin(angle) * distance,
      y: -Math.cos(angle) * distance
    };
  };

  const hpOffset = getHPOffset();
  const zOffset = getZOffset();

  if (playerData.m_is_dead) return null;

  return (
    <div
      className="absolute origin-center rounded-[100%] left-0 top-0"
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
      {/* Z Coordinate display for enemies */}
      {isEnemy && !playerData.m_is_dead && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${zOffset.x}px), calc(-50% + ${zOffset.y}px)) rotate(${-totalMapRotation}deg)`,
            zIndex: 12
          }}
        >
          <span className="text-xs text-cyan-300 font-bold bg-black/50 px-1 py-0.5 rounded text-[10px]">
            {zCoordinate}
          </span>
        </div>
      )}

      {/* HP display for enemies */}
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

      {/* Weapon display for enemies */}
      {isEnemy && !playerData.m_is_dead && weaponToDisplay && (
        <div 
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${hpOffset.x}px), calc(-50% + ${hpOffset.y - 25}px)) rotate(${-totalMapRotation}deg)`,
            zIndex: 15,
            width: '32px',
            height: '28px'
          }}
        >
          <div className="bg-black/20 rounded px-1 py-1 flex items-center justify-center min-w-[28px] min-h-[24px]">
            <MaskedIcon
              path={`./assets/icons/${weaponToDisplay}.svg`}
              height={24}
              color="bg-yellow-400"
            />
          </div>
        </div>
      )}

      {/* Z Coordinate display for local player */}
      {playerData.m_is_local_player && !playerData.m_is_dead && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${zOffset.x}px), calc(-50% + ${zOffset.y}px)) rotate(${-totalMapRotation}deg)`,
            zIndex: 20
          }}
        >
          <span className="text-xs text-green-300 font-bold bg-black/50 px-1 py-0.5 rounded text-[10px]">
            {zCoordinate}
          </span>
        </div>
      )}

      <div
        style={{
          transform: `rotate(${(playerData.m_is_dead && `0`) || playerRotation}deg)`,
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          transition: `transform ${averageLatency}ms linear`,
          opacity: `${(playerData.m_is_dead && `0.8`) || (invalidPosition && `0`) || `1`}`,
        }}
      >
        <div
          className={`w-full h-full rounded-[50%_50%_50%_0%] rotate-[315deg]`}
          style={{
            backgroundColor: `${
              playerData.m_is_local_player ? '#00ff00' :
              (playerData.m_team == localTeam && playerColors[playerData.m_color]) || `red`
            }`,
          }}
        />
        {settings.showViewCones && !playerData.m_is_dead && (
          <div
            className={`absolute left-1/2 top-1/2 ${
              playerData.m_is_local_player ? 'w-[6vw] h-[12vw] opacity-70 bg-green-300' : 'w-[4vw] h-[8vw] opacity-40 bg-white'
            }`}
            style={{
              transform: `translate(-50%, 5%) rotate(0deg)`,
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            }}
          />
        )}
        {playerData.m_is_local_player && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400"
            style={{
              width: `${radarImageBounding.width * 0.48}px`,
              height: `${radarImageBounding.width * 0.48}px`,
              opacity: 0.3
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Player;