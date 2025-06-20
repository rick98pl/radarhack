import { useRef } from "react";
import { getRadarPosition, teamEnum } from "../utilities/utilities";

const Bomb = ({ bombData, mapData, radarImage, localTeam, averageLatency, settings }) => {
  const radarPosition = getRadarPosition(mapData, bombData);

  const bombRef = useRef();
  const bombBounding = (bombRef.current &&
    bombRef.current.getBoundingClientRect()) || { width: 0, height: 0 };

  const radarImageBounding = (radarImage !== undefined &&
    radarImage.getBoundingClientRect()) || { width: 0, height: 0 };
  const radarImageTranslation = {
    x: radarImageBounding.width * radarPosition.x - bombBounding.width * 0.5,
    y: radarImageBounding.height * radarPosition.y - bombBounding.height * 0.5,
  };

  // Calculate bomb size based on settings
  const baseSize = 1.3; // Base size in vw
  const scaledSize = baseSize * settings.bombSize;

  return (
    <div
      className={`absolute origin-center rounded-[100%] left-0 top-0`}
      ref={bombRef}
      style={{
        width: `${scaledSize}vw`,
        height: `${scaledSize}vw`,
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        transition: `transform ${averageLatency}ms linear`,
       backgroundColor: `${
  (bombData.m_is_defused && `#ffffff`) ||                    // Green when defused
  (bombData.m_is_planted && `#ffffff`) ||                    // Orange when planted
  (bombData.m_is_dropped && `#000000`) ||                    // Yellow when dropped/on ground
  (!bombData.m_is_carried && `#ffffff`) ||                   // Yellow when not being carried
  (localTeam == teamEnum.counterTerrorist && `#ffffff`) ||   // Blue for CT team
  `#ffffff`                                                   // Red default
}`,
        WebkitMask: `url('./assets/icons/c4_sml.png') no-repeat center / contain`,
        opacity: `1`,
        zIndex: `1`,
      }}
    />
  );
};

export default Bomb;