import { PixelButton } from '../pixel/PixelButton'

type Props = {
  onCenterMe: () => void
  onFindSpider: () => void
  onWorldView: () => void
  onEvents: () => void
  onLocation: () => void
  hasPartnerLocation: boolean
}

/**
 * Yellow/orange actions — reference trailer/ticket slots,
 * remapped to private tracker commands.
 */
export function MapToolbar({
  onCenterMe,
  onFindSpider,
  onWorldView,
  onEvents,
  onLocation,
  hasPartnerLocation,
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
          disabled={!hasPartnerLocation}
        >
          FIND SPIDER
        </PixelButton>
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

      {/* Mobile: two primary yellow buttons like the reference, then compact row */}
      <div className="flex md:hidden flex-col gap-2 w-full">
        <div className="grid grid-cols-2 gap-2">
          <PixelButton variant="orange" className="!text-[7px] !py-2.5 !px-2 w-full" onClick={onCenterMe}>
            CENTER ME
          </PixelButton>
          <PixelButton
            variant="orange"
            className="!text-[7px] !py-2.5 !px-2 w-full"
            onClick={onFindSpider}
            disabled={!hasPartnerLocation}
          >
            FIND SPIDER
          </PixelButton>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onWorldView}>
            WORLD
          </PixelButton>
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onEvents}>
            EVENT
          </PixelButton>
          <PixelButton variant="ghost" className="!text-[6px] !py-2 !px-1 w-full" onClick={onLocation}>
            LOC
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
