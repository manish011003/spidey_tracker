import { useMemo, useState } from 'react'
import { PixelModal } from '../pixel/PixelModal'
import { PixelButton } from '../pixel/PixelButton'
import { pickRandomQuiz, type QuizDef } from '../../data/adventure'
import { recordQuizResult } from '../../services/firebase/adventure'
import { playSound } from '../../services/sound/audio'

type Props = {
  open: boolean
  uid: string
  streak: number
  onClose: () => void
  onFinished: (summary: string) => void
}

export function QuizModal({ open, uid, streak, onClose, onFinished }: Props) {
  const [quiz, setQuiz] = useState<QuizDef>(() => pickRandomQuiz())
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const q = quiz.questions[index]

  const reset = () => {
    setQuiz(pickRandomQuiz(quiz.id))
    setIndex(0)
    setCorrect(0)
    setPicked(null)
    setDone(false)
  }

  const choose = (i: number) => {
    if (picked != null || !q) return
    setPicked(i)
    const ok = i === q.correctIndex
    if (ok) {
      playSound('signal')
      setCorrect((c) => c + 1)
    } else playSound('error')
  }

  const next = async () => {
    if (index + 1 >= quiz.questions.length) {
      setBusy(true)
      try {
        const result = await recordQuizResult(uid, correct, quiz.questions.length)
        setDone(true)
        onFinished(
          `+${result.xpGained} XP · STREAK ${result.adventure.quizStreak}${result.leveledUp ? ' · LEVEL UP!' : ''}`,
        )
      } catch {
        playSound('error')
      } finally {
        setBusy(false)
      }
      return
    }
    setIndex((n) => n + 1)
    setPicked(null)
  }

  const progressLabel = useMemo(
    () => `${index + 1}/${quiz.questions.length}`,
    [index, quiz.questions.length],
  )

  return (
    <PixelModal open={open} title="SPIDER QUIZ" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between">
          <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
            {quiz.title}
          </p>
          <p className="pixel-label" style={{ color: 'var(--spidey-cyan)', fontSize: 7 }}>
            STREAK {streak} · {progressLabel}
          </p>
        </div>

        {!done && q && (
          <>
            <p
              className="font-[family-name:var(--font-readable)] text-xl"
              style={{ color: 'var(--spidey-text)' }}
            >
              {q.prompt}
            </p>
            <div className="flex flex-col gap-2">
              {q.choices.map((c, i) => {
                let bg = 'var(--spidey-panel)'
                if (picked != null) {
                  if (i === q.correctIndex) bg = 'var(--spidey-green)'
                  else if (i === picked) bg = 'var(--spidey-red)'
                }
                return (
                  <button
                    key={c}
                    type="button"
                    className="pixel-btn !text-[8px] !py-2.5 text-left"
                    style={{ background: bg, color: picked != null && (i === q.correctIndex || i === picked) ? '#111' : 'var(--spidey-text)' }}
                    disabled={picked != null}
                    onClick={() => choose(i)}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
            {picked != null && (
              <PixelButton disabled={busy} onClick={() => void next()}>
                {index + 1 >= quiz.questions.length ? (busy ? 'SAVING...' : 'CLAIM XP') : 'NEXT'}
              </PixelButton>
            )}
          </>
        )}

        {done && (
          <div className="text-center flex flex-col gap-3">
            <p className="pixel-label" style={{ color: 'var(--spidey-green)', fontSize: 10 }}>
              QUIZ COMPLETE
            </p>
            <p className="pixel-label" style={{ color: 'var(--spidey-yellow)', fontSize: 8 }}>
              {correct}/{quiz.questions.length} CORRECT
            </p>
            <div className="flex gap-2">
              <PixelButton className="flex-1" variant="ghost" onClick={onClose}>
                CLOSE
              </PixelButton>
              <PixelButton
                className="flex-1"
                onClick={() => {
                  reset()
                  playSound('click')
                }}
              >
                AGAIN
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </PixelModal>
  )
}
