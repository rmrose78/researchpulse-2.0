import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getSavedArticles, removeSavedArticle, saveArticle } from '@/utils/api'
import type { ArticleSearchResult, SavedArticle } from '@/types'
import Toast from '@/components/ui/toast/toast'
import { ReadingListContext, type ReadingListStatus } from '@/hooks/use-reading-list'

interface ToastState {
  message: string
  onUndo?: () => void
}

// Placeholder shown immediately while the save request is in flight — swapped
// for the server's real id/saved_at once the response comes back.
function toSavedArticleShape(article: ArticleSearchResult): SavedArticle {
  return {
    id: -1,
    pmid: article.pmid,
    title: article.title,
    authors: article.authors.length > 0 ? article.authors.join(', ') : null,
    journal: article.journal,
    pub_date: article.pub_date,
    doi: article.doi,
    saved_at: new Date().toISOString(),
  }
}

interface ReadingListProviderProps {
  children: ReactNode
}

export default function ReadingListProvider({ children }: ReadingListProviderProps) {
  const [status, setStatus] = useState<ReadingListStatus>('loading')
  const [articles, setArticles] = useState<SavedArticle[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)

  const dismissToast = useCallback(() => setToast(null), [])

  // No synchronous setState here beyond what .then/.catch do — `status`
  // already defaults to 'loading', so the initial mount fetch doesn't need
  // to set it again before the request resolves.
  useEffect(() => {
    getSavedArticles()
      .then((result) => {
        setArticles(result)
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    getSavedArticles()
      .then((result) => {
        setArticles(result)
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  const isSaved = useCallback((pmid: string) => articles.some((a) => a.pmid === pmid), [articles])

  const addArticle = useCallback((article: ArticleSearchResult) => {
    setArticles((prev) => [toSavedArticleShape(article), ...prev])

    saveArticle(article)
      .then((saved) => {
        // null means the backend already had it saved (409) — optimistic
        // placeholder stays as-is, still treated as success.
        if (saved) {
          setArticles((prev) => prev.map((a) => (a.pmid === article.pmid ? saved : a)))
        }
        setToast({ message: 'Saved to reading list', onUndo: () => removeArticle(article) })
      })
      .catch(() => {
        setArticles((prev) => prev.filter((a) => a.pmid !== article.pmid))
        setToast({ message: "Couldn't save — please try again" })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeArticle = useCallback((article: ArticleSearchResult) => {
    setArticles((prev) => prev.filter((a) => a.pmid !== article.pmid))

    removeSavedArticle(article.pmid)
      .then(() => {
        setToast({ message: 'Removed from reading list', onUndo: () => addArticle(article) })
      })
      .catch(() => {
        setArticles((prev) => [toSavedArticleShape(article), ...prev])
        setToast({ message: "Couldn't remove — please try again" })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSave = useCallback(
    (article: ArticleSearchResult) => {
      if (isSaved(article.pmid)) {
        removeArticle(article)
      } else {
        addArticle(article)
      }
    },
    [isSaved, addArticle, removeArticle]
  )

  return (
    <ReadingListContext.Provider value={{ status, articles, isSaved, toggleSave, retry }}>
      {children}
      {toast && <Toast message={toast.message} onUndo={toast.onUndo} onDismiss={dismissToast} />}
    </ReadingListContext.Provider>
  )
}
