import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

const API_URL = import.meta.env.VITE_API_URL

export default function SetPassword() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const userId = searchParams.get('userId')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId) {
            toast({
                title: 'Error',
                description: 'Invalid activation link',
                variant: 'destructive',
            })
            return
        }

        if (password !== confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                variant: 'destructive',
            })
            return
        }

        if (password.length < 8) {
            toast({
                title: 'Error',
                description: 'Password must be at least 8 characters long',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch(`${API_URL}/agents/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    password,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to activate account')
            }

            toast({
                title: 'Success',
                description:
                    'Your account has been activated. You can now sign in.',
            })

            // Redirect to login page
            navigate('/login')
        } catch (error) {
            console.error('Error activating account:', error)
            toast({
                title: 'Error',
                description:
                    'Failed to activate your account. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container flex items-center justify-center min-h-screen py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Set Your Password</CardTitle>
                    <CardDescription>
                        Create a secure password for your ChatCentralize agent
                        account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                required
                                minLength={8}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? 'Setting up your account...'
                                : 'Set Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
