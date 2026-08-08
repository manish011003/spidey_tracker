import { PixelButton } from '../pixel/PixelButton'

type Props = {
  onCenterMe: () => void
  onFindSpider: () => void
  onWorldView: () => void
  onEvents: () => void
  onLocation: () => void
  onQuiz?: () => void
  onMissions?: () => void
  onFriends?: () => void
}

/**
 * Yellow/orange actions — tracker + adventure commands.
 */
export function MapToolbar({
  onCenterMe,
  onFindSpider,
  onWorldView,
  onEvents,
  onLocation,
  onQuiz,
  onMissions,
  onFriends,
}: Props) {
  return (
    <div className="map-toolbar w-full" role="toolbar" aria-label="Map actions">
      <div className="hidden md:flex flex-col gap-2 w-full">
        <PixelButton variant="orange" className="!text-[7px] !py-2.5 !px-3 w-full" onClick={onCenterMe}>
          CENTER ON ME
        </PixelButton>
        <PixelButton
          variant="orange"
          className="!text-[7px] !py-2.5 !px-3 w-full"
          onClick={onFindSpider}
        >
          FIND SPIDER
        </PixelButton>
        {onMissions && (
          <PixelButton variant="cyan" className="!text-[7px] !py-2 !px-2 w-full" onClick={onMissions}>
            MISSIONS
          </PixelButton>
        )}
        {onQuiz && (
          <PixelButton variant="cyan" className="!text-[7px] !py-2 !px-2 w-full" onClick={onQuiz}>
            QUIZ
          </PixelButton>
        )}
        {onFriends && (
          <PixelButton variant="ghost" className="!text-[7px] !py-2 !px-2 w-full" onClick={onFriends}>
            FRIENDS
          </PixelButton>
        )}
        <PixelButton variant="ghost" className="!text-[7px] !py-2 !px-2 w-full" onClick={onWorldView}>
          WORLD VIEW
        </PixelButton>
        <PixelButton variant="ghost" className="!text-[7px] !py-2 !px-2 w-full" onClick={onEvents}>
          + EVENT
        </PixelButton>
        <PixelButton variant="ghost" className="!text-[7px] !py-2 !px-2 w-full" onClick={onLocation}>
          LOCATION
        </PixelButton>
      </div>

      <div className="flex md:hidden flex-col gap-2 w-full">
        <div className="grid grid-cols-2 gap-2">
          <PixelButton variant="orange" className="!text-[7px] !py-2.5 !px-2 w-full" onClick={onCenterMe}>
            CENTER ME
          </PixelButton>
          <PixelButton
            variant="orange"
            className="!text-[7px] !py-2.5 !px-2 w-full"
            onClick={onFindSpider}
          >
            FIND SPIDER
          </PixelButton>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {onMissions && (
            <PixelButton variant="cyan" className="!text-[6px] !py-2 !px-1 w-full" onClick={onMissions}>
              QUEST
            </PixelButton>
          )}
          {onQuiz && (
            <PixelButton variant="cyan" className="!text-[6px] !py-2 !px-1 w-full" onClick={onQuiz}>
              QUIZ
            </PixelButton>
          )}
          {onFriends && (
            <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onFriends}>
              CREW
            </PixelButton>
          )}
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onEvents}>
            EVENT
          </PixelButton>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onWorldView}>
            WORLD
          </PixelButton>
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onLocation}>
            LOC
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
