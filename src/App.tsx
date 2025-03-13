import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/auth.context'
import { Toaster } from '@/components/ui/toaster'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Agents from '@/pages/Agents'
import Labels from '@/pages/Labels'
import SetPassword from '@/pages/SetPassword'
//import Settings from '@/pages/Settings';
import Broadcasts from '@/pages/Broadcasts'
import { AdminRoute, ProtectedRoute } from './components/auth/ProtectedRoute'

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/set-password" element={<SetPassword />} />

                    {/* Protected Routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/labels"
                        element={
                            <ProtectedRoute>
                                <Labels />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/agents"
                        element={
                            <AdminRoute>
                                <Agents />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="/broadcasts"
                        element={
                            <AdminRoute>
                                <Broadcasts />
                            </AdminRoute>
                        }
                    />

                    {/* Catch-All Redirect */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
                <Toaster />
            </AuthProvider>
        </Router>
    )
}
