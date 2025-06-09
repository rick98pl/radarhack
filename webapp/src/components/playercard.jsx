import { useState, useEffect } from "react";
import MaskedIcon from "./maskedicon";
import { playerColors, teamEnum } from "../utilities/utilities";

const PlayerCard = ({ playerData, isOnRightSide, localTeam }) => {
  const [modelName, setModelName] = useState(playerData.m_model_name);

  useEffect(() => {
    if (playerData.m_model_name)
      setModelName(playerData.m_model_name);
  }, [playerData.m_model_name]);

  // Determine if this player is on the local team
  const isLocalTeam = playerData.m_team === localTeam;
  
  // Set border and background colors based on team
  const teamColorClasses = isLocalTeam 
    ? 'border-green-400/50 bg-green-500/10' 
    : 'border-red-400/50 bg-red-500/10';

  // Ensure health and armor are never negative and cap at 100
  const safeHealth = Math.min(100, Math.max(0, playerData.m_health || 0));
  const safeArmor = Math.min(100, Math.max(0, playerData.m_armor || 0));

  return (
    <li
      style={{ opacity: `${(playerData.m_is_dead && `0.5`) || `1`}` }}
      className={`flex flex-col p-1.5 py-3 rounded-md border ${teamColorClasses} transition-all duration-200 w-28 h-24`}
    >
      {/* Player nickname at top */}
      <div className="flex items-center justify-center mb-1">
        <div className={`text-xs font-medium ${isLocalTeam ? 'text-green-300' : 'text-red-300'} text-center leading-tight truncate w-full`}>
          {playerData.m_name}
        </div>
      </div>

      {/* Money */}
      <div className="flex justify-center mb-1">
        <span className={`text-radar-green font-semibold text-xs`}>
          ${playerData.m_money}
        </span>
      </div>

      {/* Health and Armor row */}
      <div className="flex justify-center gap-2 items-center mb-1">
        <div className="flex gap-0.5 items-center">
          <MaskedIcon
            path={`./assets/icons/health.svg`}
            height={8}
            color={`${isLocalTeam ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className={`${isLocalTeam ? 'text-green-300' : 'text-red-300'} font-medium text-xs`}>
            {safeHealth}
          </span>
        </div>

        <div className="flex gap-0.5 items-center">
          <MaskedIcon
            path={`./assets/icons/${
              (playerData.m_has_helmet && `kevlar_helmet`) || `kevlar`
            }.svg`}
            height={8}
            color={`${isLocalTeam ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className={`${isLocalTeam ? 'text-green-300' : 'text-red-300'} font-medium text-xs`}>
            {safeArmor}
          </span>
        </div>
      </div>

      {/* Weapons row */}
      <div className="flex justify-center gap-1 items-center">
        {playerData.m_weapons && playerData.m_weapons.m_primary && (
          <MaskedIcon
            path={`./assets/icons/${playerData.m_weapons.m_primary}.svg`}
            height={12}
            color={`${isLocalTeam ? 'bg-green-500' : 'bg-red-500'}`}
          />
        )}

        {playerData.m_weapons && playerData.m_weapons.m_secondary && (
          <MaskedIcon
            path={`./assets/icons/${playerData.m_weapons.m_secondary}.svg`}
            height={12}
            color={`${isLocalTeam ? 'bg-green-500' : 'bg-red-500'}`}
          />
        )}

        {/* Special items only */}
        {(playerData.m_team == teamEnum.counterTerrorist &&
          playerData.m_has_defuser && (
            <MaskedIcon
              path={`./assets/icons/defuser.svg`}
              height={10}
              color={`${isLocalTeam ? 'bg-green-400' : 'bg-red-400'}`}
            />
          )) ||
          (playerData.m_team == teamEnum.terrorist &&
            playerData.m_has_bomb && (
              <MaskedIcon
                path={`./assets/icons/c4.svg`}
                height={10}
                color={`${isLocalTeam ? 'bg-green-500' : 'bg-red-500'}`}
              />
            ))}
      </div>
    </li>
  );
};

export default PlayerCard;