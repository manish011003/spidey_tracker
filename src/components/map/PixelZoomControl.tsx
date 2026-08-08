import { useMap } from 'react-leaflet'
import { playSound } from '../../services/sound/audio'

export function PixelZoomControl() {
  const map = useMap()

  return (
    <div className="absolute top-2 right-2 z-[400] flex flex-col gap-1">
      <button
        type="button"
        className="pixel-btn !py-1 !px-2 !text-[12px]"
        aria-label="Zoom in"
        onClick={() => {
          playSound('click')
          map.zoomIn()
        }}
      >
        +
      </button>
      <button
        type="button"
        className="pixel-btn pixel-btn--ghost !py-1 !px-2 !text-[12px]"
        aria-label="Zoom out"
        onClick={() => {
          playSound('click')
          map.zoomOut()
        }}
      >
        −
      </button>
    </div>
  )
}
