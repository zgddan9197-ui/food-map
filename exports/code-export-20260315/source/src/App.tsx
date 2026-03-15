import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import CommunityPage from './pages/CommunityPage'
import DetailPage from './pages/DetailPage'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import MyPage from './pages/MyPage'

function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1>页面不存在</h1>
      <p>请从首页重新开始选择场景。</p>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<MapPage />} path="map" />
          <Route element={<MyPage />} path="me" />
          <Route element={<DetailPage />} path="detail/:id" />
          <Route element={<CommunityPage />} path="community" />
          <Route element={<Navigate replace to="/" />} path="home" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
