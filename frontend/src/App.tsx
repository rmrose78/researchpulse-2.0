import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/layout'
import ReadingListProvider from '@/components/providers/reading-list-provider'
import TrendingPage from '@/pages/trending-page'
import SearchPage from '@/pages/search-page'
import ReadingListPage from '@/pages/reading-list-page'
import HowItWorksPage from '@/pages/how-it-works-page'
import AnalyticsPage from '@/pages/analytics-page'

export default function App() {
  return (
    <BrowserRouter>
      <ReadingListProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<TrendingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/reading-list" element={<ReadingListPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ReadingListProvider>
    </BrowserRouter>
  )
}
